
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
    UserModel: {},
    TagModel: {
        create: vi.fn(),
        findOne: vi.fn(),
        find: vi.fn(),
        deleteOne: vi.fn(),
    },
    CollectionModel: {
        create: vi.fn(),
        findOne: vi.fn(),
        find: vi.fn(),
        deleteOne: vi.fn(),
    },
    ContentModel: {
        updateMany: vi.fn(),
    },
    LinkModel: {},
}));

import app from "../src/app.js";
import {
    TagModel,
    CollectionModel,
    ContentModel,
} from "../src/db.js";

const USER_ID = "507f1f77bcf86cd799439011";
const TAG_ID = "507f1f77bcf86cd799439012";
const COLLECTION_ID = "507f1f77bcf86cd799439013";

const TEST_SECRET =
    "mindvault-test-only-secret-not-for-production";

function authToken() {
    return jwt.sign(
        { id: USER_ID },
        TEST_SECRET,
        { expiresIn: "1h" },
    );
}

function apiRequest(method: "get" | "post" | "delete", path: string) {
    return request(app)[method](path)
        .set("Authorization", `Bearer ${authToken()}`);
}

describe("Mind Vault tags API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates a tag and normalizes its name", async () => {
        vi.mocked(TagModel.findOne).mockResolvedValue(
            null as never,
        );
        vi.mocked(TagModel.create).mockResolvedValue(
            { _id: TAG_ID, name: "javascript" } as never,
        );

        const response = await apiRequest(
            "post",
            "/api/v1/tags",
        ).send({ name: "  JavaScript  " });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe("Tag created");
        expect(TagModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "javascript",
                userId: expect.anything(),
            }),
        );
    });

    it("rejects an empty tag name", async () => {
        const response = await apiRequest(
            "post",
            "/api/v1/tags",
        ).send({ name: "   " });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Tag name is required");
        expect(TagModel.create).not.toHaveBeenCalled();
    });

    it("rejects a tag name longer than 30 characters", async () => {
        const response = await apiRequest(
            "post",
            "/api/v1/tags",
        ).send({ name: "a".repeat(31) });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Tag name must be 30 characters or less",
        );
    });

    it("rejects duplicate tags", async () => {
        vi.mocked(TagModel.findOne).mockResolvedValue(
            { _id: TAG_ID, name: "javascript" } as never,
        );

        const response = await apiRequest(
            "post",
            "/api/v1/tags",
        ).send({ name: "JavaScript" });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe("Tag already exists");
        expect(TagModel.create).not.toHaveBeenCalled();
    });

    it("retrieves tags belonging to the authenticated user", async () => {
        const sort = vi.fn().mockResolvedValue([
            { _id: TAG_ID, name: "javascript" },
        ]);

        vi.mocked(TagModel.find).mockReturnValue(
            { sort } as never,
        );

        const response = await apiRequest(
            "get",
            "/api/v1/tags",
        );

        expect(response.status).toBe(200);
        expect(response.body.tags).toHaveLength(1);
        expect(TagModel.find).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: expect.anything(),
            }),
        );
        expect(sort).toHaveBeenCalledWith({ name: 1 });
    });

    it("rejects an invalid tag ID", async () => {
        const response = await apiRequest(
            "delete",
            "/api/v1/tags/not-an-id",
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid tag ID");
    });

    it("rejects deletion of a missing or unowned tag", async () => {
        vi.mocked(TagModel.findOne).mockResolvedValue(
            null as never,
        );

        const response = await apiRequest(
            "delete",
            `/api/v1/tags/${TAG_ID}`,
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Tag not found");
        expect(TagModel.deleteOne).not.toHaveBeenCalled();
    });

    it("removes a deleted tag from the user's content", async () => {
        vi.mocked(TagModel.findOne).mockResolvedValue({
            _id: TAG_ID,
        } as never);
        vi.mocked(ContentModel.updateMany).mockResolvedValue(
            { modifiedCount: 1 } as never,
        );
        vi.mocked(TagModel.deleteOne).mockResolvedValue(
            { deletedCount: 1 } as never,
        );

        const response = await apiRequest(
            "delete",
            `/api/v1/tags/${TAG_ID}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Tag deleted");

        expect(ContentModel.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: expect.anything(),
                tags: TAG_ID,
            }),
            { $pull: { tags: TAG_ID } },
        );
    });
});

describe("Mind Vault collections API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates a collection with a trimmed name", async () => {
        vi.mocked(CollectionModel.create).mockResolvedValue(
            { _id: COLLECTION_ID, name: "Learning" } as never,
        );

        const response = await apiRequest(
            "post",
            "/api/v1/collections",
        ).send({ name: "  Learning  " });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe(
            "Collection created successfully",
        );
        expect(CollectionModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Learning",
                userId: expect.anything(),
            }),
        );
    });

    it("rejects an empty collection name", async () => {
        const response = await apiRequest(
            "post",
            "/api/v1/collections",
        ).send({ name: "   " });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Collection name is required",
        );
    });

    it("rejects a collection name longer than 50 characters", async () => {
        const response = await apiRequest(
            "post",
            "/api/v1/collections",
        ).send({ name: "a".repeat(51) });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Collection name cannot exceed 50 characters",
        );
    });

    it("returns 409 for a duplicate collection name", async () => {
        vi.mocked(CollectionModel.create).mockRejectedValue({
            code: 11000,
        });

        const response = await apiRequest(
            "post",
            "/api/v1/collections",
        ).send({ name: "Learning" });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            "A collection with this name already exists",
        );
    });

    it("retrieves collections for the authenticated user", async () => {
        const sort = vi.fn().mockResolvedValue([
            { _id: COLLECTION_ID, name: "Learning" },
        ]);

        vi.mocked(CollectionModel.find).mockReturnValue(
            { sort } as never,
        );

        const response = await apiRequest(
            "get",
            "/api/v1/collections",
        );

        expect(response.status).toBe(200);
        expect(response.body.collections).toHaveLength(1);
        expect(CollectionModel.find).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: expect.anything(),
            }),
        );
        expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it("rejects an invalid collection ID", async () => {
        const response = await apiRequest(
            "delete",
            "/api/v1/collections/not-an-id",
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Invalid collection ID",
        );
    });

    it("rejects deletion of a missing or unowned collection", async () => {
        vi.mocked(CollectionModel.findOne).mockResolvedValue(
            null as never,
        );

        const response = await apiRequest(
            "delete",
            `/api/v1/collections/${COLLECTION_ID}`,
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Collection not found");
        expect(CollectionModel.deleteOne).not.toHaveBeenCalled();
    });

    it("clears collection assignments when deleting a collection", async () => {
        vi.mocked(CollectionModel.findOne).mockResolvedValue({
            _id: COLLECTION_ID,
        } as never);
        vi.mocked(ContentModel.updateMany).mockResolvedValue(
            { modifiedCount: 1 } as never,
        );
        vi.mocked(CollectionModel.deleteOne).mockResolvedValue(
            { deletedCount: 1 } as never,
        );

        const response = await apiRequest(
            "delete",
            `/api/v1/collections/${COLLECTION_ID}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(
            "Collection deleted successfully",
        );

        expect(ContentModel.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: expect.anything(),
                collectionId: COLLECTION_ID,
            }),
            { $set: { collectionId: null } },
        );
    });
});
