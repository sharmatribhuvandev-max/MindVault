import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

vi.mock("../src/db.js", () => ({
    UserModel: { findById: vi.fn() },
    TagModel: {},
    CollectionModel: {},
    ContentModel: { find: vi.fn() },
    LinkModel: {},
    ShareLinkModel: {
        create: vi.fn(),
        findOne: vi.fn(),
        find: vi.fn(),
        deleteOne: vi.fn(),
    },
}));

import app from "../src/app.js";
import { ContentModel, ShareLinkModel, UserModel } from "../src/db.js";

const TEST_SECRET = "mindvault-test-only-secret-not-for-production";
const USER_ID = "507f1f77bcf86cd799439011";
const A = "507f1f77bcf86cd7994390a1";
const B = "507f1f77bcf86cd7994390b2";
const C = "507f1f77bcf86cd7994390c3";
const LINK_ID = "507f1f77bcf86cd7994390ff";

const oid = (id: string) => new mongoose.Types.ObjectId(id);

function auth() {
    return `Bearer ${jwt.sign({ id: USER_ID, tv: 0 }, TEST_SECRET, { expiresIn: "1h" })}`;
}

// ContentModel.find(...).select(...) resolving to these docs.
function mockContentFind(docs: unknown[]) {
    vi.mocked(ContentModel.find).mockReturnValue({
        select: vi.fn().mockResolvedValue(docs),
    } as never);
}

function createLink(body: unknown) {
    return request(app).post("/api/v1/share-links").set("Authorization", auth()).send(body as object);
}

beforeEach(() => {
    vi.clearAllMocks();
    // Auth middleware checks the user's token version.
    vi.mocked(UserModel.findById).mockResolvedValue({ tokenVersion: 0, username: "owner" } as never);
    vi.mocked(ShareLinkModel.create).mockImplementation(
        (async (doc: Record<string, unknown>) => ({ ...doc, _id: oid(LINK_ID), createdAt: new Date() })) as never,
    );
});

describe("Creating share links", () => {
    it("creates a selection link for several owned items, keeping their order", async () => {
        mockContentFind([{ _id: oid(B) }, { _id: oid(A) }]);

        const response = await createLink({ contentIds: [B, A, B], title: "  React picks  " });

        expect(response.status).toBe(201);
        expect(response.body.shareLink).toMatchObject({
            kind: "selection",
            title: "React picks",
            itemCount: 2,
        });
        expect(response.body.shareLink.hash).toMatch(/^[A-Za-z0-9]{12}$/);

        const saved = vi.mocked(ShareLinkModel.create).mock.calls[0]![0] as unknown as {
            contentIds: mongoose.Types.ObjectId[];
            userId: mongoose.Types.ObjectId;
        };
        expect(saved.contentIds.map(String)).toEqual([B, A]);
        expect(saved.userId.toString()).toBe(USER_ID);
        expect(ContentModel.find).toHaveBeenCalledWith(
            expect.objectContaining({ userId: expect.anything() }),
        );
    });

    it("creates an item link for a single item", async () => {
        mockContentFind([{ _id: oid(A) }]);
        vi.mocked(ShareLinkModel.findOne).mockResolvedValue(null as never);

        const response = await createLink({ contentIds: [A] });

        expect(response.status).toBe(201);
        expect(response.body.shareLink.kind).toBe("item");
    });

    it("reuses the existing link when the same item is shared again", async () => {
        mockContentFind([{ _id: oid(A) }]);
        vi.mocked(ShareLinkModel.findOne).mockResolvedValue({
            _id: oid(LINK_ID),
            hash: "ExistingHash",
            kind: "item",
            title: "",
            contentIds: [oid(A)],
        } as never);

        const response = await createLink({ contentIds: [A] });

        expect(response.status).toBe(200);
        expect(response.body.shareLink.hash).toBe("ExistingHash");
        expect(ShareLinkModel.create).not.toHaveBeenCalled();
    });

    it("refuses to share items the user doesn't own", async () => {
        mockContentFind([{ _id: oid(A) }]);

        const response = await createLink({ contentIds: [A, C] });

        expect(response.status).toBe(404);
        expect(ShareLinkModel.create).not.toHaveBeenCalled();
    });

    it.each([
        [{ contentIds: [] }, "Choose between 1 and 100 items to share"],
        [{ contentIds: "nope" }, "Choose between 1 and 100 items to share"],
        [{ contentIds: Array(101).fill(A) }, "Choose between 1 and 100 items to share"],
        [{ contentIds: ["not-an-id"] }, "Invalid content ID"],
        [{ contentIds: [A], title: 42 }, "Title must be a string"],
        [{ contentIds: [A], title: "x".repeat(101) }, "Title cannot exceed 100 characters"],
    ])("rejects %j", async (body, message) => {
        const response = await createLink(body);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(message);
        expect(ShareLinkModel.create).not.toHaveBeenCalled();
    });

    it("requires authentication", async () => {
        const response = await request(app).post("/api/v1/share-links").send({ contentIds: [A] });

        expect(response.status).toBe(401);
    });
});

describe("Managing share links", () => {
    it("lists links newest first with live item counts and title previews", async () => {
        vi.mocked(ShareLinkModel.find).mockReturnValue({
            sort: vi.fn().mockResolvedValue([
                { _id: oid(LINK_ID), hash: "SelectionAbc", kind: "selection", title: "Mix", contentIds: [oid(A), oid(B), oid(C)] },
            ]),
        } as never);
        // C has since been deleted.
        mockContentFind([
            { _id: oid(A), title: "Alpha" },
            { _id: oid(B), title: "Beta" },
        ]);

        const response = await request(app).get("/api/v1/share-links").set("Authorization", auth());

        expect(response.status).toBe(200);
        expect(response.body.shareLinks).toEqual([
            expect.objectContaining({
                id: LINK_ID,
                hash: "SelectionAbc",
                title: "Mix",
                itemCount: 2,
                preview: ["Alpha", "Beta"],
            }),
        ]);
    });

    it("stops sharing a link the user owns", async () => {
        vi.mocked(ShareLinkModel.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);

        const response = await request(app)
            .delete(`/api/v1/share-links/${LINK_ID}`)
            .set("Authorization", auth());

        expect(response.status).toBe(200);
        expect(ShareLinkModel.deleteOne).toHaveBeenCalledWith({
            _id: LINK_ID,
            userId: expect.anything(),
        });
    });

    it("returns 404 when stopping someone else's or a missing link", async () => {
        vi.mocked(ShareLinkModel.deleteOne).mockResolvedValue({ deletedCount: 0 } as never);

        const response = await request(app)
            .delete(`/api/v1/share-links/${LINK_ID}`)
            .set("Authorization", auth());

        expect(response.status).toBe(404);
    });
});

describe("Public shared items page", () => {
    it("returns the items in picked order without private notes, skipping deleted ones", async () => {
        vi.mocked(ShareLinkModel.findOne).mockResolvedValue({
            userId: oid(USER_ID),
            title: "For Rahul",
            kind: "selection",
            contentIds: [oid(B), oid(C), oid(A)],
        } as never);
        const select = vi.fn().mockResolvedValue([
            { _id: oid(A), title: "Alpha" },
            { _id: oid(B), title: "Beta" },
        ]);
        vi.mocked(ContentModel.find).mockReturnValue({ select } as never);

        const response = await request(app).get("/api/v1/shared/AbCdEf123456");

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            username: "owner",
            title: "For Rahul",
            kind: "selection",
        });
        expect(response.body.content.map((item: { title: string }) => item.title)).toEqual([
            "Beta",
            "Alpha",
        ]);
        expect(select).toHaveBeenCalledWith("-notes");
        expect(ContentModel.find).toHaveBeenCalledWith({
            _id: { $in: [oid(B), oid(C), oid(A)] },
            userId: oid(USER_ID),
        });
    });

    it("returns 404 for an unknown link", async () => {
        vi.mocked(ShareLinkModel.findOne).mockResolvedValue(null as never);

        const response = await request(app).get("/api/v1/shared/AbCdEf123456");

        expect(response.status).toBe(404);
    });

    it("returns 404 without querying for malformed hashes", async () => {
        const response = await request(app).get("/api/v1/shared/short");

        expect(response.status).toBe(404);
        expect(ShareLinkModel.findOne).not.toHaveBeenCalled();
    });
});
