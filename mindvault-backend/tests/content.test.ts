
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
        findById: vi.fn().mockResolvedValue({ tokenVersion: 0 }),
    },
    TagModel: {
        find: vi.fn(),
    },
    CollectionModel: {
        findOne: vi.fn(),
    },
    ContentModel: {
        create: vi.fn(),
        find: vi.fn(),
        findOne: vi.fn(),
        findById: vi.fn(),
        deleteOne: vi.fn(),
    },
    LinkModel: {},
}));

import app from "../src/app.js";
import { ContentModel } from "../src/db.js";

const USER_ID = "507f1f77bcf86cd799439011";
const TEST_SECRET = "mindvault-test-only-secret-not-for-production";

function getAuthToken() {
    return jwt.sign(
        { id: USER_ID },
        TEST_SECRET,
        { expiresIn: "1h" },
    );
}

function authenticatedRequest() {
    return request(app)
        .post("/api/v1/content")
        .set("Authorization", `Bearer ${getAuthToken()}`);
}

describe("Mind Vault content API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates content with valid input", async () => {
        vi.mocked(ContentModel.create).mockResolvedValue(
            {} as never,
        );

        const response = await authenticatedRequest()
            .send({
                title: "Test video",
                link: "https://www.youtube.com/watch?v=test123",
                type: "youtube",
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: "Content added",
        });

        expect(ContentModel.create).toHaveBeenCalledTimes(1);

        const savedContent = vi.mocked(
            ContentModel.create,
        ).mock.calls[0]?.[0] as
            | {
                title: string;
                type: string;
                userId: { toString(): string };
                notes: string;
            }
            | undefined;

        expect(savedContent?.title).toBe("Test video");
        expect(savedContent?.type).toBe("youtube");
        expect(savedContent?.userId.toString()).toBe(USER_ID);
        expect(savedContent?.notes).toBe("");
    });

    it("rejects content with an empty title", async () => {
        const response = await authenticatedRequest()
            .send({
                title: "   ",
                link: "https://example.com/video",
                type: "youtube",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Title is required");
        expect(ContentModel.create).not.toHaveBeenCalled();
    });

    it("rejects an unsupported content type", async () => {
        const response = await authenticatedRequest()
            .send({
                title: "Test content",
                link: "https://example.com/video",
                type: "facebook",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Content type must be one of: youtube, twitter, article, note",
        );
        expect(ContentModel.create).not.toHaveBeenCalled();
    });

    it("rejects an invalid content ID during update", async () => {
        const response = await request(app)
            .put("/api/v1/content/not-a-valid-id")
            .set("Authorization", `Bearer ${getAuthToken()}`)
            .send({
                title: "Updated title",
                link: "https://example.com/video",
                type: "youtube",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid content ID");
        expect(ContentModel.findOne).not.toHaveBeenCalled();
    });

    it("rejects an update when the content is not owned by the user", async () => {
        vi.mocked(ContentModel.findOne).mockResolvedValue(
            null as never,
        );

        const response = await request(app)
            .put("/api/v1/content/507f1f77bcf86cd799439012")
            .set("Authorization", `Bearer ${getAuthToken()}`)
            .send({
                title: "Updated title",
                link: "https://example.com/video",
                type: "youtube",
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Content not found");

        expect(ContentModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: expect.anything(),
            }),
        );
    });

    it("rejects deletion with an invalid content ID", async () => {
        const response = await request(app)
            .delete("/api/v1/content")
            .set("Authorization", `Bearer ${getAuthToken()}`)
            .send({
                contentId: "invalid-id",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid content ID");
        expect(ContentModel.deleteOne).not.toHaveBeenCalled();
    });

    it("rejects deletion when the content is not owned by the user", async () => {
        vi.mocked(ContentModel.deleteOne).mockResolvedValue(
            { deletedCount: 0 } as never,
        );

        const response = await request(app)
            .delete("/api/v1/content")
            .set("Authorization", `Bearer ${getAuthToken()}`)
            .send({
                contentId: "507f1f77bcf86cd799439012",
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Content not found");

        expect(ContentModel.deleteOne).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: expect.anything(),
            }),
        );
    });

    it("rejects favorite updates when the value is not a boolean", async () => {
        const response = await request(app)
            .patch("/api/v1/content/507f1f77bcf86cd799439012/favorite")
            .set("Authorization", `Bearer ${getAuthToken()}`)
            .send({
                isFavorite: "true",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "isFavorite must be a boolean",
        );
        expect(ContentModel.findOne).not.toHaveBeenCalled();
    });

    function savedContent() {
        return vi.mocked(ContentModel.create).mock.calls[0]?.[0] as
            | { type: string; link: string; body: string }
            | undefined;
    }

    it("creates an article with a link", async () => {
        vi.mocked(ContentModel.create).mockResolvedValue({} as never);

        const response = await authenticatedRequest().send({
            title: "Great post",
            link: "https://blog.example.com/post",
            type: "article",
        });

        expect(response.status).toBe(200);
        expect(savedContent()?.type).toBe("article");
        expect(savedContent()?.link).toBe("https://blog.example.com/post");
    });

    it("rejects an article without a link", async () => {
        const response = await authenticatedRequest().send({
            title: "Great post",
            type: "article",
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "A valid HTTP or HTTPS link is required",
        );
        expect(ContentModel.create).not.toHaveBeenCalled();
    });

    it("creates a note without a link", async () => {
        vi.mocked(ContentModel.create).mockResolvedValue({} as never);

        const response = await authenticatedRequest().send({
            title: "Idea",
            type: "note",
            body: "  Build a reading list feature  ",
        });

        expect(response.status).toBe(200);
        expect(savedContent()).toMatchObject({
            type: "note",
            link: "",
            body: "Build a reading list feature",
        });
    });

    it("keeps an optional link on a note", async () => {
        vi.mocked(ContentModel.create).mockResolvedValue({} as never);

        const response = await authenticatedRequest().send({
            title: "Idea",
            type: "note",
            body: "See this",
            link: "https://example.com/source",
        });

        expect(response.status).toBe(200);
        expect(savedContent()?.link).toBe("https://example.com/source");
    });

    it("rejects a note with an invalid optional link", async () => {
        const response = await authenticatedRequest().send({
            title: "Idea",
            type: "note",
            body: "See this",
            link: "javascript:alert(1)",
        });

        expect(response.status).toBe(400);
        expect(ContentModel.create).not.toHaveBeenCalled();
    });

    it("rejects a note without text", async () => {
        const response = await authenticatedRequest().send({
            title: "Idea",
            type: "note",
            body: "   ",
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("A note needs some text");
        expect(ContentModel.create).not.toHaveBeenCalled();
    });

    it("rejects a note body over 5000 characters", async () => {
        const response = await authenticatedRequest().send({
            title: "Idea",
            type: "note",
            body: "a".repeat(5001),
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Body cannot exceed 5000 characters",
        );
    });

    it("rejects changing an empty item into a note without text", async () => {
        vi.mocked(ContentModel.findOne).mockResolvedValue({
            body: "",
            save: vi.fn(),
        } as never);

        const response = await request(app)
            .put("/api/v1/content/507f1f77bcf86cd799439012")
            .set("Authorization", `Bearer ${getAuthToken()}`)
            .send({ title: "Now a note", type: "note" });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("A note needs some text");
    });

    it("keeps the existing body when an update doesn't send one", async () => {
        const save = vi.fn();
        const existing = { body: "Original text", save } as Record<string, unknown>;
        vi.mocked(ContentModel.findOne).mockResolvedValue(existing as never);

        const query = {
            populate: vi.fn(() => query),
            then: (resolve: (value: unknown) => unknown) => resolve(existing),
        };
        vi.mocked(ContentModel.findById).mockReturnValue(query as never);

        const response = await request(app)
            .put("/api/v1/content/507f1f77bcf86cd799439012")
            .set("Authorization", `Bearer ${getAuthToken()}`)
            .send({ title: "Renamed note", type: "note" });

        expect(response.status).toBe(200);
        expect(existing.body).toBe("Original text");
        expect(existing.link).toBe("");
        expect(save).toHaveBeenCalled();
    });
});
