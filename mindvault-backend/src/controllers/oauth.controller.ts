import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { UserModel } from "../db.js";
import {
    API_PUBLIC_URL,
    FRONTEND_URL,
    IS_PRODUCTION,
    JWT_EXPIRES_IN,
    JWT_PASSWORD,
    OAUTH_CREDENTIALS,
    type OAuthCredentials,
} from "../config.js";

// "Continue with Google / GitHub" using the OAuth 2.0 authorization code
// flow, done server-side so client secrets never reach the browser:
//
//   1. GET /auth/:provider/start     -> redirect to the provider with a
//                                       random `state`, also stored in an
//                                       HttpOnly cookie (CSRF protection)
//   2. provider -> GET /auth/:provider/callback?code&state
//   3. exchange code for an access token, fetch the profile, find or
//      create the user, then redirect to the frontend with our JWT in the
//      URL fragment (never sent to any server)

export type OAuthProviderName = "google" | "github";

interface OAuthProfile {
    id: string;
    usernameHint: string;
}

interface ProviderDefinition {
    idField: "googleId" | "githubId";
    authorizeUrl: string;
    scope: string;
    extraAuthorizeParams?: Record<string, string>;
    exchangeCode: (
        code: string,
        credentials: OAuthCredentials,
        redirectUri: string
    ) => Promise<string>;
    fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
}

async function readJson(response: globalThis.Response): Promise<Record<string, unknown>> {
    if (!response.ok) {
        throw new Error(`OAuth request failed with HTTP ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!data || typeof data !== "object") {
        throw new Error("OAuth provider returned an invalid response");
    }

    return data as Record<string, unknown>;
}

function requireString(data: Record<string, unknown>, key: string): string {
    const value = data[key];

    if (typeof value === "string" && value !== "") {
        return value;
    }

    if (typeof value === "number") {
        return String(value);
    }

    throw new Error(`OAuth response is missing "${key}"`);
}

const PROVIDERS: Record<OAuthProviderName, ProviderDefinition> = {
    google: {
        idField: "googleId",
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        scope: "openid email profile",
        extraAuthorizeParams: { prompt: "select_account" },
        async exchangeCode(code, { clientId, clientSecret }, redirectUri) {
            const data = await readJson(
                await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        code,
                        client_id: clientId,
                        client_secret: clientSecret,
                        redirect_uri: redirectUri,
                        grant_type: "authorization_code",
                    }),
                })
            );

            return requireString(data, "access_token");
        },
        async fetchProfile(accessToken) {
            const data = await readJson(
                await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
            );

            const email = typeof data.email === "string" ? data.email : "";
            const name = typeof data.name === "string" ? data.name : "";

            return {
                id: requireString(data, "sub"),
                usernameHint: email.split("@")[0] || name,
            };
        },
    },
    github: {
        idField: "githubId",
        authorizeUrl: "https://github.com/login/oauth/authorize",
        scope: "read:user",
        async exchangeCode(code, { clientId, clientSecret }, redirectUri) {
            const data = await readJson(
                await fetch("https://github.com/login/oauth/access_token", {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        redirect_uri: redirectUri,
                    }),
                })
            );

            return requireString(data, "access_token");
        },
        async fetchProfile(accessToken) {
            const data = await readJson(
                await fetch("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/vnd.github+json",
                        "User-Agent": "MindVault",
                    },
                })
            );

            return {
                id: requireString(data, "id"),
                usernameHint: typeof data.login === "string" ? data.login : "",
            };
        },
    },
};

function isProviderName(value: unknown): value is OAuthProviderName {
    return value === "google" || value === "github";
}

function redirectUriFor(provider: OAuthProviderName): string {
    return `${API_PUBLIC_URL}/api/v1/auth/${provider}/callback`;
}

// ------------------------------------------------------------ state cookie

const STATE_COOKIE = "mv_oauth_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

function stateCookie(value: string, maxAgeSeconds: number): string {
    return [
        `${STATE_COOKIE}=${value}`,
        "Path=/api/v1/auth",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${maxAgeSeconds}`,
        ...(IS_PRODUCTION ? ["Secure"] : []),
    ].join("; ");
}

function readCookie(req: Request, name: string): string | null {
    for (const part of (req.headers.cookie ?? "").split(";")) {
        const [key, ...rest] = part.trim().split("=");

        if (key === name) {
            return rest.join("=");
        }
    }

    return null;
}

function safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    return left.length === right.length && timingSafeEqual(left, right);
}

// ---------------------------------------------------------------- users

const USERNAME_MAX_BASE = 20;

// Turns "Jane.Doe+news" into "janedoenews" and "Zoë" into "zoe";
// falls back to "user".
export function usernameBaseFrom(hint: string): string {
    let base = hint
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, USERNAME_MAX_BASE);

    if (base.startsWith("guest-")) {
        base = `user-${base.slice("guest-".length)}`;
    }

    return base.length >= 3 ? base : "user";
}

function isDuplicateKeyError(error: unknown, field: string): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000 &&
        "keyPattern" in error &&
        typeof error.keyPattern === "object" &&
        error.keyPattern !== null &&
        field in error.keyPattern
    );
}

async function findOrCreateUser(
    provider: ProviderDefinition,
    profile: OAuthProfile
) {
    const existing = await UserModel.findOne({ [provider.idField]: profile.id });

    if (existing) {
        return existing;
    }

    const base = usernameBaseFrom(profile.usernameHint);

    // Try the clean name first, then add a short number if it's taken.
    for (let attempt = 0; attempt < 6; attempt++) {
        const username =
            attempt === 0 ? base : `${base}-${randomInt(1000, 10000)}`;

        try {
            return await UserModel.create({
                username,
                [provider.idField]: profile.id,
            });
        } catch (error) {
            if (isDuplicateKeyError(error, "username")) {
                continue;
            }

            // Two callbacks for the same new account raced; use the winner.
            if (isDuplicateKeyError(error, provider.idField)) {
                const winner = await UserModel.findOne({
                    [provider.idField]: profile.id,
                });

                if (winner) {
                    return winner;
                }
            }

            throw error;
        }
    }

    throw new Error("Could not find a free username");
}

// ------------------------------------------------------------- handlers

function frontendRedirect(res: Response, path: string) {
    return res.redirect(302, `${FRONTEND_URL}${path}`);
}

export function listProviders(_req: Request, res: Response) {
    return res.json({
        google: OAUTH_CREDENTIALS.google !== null,
        github: OAUTH_CREDENTIALS.github !== null,
    });
}

export function startOAuth(req: Request, res: Response) {
    const providerName = req.params.provider;

    if (!isProviderName(providerName) || !OAUTH_CREDENTIALS[providerName]) {
        return res.status(404).json({ message: "Sign-in provider not available" });
    }

    const provider = PROVIDERS[providerName];
    const state = randomBytes(24).toString("base64url");

    const url = new URL(provider.authorizeUrl);
    url.search = new URLSearchParams({
        client_id: OAUTH_CREDENTIALS[providerName].clientId,
        redirect_uri: redirectUriFor(providerName),
        response_type: "code",
        scope: provider.scope,
        state,
        ...provider.extraAuthorizeParams,
    }).toString();

    res.setHeader(
        "Set-Cookie",
        stateCookie(`${providerName}.${state}`, STATE_MAX_AGE_SECONDS)
    );

    return res.redirect(302, url.toString());
}

export async function oauthCallback(req: Request, res: Response) {
    const providerName = req.params.provider;

    if (!isProviderName(providerName) || !OAUTH_CREDENTIALS[providerName]) {
        return res.status(404).json({ message: "Sign-in provider not available" });
    }

    // The state is single-use: clear the cookie whatever happens next.
    const expectedState = readCookie(req, STATE_COOKIE);
    res.setHeader("Set-Cookie", stateCookie("", 0));

    const { code, state, error } = req.query;

    if (error === "access_denied") {
        return frontendRedirect(res, "/signin?error=oauth_cancelled");
    }

    if (
        typeof code !== "string" ||
        typeof state !== "string" ||
        !expectedState ||
        !safeEqual(expectedState, `${providerName}.${state}`)
    ) {
        return frontendRedirect(res, "/signin?error=oauth_failed");
    }

    const provider = PROVIDERS[providerName];

    try {
        const accessToken = await provider.exchangeCode(
            code,
            OAUTH_CREDENTIALS[providerName],
            redirectUriFor(providerName)
        );
        const profile = await provider.fetchProfile(accessToken);
        const user = await findOrCreateUser(provider, profile);

        const token = jwt.sign(
            { id: user._id.toString(), tv: user.tokenVersion ?? 0 },
            JWT_PASSWORD,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return frontendRedirect(
            res,
            `/auth/callback#token=${encodeURIComponent(token)}`
        );
    } catch (caught) {
        console.error(`${providerName} sign-in failed:`, caught);

        return frontendRedirect(res, "/signin?error=oauth_failed");
    }
}
