import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// OAuth settings are read when config.ts loads, so set them first.
const previousEnv = vi.hoisted(() => {
    const keys = [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GITHUB_CLIENT_ID",
        "GITHUB_CLIENT_SECRET",
        "API_PUBLIC_URL",
        "FRONTEND_URL",
    ];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.GITHUB_CLIENT_ID = "github-client";
    process.env.GITHUB_CLIENT_SECRET = "github-secret";
    process.env.API_PUBLIC_URL = "https://api.test/";
    process.env.FRONTEND_URL = "https://app.test";

    return previous;
});

vi.mock("../src/db.js", () => ({
    UserModel: {
        create: vi.fn(),
        findOne: vi.fn(),
        findById: vi.fn(),
    },
    TagModel: {},
    CollectionModel: {},
    ContentModel: {},
    LinkModel: {},
}));

import app from "../src/app.js";
import { UserModel } from "../src/db.js";
import { usernameBaseFrom } from "../src/controllers/oauth.controller.js";

const TEST_SECRET = "mindvault-test-only-secret-not-for-production";
const USER_ID = "507f1f77bcf86cd799439011";

afterAll(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

function jsonResponse(body: unknown, ok = true) {
    return { ok, status: ok ? 200 : 400, json: async () => body };
}

// Runs /start and returns the state plus the cookie the browser would hold.
async function startFlow(provider: "google" | "github") {
    const response = await request(app).get(`/api/v1/auth/${provider}/start`);
    const location = new URL(response.headers.location);
    const cookie = String(response.headers["set-cookie"]).split(";")[0];

    return { response, location, state: location.searchParams.get("state")!, cookie };
}

function callback(provider: string, query: Record<string, string>, cookie?: string) {
    const req = request(app)
        .get(`/api/v1/auth/${provider}/callback`)
        .query(query);

    return cookie ? req.set("Cookie", cookie) : req;
}

function tokenFromRedirect(location: string): string {
    const url = new URL(location);
    expect(url.origin + url.pathname).toBe("https://app.test/auth/callback");

    return decodeURIComponent(url.hash.replace(/^#token=/, ""));
}

describe("OAuth sign-in", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("lists the configured providers", async () => {
        const response = await request(app).get("/api/v1/auth/providers");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ google: true, github: true });
    });

    it("redirects to Google with a state that is also stored in a secure cookie", async () => {
        const { response, location, state, cookie } = await startFlow("google");

        expect(response.status).toBe(302);
        expect(location.origin + location.pathname).toBe(
            "https://accounts.google.com/o/oauth2/v2/auth",
        );
        expect(location.searchParams.get("client_id")).toBe("google-client");
        expect(location.searchParams.get("redirect_uri")).toBe(
            "https://api.test/api/v1/auth/google/callback",
        );
        expect(location.searchParams.get("scope")).toBe("openid email profile");
        expect(location.searchParams.get("response_type")).toBe("code");
        expect(state.length).toBeGreaterThanOrEqual(30);

        expect(cookie).toBe(`mv_oauth_state=google.${state}`);
        const fullCookie = String(response.headers["set-cookie"]);
        expect(fullCookie).toContain("HttpOnly");
        expect(fullCookie).toContain("SameSite=Lax");
        expect(fullCookie).toContain("Path=/api/v1/auth");
    });

    it("returns 404 for an unknown provider", async () => {
        const response = await request(app).get("/api/v1/auth/myspace/start");

        expect(response.status).toBe(404);
    });

    it("rejects a callback whose state doesn't match the cookie", async () => {
        const { cookie } = await startFlow("google");

        const response = await callback("google", { code: "abc", state: "forged" }, cookie);

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("https://app.test/signin?error=oauth_failed");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a callback without the state cookie", async () => {
        const { state } = await startFlow("google");

        const response = await callback("google", { code: "abc", state });

        expect(response.headers.location).toBe("https://app.test/signin?error=oauth_failed");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a state issued for a different provider", async () => {
        const { state, cookie } = await startFlow("google");

        const response = await callback("github", { code: "abc", state }, cookie);

        expect(response.headers.location).toBe("https://app.test/signin?error=oauth_failed");
    });

    it("sends the user back to sign-in when they cancel", async () => {
        const response = await callback("google", { error: "access_denied" });

        expect(response.headers.location).toBe("https://app.test/signin?error=oauth_cancelled");
    });

    it("creates a new user from a Google profile and signs them in", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ access_token: "google-access" }))
            .mockResolvedValueOnce(jsonResponse({ sub: "g-123", email: "Jane.Doe@gmail.com" }));
        vi.mocked(UserModel.findOne).mockResolvedValue(null as never);
        vi.mocked(UserModel.create).mockResolvedValue({ _id: USER_ID, tokenVersion: 0 } as never);

        const { state, cookie } = await startFlow("google");
        const response = await callback("google", { code: "auth-code", state }, cookie);

        expect(response.status).toBe(302);
        const decoded = jwt.verify(tokenFromRedirect(response.headers.location), TEST_SECRET) as {
            id: string;
            tv: number;
        };
        expect(decoded).toMatchObject({ id: USER_ID, tv: 0 });

        expect(UserModel.findOne).toHaveBeenCalledWith({ googleId: "g-123" });
        expect(UserModel.create).toHaveBeenCalledWith({ username: "janedoe", googleId: "g-123" });

        const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]!;
        expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");
        const body = new URLSearchParams(String(tokenInit.body));
        expect(body.get("code")).toBe("auth-code");
        expect(body.get("client_secret")).toBe("google-secret");
        expect(body.get("redirect_uri")).toBe("https://api.test/api/v1/auth/google/callback");

        expect(fetchMock.mock.calls[1]![1].headers.Authorization).toBe("Bearer google-access");

        // The state is single-use.
        expect(String(response.headers["set-cookie"])).toContain("Max-Age=0");
    });

    it("signs in an existing GitHub user without creating a new account", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ access_token: "gh-access" }))
            .mockResolvedValueOnce(jsonResponse({ id: 42, login: "octocat" }));
        vi.mocked(UserModel.findOne).mockResolvedValue({ _id: USER_ID, tokenVersion: 3 } as never);

        const { state, cookie } = await startFlow("github");
        const response = await callback("github", { code: "gh-code", state }, cookie);

        const decoded = jwt.verify(tokenFromRedirect(response.headers.location), TEST_SECRET) as {
            tv: number;
        };
        expect(decoded.tv).toBe(3);
        expect(UserModel.findOne).toHaveBeenCalledWith({ githubId: "42" });
        expect(UserModel.create).not.toHaveBeenCalled();
        expect(fetchMock.mock.calls[0]![0]).toBe("https://github.com/login/oauth/access_token");
        expect(fetchMock.mock.calls[1]![0]).toBe("https://api.github.com/user");
    });

    it("adds a number when the username is already taken", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ access_token: "gh-access" }))
            .mockResolvedValueOnce(jsonResponse({ id: 7, login: "octocat" }));
        vi.mocked(UserModel.findOne).mockResolvedValue(null as never);
        vi.mocked(UserModel.create)
            .mockRejectedValueOnce({ code: 11000, keyPattern: { username: 1 } })
            .mockResolvedValueOnce({ _id: USER_ID, tokenVersion: 0 } as never);

        const { state, cookie } = await startFlow("github");
        const response = await callback("github", { code: "c", state }, cookie);

        expect(response.headers.location).toMatch(/^https:\/\/app\.test\/auth\/callback#token=/);
        const secondTry = vi.mocked(UserModel.create).mock.calls[1]![0] as unknown as {
            username: string;
        };
        expect(secondTry.username).toMatch(/^octocat-\d{4}$/);
    });

    it("sends the user back to sign-in when the provider rejects the code", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ error: "bad_verification_code" }, false));
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const { state, cookie } = await startFlow("github");
        const response = await callback("github", { code: "expired", state }, cookie);

        expect(response.headers.location).toBe("https://app.test/signin?error=oauth_failed");
        expect(UserModel.create).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it("does not let password sign-in work for an account without a password", async () => {
        vi.mocked(UserModel.findOne).mockResolvedValue({ _id: USER_ID, password: "" } as never);

        const response = await request(app)
            .post("/api/v1/signin")
            .send({ username: "janedoe", password: "anything123" });

        expect(response.status).toBe(401);
    });
});

describe("usernameBaseFrom", () => {
    it.each([
        ["Jane.Doe+news", "janedoenews"],
        ["octocat", "octocat"],
        ["Zoë Ångström", "zoeangstrom"],
        ["李明", "user"],
        ["ab", "user"],
        ["", "user"],
        ["guest-hacker", "user-hacker"],
        ["a-very-long-username-that-keeps-going", "a-very-long-username"],
    ])("%j -> %j", (hint, expected) => {
        expect(usernameBaseFrom(hint)).toBe(expected);
    });
});
