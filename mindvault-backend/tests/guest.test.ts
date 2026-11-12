import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

vi.mock("../src/db.js", () => ({
    UserModel: {
        create: vi.fn(),
        find: vi.fn(),
        deleteMany: vi.fn(),
        deleteOne: vi.fn(),
        findOne: vi.fn(),
    },
    TagModel: { insertMany: vi.fn(), deleteMany: vi.fn() },
    CollectionModel: { insertMany: vi.fn(), deleteMany: vi.fn() },
    ContentModel: { insertMany: vi.fn(), deleteMany: vi.fn() },
    LinkModel: { deleteMany: vi.fn() },
}));

import app from "../src/app.js";
import {
    CollectionModel,
    ContentModel,
    LinkModel,
    TagModel,
    UserModel,
} from "../src/db.js";
import { deleteExpiredGuests } from "../src/controllers/guest.controller.js";
import { isContentType, requiresLink } from "../src/content-types.js";

const TEST_SECRET = "mindvault-test-only-secret-not-for-production";
const GUEST_ID = new mongoose.Types.ObjectId();

function mockExpiredGuests(ids: mongoose.Types.ObjectId[]) {
    vi.mocked(UserModel.find).mockReturnValue({
        limit: vi.fn().mockResolvedValue(ids.map((_id) => ({ _id }))),
    } as never);
}

function mockSuccessfulSeed() {
    vi.mocked(UserModel.create).mockImplementation(
        (async (doc: Record<string, unknown>) => ({ ...doc, _id: GUEST_ID })) as never,
    );
    vi.mocked(TagModel.insertMany).mockImplementation(
        (async (docs: { name: string }[]) =>
            docs.map((doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }))) as never,
    );
    vi.mocked(CollectionModel.insertMany).mockImplementation(
        (async (docs: { name: string }[]) =>
            docs.map((doc) => ({ ...doc, _id: new mongoose.Types.ObjectId() }))) as never,
    );
    vi.mocked(ContentModel.insertMany).mockResolvedValue([] as never);
}

function seededContent() {
    return vi.mocked(ContentModel.insertMany).mock.calls[0]?.[0] as unknown as Array<{
        title: string;
        type: string;
        link: string;
        body: string;
        tags: unknown[];
        userId: unknown;
        isPinned: boolean;
    }>;
}

describe("Guest sign-in", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockExpiredGuests([]);
        mockSuccessfulSeed();
    });

    it("creates a temporary guest account and returns a working token", async () => {
        const before = Date.now();
        const response = await request(app).post("/api/v1/guest");

        expect(response.status).toBe(200);
        expect(response.body.guest).toBe(true);
        expect(response.body.username).toMatch(/^guest-[0-9a-f]{8}$/);

        const decoded = jwt.verify(response.body.token, TEST_SECRET) as { id: string };
        expect(decoded.id).toBe(GUEST_ID.toString());

        const created = vi.mocked(UserModel.create).mock.calls[0]?.[0] as unknown as {
            isGuest: boolean;
            guestExpiresAt: Date;
            password: string;
        };
        expect(created.isGuest).toBe(true);
        expect(created.password).toMatch(/^\$2[aby]\$/);

        const lifetime = created.guestExpiresAt.getTime() - before;
        expect(lifetime).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
        expect(lifetime).toBeLessThan(24 * 60 * 60 * 1000 + 60_000);
        expect(response.body.expiresAt).toBe(created.guestExpiresAt.toISOString());
    });

    it("seeds valid sample content owned by the guest, welcome note first", async () => {
        await request(app).post("/api/v1/guest");

        const items = seededContent();
        expect(items.length).toBeGreaterThan(5);

        expect(items[0]?.type).toBe("note");
        expect(items[0]?.isPinned).toBe(true);
        expect(items[0]?.title).toMatch(/Welcome/);

        for (const item of items) {
            expect(item.userId).toBe(GUEST_ID);
            expect(isContentType(item.type)).toBe(true);
            expect(item.title.trim()).not.toBe("");

            if (requiresLink(item.type as never)) {
                expect(item.link).toMatch(/^https:\/\//);
            } else {
                expect(item.body.trim()).not.toBe("");
            }

            // Every tag name in the seed must exist as a created tag.
            expect(item.tags.every(Boolean)).toBe(true);
        }

        const types = new Set(items.map((item) => item.type));
        for (const type of ["youtube", "twitter", "article", "note", "github"]) {
            expect(types.has(type)).toBe(true);
        }
    });

    it("cleans up expired guests and everything they own", async () => {
        const expired = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
        mockExpiredGuests(expired);

        await request(app).post("/api/v1/guest");

        const owned = { userId: { $in: expired } };
        expect(ContentModel.deleteMany).toHaveBeenCalledWith(owned);
        expect(TagModel.deleteMany).toHaveBeenCalledWith(owned);
        expect(CollectionModel.deleteMany).toHaveBeenCalledWith(owned);
        expect(LinkModel.deleteMany).toHaveBeenCalledWith(owned);
        expect(UserModel.deleteMany).toHaveBeenCalledWith({
            _id: { $in: expired },
            isGuest: true,
        });
    });

    it("only looks for guest accounts that have expired", async () => {
        const now = new Date("2026-11-12T10:00:00Z");

        await deleteExpiredGuests(now);

        expect(UserModel.find).toHaveBeenCalledWith(
            { isGuest: true, guestExpiresAt: { $lte: now } },
            "_id",
        );
        expect(UserModel.deleteMany).not.toHaveBeenCalled();
    });

    it("still creates the guest when cleanup fails", async () => {
        vi.mocked(UserModel.find).mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error("db hiccup")),
        } as never);
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const response = await request(app).post("/api/v1/guest");

        expect(response.status).toBe(200);
        consoleError.mockRestore();
    });

    it("removes a half-created guest when seeding fails", async () => {
        vi.mocked(ContentModel.insertMany).mockRejectedValue(new Error("seed failed"));
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const response = await request(app).post("/api/v1/guest");

        expect(response.status).toBe(500);
        expect(UserModel.deleteOne).toHaveBeenCalledWith({ _id: GUEST_ID });
        expect(TagModel.deleteMany).toHaveBeenCalledWith({ userId: GUEST_ID });
        expect(CollectionModel.deleteMany).toHaveBeenCalledWith({ userId: GUEST_ID });
        consoleError.mockRestore();
    });

    it("rejects sign-ups that use the reserved guest- prefix", async () => {
        const response = await request(app)
            .post("/api/v1/signup")
            .send({ username: "Guest-1234", password: "password123" });

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/reserved/);
        expect(UserModel.create).not.toHaveBeenCalled();
    });
});
