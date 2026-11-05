import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";

// Simulate running behind one reverse proxy (as on Render) so each
// X-Forwarded-For value is treated as a distinct client IP.
const previousTrustProxy = vi.hoisted(() => {
    const previous = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = "1";
    return previous;
});

vi.mock("../src/db.js", () => ({
    UserModel: {
        create: vi.fn(),
        findOne: vi.fn(),
    },
    TagModel: {},
    CollectionModel: {},
    ContentModel: {},
    LinkModel: {},
}));

import app from "../src/app.js";
import { UserModel } from "../src/db.js";

afterAll(() => {
    if (previousTrustProxy === undefined) {
        delete process.env.TRUST_PROXY;
    } else {
        process.env.TRUST_PROXY = previousTrustProxy;
    }
});

function signin(ip: string, password = "wrongpassword") {
    return request(app)
        .post("/api/v1/signin")
        .set("X-Forwarded-For", ip)
        .send({ username: "testuser", password });
}

function signup(ip: string, username: string) {
    return request(app)
        .post("/api/v1/signup")
        .set("X-Forwarded-For", ip)
        .send({ username, password: "password123" });
}

describe("Auth rate limiting", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("blocks an IP after 10 failed sign-ins without touching the database", async () => {
        vi.mocked(UserModel.findOne).mockResolvedValue(null as never);

        for (let i = 0; i < 10; i++) {
            const response = await signin("203.0.113.1");
            expect(response.status).toBe(401);
        }

        const blocked = await signin("203.0.113.1");

        expect(blocked.status).toBe(429);
        expect(blocked.body.message).toMatch(/too many failed sign-in attempts/i);
        expect(blocked.headers["retry-after"]).toBeDefined();
        expect(UserModel.findOne).toHaveBeenCalledTimes(10);
    });

    it("limits each client IP independently", async () => {
        vi.mocked(UserModel.findOne).mockResolvedValue(null as never);

        for (let i = 0; i < 10; i++) {
            await signin("203.0.113.2");
        }

        expect((await signin("203.0.113.2")).status).toBe(429);
        expect((await signin("203.0.113.3")).status).toBe(401);
    });

    it("does not count successful sign-ins toward the limit", async () => {
        const passwordHash = await bcrypt.hash("password123", 4);

        vi.mocked(UserModel.findOne).mockResolvedValue({
            _id: { toString: () => "507f1f77bcf86cd799439011" },
            password: passwordHash,
        } as never);

        for (let i = 0; i < 12; i++) {
            const response = await signin("203.0.113.4", "password123");
            expect(response.status).toBe(200);
        }
    });

    it("blocks an IP after 10 sign-up requests per hour", async () => {
        vi.mocked(UserModel.create).mockResolvedValue({} as never);

        for (let i = 0; i < 10; i++) {
            const response = await signup("203.0.113.5", `user${i}`);
            expect(response.status).toBe(200);
        }

        const blocked = await signup("203.0.113.5", "user10");

        expect(blocked.status).toBe(429);
        expect(blocked.body.message).toMatch(/too many accounts/i);
        expect(UserModel.create).toHaveBeenCalledTimes(10);
    });
});
