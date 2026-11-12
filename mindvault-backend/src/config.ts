
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
}

export const JWT_PASSWORD = JWT_SECRET;

export const PORT = Number(process.env.PORT ?? 3000);

const configuredMongoUri = process.env.MONGO_URI;

if (isProduction && !configuredMongoUri) {
    throw new Error("MONGO_URI must be defined in production");
}

export const MONGO_URI =
    configuredMongoUri ?? "mongodb://localhost:27017/mindvault";

export const JWT_EXPIRES_IN = "1h";

const configuredFrontendUrl = process.env.FRONTEND_URL;

if (isProduction && !configuredFrontendUrl) {
    throw new Error("FRONTEND_URL must be defined in production");
}

export const FRONTEND_URL =
    configuredFrontendUrl ?? "http://localhost:5173";

// Number of reverse-proxy hops in front of the app (Render uses one).
// Needed so req.ip, and therefore rate limiting, uses the real client IP.
// Defaults to 1 in production and 0 (no proxy) otherwise.
const configuredTrustProxy = process.env.TRUST_PROXY;

export const TRUST_PROXY =
    configuredTrustProxy !== undefined && configuredTrustProxy !== ""
        ? Number(configuredTrustProxy)
        : isProduction
            ? 1
            : 0;

if (!Number.isInteger(TRUST_PROXY) || TRUST_PROXY < 0) {
    throw new Error("TRUST_PROXY must be a non-negative integer");
}

// Public base URL of this API (no trailing slash). OAuth providers
// redirect back to <API_PUBLIC_URL>/api/v1/auth/<provider>/callback, so
// it must match the callback URL registered with Google and GitHub.
export const API_PUBLIC_URL = (
    process.env.API_PUBLIC_URL ?? `http://localhost:${PORT}`
).replace(/\/+$/, "");

export interface OAuthCredentials {
    clientId: string;
    clientSecret: string;
}

function readOAuthCredentials(prefix: string): OAuthCredentials | null {
    const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();

    return clientId && clientSecret ? { clientId, clientSecret } : null;
}

// A provider is enabled only when both its client ID and secret are set.
export const OAUTH_CREDENTIALS = {
    google: readOAuthCredentials("GOOGLE"),
    github: readOAuthCredentials("GITHUB"),
};

if (
    isProduction &&
    (OAUTH_CREDENTIALS.google || OAUTH_CREDENTIALS.github) &&
    !process.env.API_PUBLIC_URL
) {
    throw new Error(
        "API_PUBLIC_URL must be defined in production when OAuth is enabled"
    );
}

export const IS_PRODUCTION = isProduction;
