
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../src/db.js", () => ({
    UserModel: {
        findOne: vi.fn(),
        findById: vi.fn().mockResolvedValue({ tokenVersion: 0 }),
    },
    TagModel: {},
    CollectionModel: {},
    ContentModel: {
        find: vi.fn(),
        findOne: vi.fn(),
        findById: vi.fn(),
    },
    LinkModel: {
        findOne: vi.fn(),
        create: vi.fn(),
        deleteOne: vi.fn(),
    },
}));

import app from "../src/app.js";
import {
    ContentModel,
    LinkModel,
    UserModel,
} from "../src/db.js";

const USER_ID = "507f1f77bcf86cd799439011";
const CONTENT_ID = "507f1f77bcf86cd799439012";
const TEST_SECRET =
    "mindvault-test-only-secret-not-for-production";

function authToken() {
    return jwt.sign(
        { id: USER_ID },
        TEST_SECRET,
        { expiresIn: "1h" },
    );
}

function authenticatedRequest(
    method: "get" | "post" | "put" | "patch",
    path: string,
) {
    return request(app)[method](path)
        .set("Authorization", `Bearer ${authToken()}`);
}

function mockUpdatedContent(content: Record<string, unknown>) {
    const populate = vi.fn().mockReturnThis();

    vi.mocked(ContentModel.findById).mockReturnValue({
        populate,
    } as never);

    return populate;
}

describe("Favorites, pins and personal notes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("adds content to favorites", async () => {
        const content = {
            _id: CONTENT_ID,
            isFavorite: false,
            save: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(ContentModel.findOne).mockResolvedValue(
            content as never,
        );

        const populate = mockUpdatedContent({
            ...content,
            isFavorite: true,
        });

        const response = await authenticatedRequest(
            "patch",
            `/api/v1/content/${CONTENT_ID}/favorite`,
        ).send({ isFavorite: true });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(
            "Content added to favorites",
        );
        expect(content.isFavorite).toBe(true);
        expect(content.save).toHaveBeenCalledOnce();
        expect(populate).toHaveBeenCalledTimes(3);
    });

    it("removes content from favorites", async () => {
        const content = {
            _id: CONTENT_ID,
            isFavorite: true,
            save: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(ContentModel.findOne).mockResolvedValue(
            content as never,
        );
        mockUpdatedContent(content);

        const response = await authenticatedRequest(
            "patch",
            `/api/v1/content/${CONTENT_ID}/favorite`,
        ).send({ isFavorite: false });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(
            "Content removed from favorites",
        );
        expect(content.isFavorite).toBe(false);
        expect(content.save).toHaveBeenCalledOnce();
    });

    it("rejects a non-boolean favorite value", async () => {
        const response = await authenticatedRequest(
            "patch",
            `/api/v1/content/${CONTENT_ID}/favorite`,
        ).send({ isFavorite: "true" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "isFavorite must be a boolean",
        );
        expect(ContentModel.findOne).not.toHaveBeenCalled();
    });

    it("pins content", async () => {
        const content = {
            _id: CONTENT_ID,
            isPinned: false,
            save: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(ContentModel.findOne).mockResolvedValue(
            content as never,
        );
        mockUpdatedContent(content);

        const response = await authenticatedRequest(
            "patch",
            `/api/v1/content/${CONTENT_ID}/pin`,
        ).send({ isPinned: true });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Content pinned");
        expect(content.isPinned).toBe(true);
        expect(content.save).toHaveBeenCalledOnce();
    });

    it("unpins content", async () => {
        const content = {
            _id: CONTENT_ID,
            isPinned: true,
            save: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(ContentModel.findOne).mockResolvedValue(
            content as never,
        );
        mockUpdatedContent(content);

        const response = await authenticatedRequest(
            "patch",
            `/api/v1/content/${CONTENT_ID}/pin`,
        ).send({ isPinned: false });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Content unpinned");
        expect(content.isPinned).toBe(false);
    });

    it("rejects a non-boolean pin value", async () => {
        const response = await authenticatedRequest(
            "patch",
            `/api/v1/content/${CONTENT_ID}/pin`,
        ).send({ isPinned: "true" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "isPinned must be a boolean",
        );
        expect(ContentModel.findOne).not.toHaveBeenCalled();
    });

    it("updates personal notes", async () => {
        const content = {
            _id: CONTENT_ID,
            title: "Original title",
            link: "https://example.com/video",
            type: "youtube",
            notes: "Old notes",
            save: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(ContentModel.findOne).mockResolvedValue(
            content as never,
        );
        mockUpdatedContent(content);

        const response = await authenticatedRequest(
            "put",
            `/api/v1/content/${CONTENT_ID}`,
        ).send({
            title: "Updated title",
            link: "https://example.com/video",
            type: "youtube",
            notes: "  New notes  ",
        });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Content updated");
        expect(content.notes).toBe("New notes");
        expect(content.title).toBe("Updated title");
        expect(content.save).toHaveBeenCalledOnce();
    });

    it("allows personal notes to be cleared", async () => {
        const content = {
            _id: CONTENT_ID,
            title: "Test video",
            link: "https://example.com/video",
            type: "youtube",
            notes: "Existing notes",
            save: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(ContentModel.findOne).mockResolvedValue(
            content as never,
        );
        mockUpdatedContent(content);

        const response = await authenticatedRequest(
            "put",
            `/api/v1/content/${CONTENT_ID}`,
        ).send({
            title: "Test video",
            link: "https://example.com/video",
            type: "youtube",
            notes: "",
        });

        expect(response.status).toBe(200);
        expect(content.notes).toBe("");
        expect(content.save).toHaveBeenCalledOnce();
    });

    it("rejects notes longer than 2000 characters", async () => {
        const response = await authenticatedRequest(
            "put",
            `/api/v1/content/${CONTENT_ID}`,
        ).send({
            title: "Test video",
            link: "https://example.com/video",
            type: "youtube",
            notes: "a".repeat(2001),
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Notes cannot exceed 2000 characters",
        );
        expect(ContentModel.findOne).not.toHaveBeenCalled();
    });
});

describe("Brain sharing API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("enables sharing and returns a share hash", async () => {
        vi.mocked(LinkModel.findOne).mockResolvedValue(
            null as never,
        );
        vi.mocked(LinkModel.create).mockResolvedValue({
            hash: "testshare123",
        } as never);

        const response = await authenticatedRequest(
            "post",
            "/api/v1/brain/share",
        ).send({ share: true });

        expect(response.status).toBe(200);
        expect(response.body.hash).toBe("testshare123");
        expect(LinkModel.create).toHaveBeenCalledOnce();
    });

    it("reuses an existing share link", async () => {
        vi.mocked(LinkModel.findOne).mockResolvedValue({
            hash: "existinghash",
        } as never);

        const response = await authenticatedRequest(
            "post",
            "/api/v1/brain/share",
        ).send({ share: true });

        expect(response.status).toBe(200);
        expect(response.body.hash).toBe("existinghash");
        expect(LinkModel.create).not.toHaveBeenCalled();
    });

    it("returns the concurrently created link on a duplicate-key race", async () => {
        vi.mocked(LinkModel.findOne)
            .mockResolvedValueOnce(null as never)
            .mockResolvedValueOnce({ hash: "racedhash1" } as never);
        vi.mocked(LinkModel.create).mockRejectedValue(
            Object.assign(new Error("dup"), { code: 11000 }),
        );

        const response = await authenticatedRequest(
            "post",
            "/api/v1/brain/share",
        ).send({ share: true });

        expect(response.status).toBe(200);
        expect(response.body.hash).toBe("racedhash1");
        expect(LinkModel.create).toHaveBeenCalledOnce();
    });

    it("generates a 10-character alphanumeric hash", async () => {
        vi.mocked(LinkModel.findOne).mockResolvedValue(
            null as never,
        );
        vi.mocked(LinkModel.create).mockImplementation(
            (async (doc: { hash: string }) => doc) as never,
        );

        const response = await authenticatedRequest(
            "post",
            "/api/v1/brain/share",
        ).send({ share: true });

        expect(response.status).toBe(200);
        expect(response.body.hash).toMatch(/^[A-Za-z0-9]{10}$/);
    });

    it("disables sharing", async () => {
        vi.mocked(LinkModel.deleteOne).mockResolvedValue(
            { deletedCount: 1 } as never,
        );

        const response = await authenticatedRequest(
            "post",
            "/api/v1/brain/share",
        ).send({ share: false });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Removed Link");
        expect(LinkModel.deleteOne).toHaveBeenCalledOnce();
    });

    it("rejects a non-boolean share value", async () => {
        const response = await authenticatedRequest(
            "post",
            "/api/v1/brain/share",
        ).send({ share: "true" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Share must be a boolean",
        );
        expect(LinkModel.create).not.toHaveBeenCalled();
        expect(LinkModel.deleteOne).not.toHaveBeenCalled();
    });

    it("rejects an invalid public share link", async () => {
        vi.mocked(LinkModel.findOne).mockResolvedValue(
            null as never,
        );

        const response = await request(app).get(
            "/api/v1/invalid-share-hash",
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toBe(
            "Sorry incorrect input",
        );
        expect(ContentModel.find).not.toHaveBeenCalled();
    });

    it("returns public content without exposing personal notes", async () => {
        vi.mocked(LinkModel.findOne).mockResolvedValue({
            userId: USER_ID,
            hash: "validsharehash",
        } as never);

        const publicContent = [
            {
                _id: CONTENT_ID,
                title: "Public video",
            },
        ];

        const select = vi.fn().mockResolvedValue(publicContent);

        vi.mocked(ContentModel.find).mockReturnValue({
            select,
        } as never);

        vi.mocked(UserModel.findOne).mockResolvedValue({
            username: "publicuser",
        } as never);

        const response = await request(app).get(
            "/api/v1/validsharehash",
        );

        expect(response.status).toBe(200);
        expect(response.body.username).toBe("publicuser");
        expect(response.body.content).toEqual(publicContent);
        expect(select).toHaveBeenCalledWith("-notes");
    });

    it("returns 404 when the share link is disabled", async () => {
        vi.mocked(LinkModel.findOne).mockResolvedValue(
            null as never,
        );

        const response = await request(app).get(
            "/api/v1/previously-disabled-hash",
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toBe(
            "Sorry incorrect input",
        );
        expect(ContentModel.find).not.toHaveBeenCalled();
    });
});
