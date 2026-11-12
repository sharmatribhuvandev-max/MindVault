
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
            "Content type must be youtube or twitter",
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
});
