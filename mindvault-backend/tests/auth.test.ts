
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

vi.mock("../src/db.js", () => ({
    UserModel: {
        create: vi.fn(),
        findOne: vi.fn(),
        findById: vi.fn(),
        updateOne: vi.fn(),
    },
    TagModel: {},
    CollectionModel: {},
    ContentModel: {},
    LinkModel: {},
}));

import app from "../src/app.js";
import { UserModel } from "../src/db.js";

const USER_ID = "507f1f77bcf86cd799439011";
const TEST_SECRET = "mindvault-test-only-secret-not-for-production";

function tokenWithVersion(tv?: number) {
    const payload = tv === undefined ? { id: USER_ID } : { id: USER_ID, tv };
    return jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
}

describe("Mind Vault authentication API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("signs up a user with valid credentials", async () => {
        vi.mocked(UserModel.create).mockResolvedValue({} as never);

        const response = await request(app)
            .post("/api/v1/signup")
            .send({
                username: "testuser",
                password: "password123",
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: "User signed up",
        });
        expect(UserModel.create).toHaveBeenCalledTimes(1);

        const savedUser = vi.mocked(UserModel.create).mock.calls[0]?.[0] as
            | { username: string; password: string }
            | undefined;

        expect(savedUser?.username).toBe("testuser");
        expect(savedUser?.password).not.toBe("password123");
    });

    it("rejects a signup with an invalid username", async () => {
        const response = await request(app)
            .post("/api/v1/signup")
            .send({
                username: "ab",
                password: "password123",
            });

        expect(response.status).toBe(400);
        expect(UserModel.create).not.toHaveBeenCalled();
    });

    it("rejects a signup with a short password", async () => {
        const response = await request(app)
            .post("/api/v1/signup")
            .send({
                username: "testuser",
                password: "short",
            });

        expect(response.status).toBe(400);
        expect(UserModel.create).not.toHaveBeenCalled();
    });

    it("returns 409 when the username already exists", async () => {
        vi.mocked(UserModel.create).mockRejectedValue({
            code: 11000,
        });

        const response = await request(app)
            .post("/api/v1/signup")
            .send({
                username: "testuser",
                password: "password123",
            });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
            message: "User already exists",
        });
    });

    it("signs in a user with valid credentials", async () => {
        const hashedPassword = await bcrypt.hash("password123", 4);

        vi.mocked(UserModel.findOne).mockResolvedValue({
            _id: "507f1f77bcf86cd799439011",
            password: hashedPassword,
            tokenVersion: 3,
        } as never);

        const response = await request(app)
            .post("/api/v1/signin")
            .send({
                username: "testuser",
                password: "password123",
            });

        expect(response.status).toBe(200);
        expect(typeof response.body.token).toBe("string");
        expect(response.body.token.length).toBeGreaterThan(0);

        const decoded = jwt.verify(response.body.token, TEST_SECRET) as { tv: number };
        expect(decoded.tv).toBe(3);
    });

    it("rejects incorrect signin credentials", async () => {
        vi.mocked(UserModel.findOne).mockResolvedValue(null as never);

        const response = await request(app)
            .post("/api/v1/signin")
            .send({
                username: "testuser",
                password: "password123",
            });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Incorrect credentials",
        });
    });

    it("rejects access to protected content without a token", async () => {
        const response = await request(app)
            .get("/api/v1/content");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Authentication required",
        });
    });

    it("logs out by bumping the user's token version", async () => {
        vi.mocked(UserModel.findById).mockResolvedValue({ tokenVersion: 0 } as never);
        vi.mocked(UserModel.updateOne).mockResolvedValue({} as never);

        const response = await request(app)
            .post("/api/v1/logout")
            .set("Authorization", `Bearer ${tokenWithVersion(0)}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: "Logged out" });
        expect(UserModel.updateOne).toHaveBeenCalledWith(
            { _id: USER_ID },
            { $inc: { tokenVersion: 1 } },
        );
    });

    it("rejects logout without a token", async () => {
        const response = await request(app).post("/api/v1/logout");

        expect(response.status).toBe(401);
        expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it("rejects a token issued before the last logout", async () => {
        vi.mocked(UserModel.findById).mockResolvedValue({ tokenVersion: 1 } as never);

        const response = await request(app)
            .get("/api/v1/content")
            .set("Authorization", `Bearer ${tokenWithVersion(0)}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Invalid or expired token" });
    });

    it("rejects a token for a user that no longer exists", async () => {
        vi.mocked(UserModel.findById).mockResolvedValue(null as never);

        const response = await request(app)
            .post("/api/v1/logout")
            .set("Authorization", `Bearer ${tokenWithVersion(0)}`);

        expect(response.status).toBe(401);
    });

    it("accepts legacy tokens without a version while the user is still at version 0", async () => {
        vi.mocked(UserModel.findById).mockResolvedValue({ tokenVersion: 0 } as never);
        vi.mocked(UserModel.updateOne).mockResolvedValue({} as never);

        const response = await request(app)
            .post("/api/v1/logout")
            .set("Authorization", `Bearer ${tokenWithVersion()}`);

        expect(response.status).toBe(200);
    });

    it("returns 500, not 401, when the user lookup fails", async () => {
        vi.mocked(UserModel.findById).mockRejectedValue(new Error("db down"));
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const response = await request(app)
            .post("/api/v1/logout")
            .set("Authorization", `Bearer ${tokenWithVersion(0)}`);

        expect(response.status).toBe(500);
        consoleError.mockRestore();
    });
});
