import express from "express";

import mongoose from "mongoose";

import jwt from "jsonwebtoken";

import bcrypt from "bcryptjs";

import {
    CollectionModel,
    ContentModel,
    LinkModel,
    TagModel,
    UserModel
} from "./db.js";

import {
    JWT_PASSWORD,
    JWT_EXPIRES_IN
} from "./config.js";

import { userMiddleware } from "./middleware.js";

import { random } from "./utils.js";

import cors from "cors";

const app = express();

app.use(express.json());

app.use(cors());

/*
 * =========================
 * SIGN UP
 * =========================
 */

app.post("/api/v1/signup", async (req, res) => {

    const username = req.body.username;

    const password = req.body.password;

    try {

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        await UserModel.create({
            username: username,
            password: hashedPassword
        });

        res.json({
            message: "User signed up"
        });

    } catch (e) {

        res.status(411).json({
            message: "User already exists"
        });

    }

});

/*
 * =========================
 * SIGN IN
 * =========================
 */

app.post("/api/v1/signin", async (req, res) => {

    const username = req.body.username;

    const password = req.body.password;

    const existingUser = await UserModel.findOne({
        username
    });

    if (!existingUser) {

        return res.status(403).json({
            message: "Incorrect credentials"
        });

    }

    const passwordMatches = await bcrypt.compare(
        password,
        existingUser.password
    );

    if (!passwordMatches) {

        return res.status(403).json({
            message: "Incorrect credentials"
        });

    }

    const token = jwt.sign(
        {
            id: existingUser._id.toString()
        },
        JWT_PASSWORD,
        {
            expiresIn: JWT_EXPIRES_IN
        }
    );

    res.json({
        token
    });

});

/*
 * =========================
 * TAGS
 * =========================
 */

/*
 * CREATE TAG
 */

app.post(
    "/api/v1/tags",
    userMiddleware,
    async (req, res) => {

        const name = req.body.name;

        if (
            typeof name !== "string" ||
            name.trim() === ""
        ) {

            return res.status(400).json({
                message: "Tag name is required"
            });

        }

        const normalizedName = name.trim().toLowerCase();

        if (normalizedName.length > 30) {

            return res.status(400).json({
                message:
                    "Tag name must be 30 characters or less"
            });

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        try {

            const existingTag = await TagModel.findOne({
                userId,
                name: normalizedName
            });

            if (existingTag) {

                return res.status(409).json({
                    message: "Tag already exists"
                });

            }

            const tag = await TagModel.create({
                name: normalizedName,
                userId
            });

            return res.status(201).json({
                message: "Tag created",
                tag
            });

        } catch (error: any) {

            if (error?.code === 11000) {

                return res.status(409).json({
                    message: "Tag already exists"
                });

            }

            return res.status(500).json({
                message: "Failed to create tag"
            });

        }

    }

);

/*
 * GET USER TAGS
 */

app.get(
    "/api/v1/tags",
    userMiddleware,
    async (req, res) => {

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const tags = await TagModel.find({
            userId
        }).sort({
            name: 1
        });

        return res.json({
            tags
        });

    }

);

/*
 * DELETE TAG
 */

app.delete(
    "/api/v1/tags/:id",
    userMiddleware,
    async (req, res) => {

        const tagId = req.params.id;

        if (
            typeof tagId !== "string" ||
            !mongoose.Types.ObjectId.isValid(tagId)
        ) {

            return res.status(400).json({
                message: "Invalid tag ID"
            });

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const tag = await TagModel.findOne({
            _id: tagId,
            userId
        });

        if (!tag) {

            return res.status(404).json({
                message: "Tag not found"
            });

        }

        await ContentModel.updateMany(
            {
                userId,
                tags: tag._id
            },
            {
                $pull: {
                    tags: tag._id
                }
            }
        );

        await TagModel.deleteOne({
            _id: tag._id,
            userId
        });

        return res.json({
            message: "Tag deleted"
        });

    }

);

/*
 * =========================
 * ADD CONTENT
 * =========================
 */

app.post(
    "/api/v1/content",
    userMiddleware,
    async (req, res) => {

        const link = req.body.link;

        const type = req.body.type;

        const title = req.body.title;

        const tags = req.body.tags;

        const collectionId = req.body.collectionId;

        const notes = req.body.notes;

        /*
         * =========================
         * NOTES VALIDATION
         * =========================
         */

        let validNotes = "";

        if (notes !== undefined) {

            if (typeof notes !== "string") {

                return res.status(400).json({
                    message: "Notes must be a string"
                });

            }

            validNotes = notes.trim();

            if (validNotes.length > 2000) {

                return res.status(400).json({
                    message:
                        "Notes cannot exceed 2000 characters"
                });

            }

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        /*
         * =========================
         * TAG VALIDATION
         * =========================
         */

        let tagIds: mongoose.Types.ObjectId[] = [];

        if (tags !== undefined) {

            if (!Array.isArray(tags)) {

                return res.status(400).json({
                    message: "Tags must be an array"
                });

            }

            const uniqueTagIds = [
                ...new Set(
                    tags.map((tagId: unknown) =>
                        String(tagId)
                    )
                )
            ];

            for (const tagId of uniqueTagIds) {

                if (
                    !mongoose.Types.ObjectId.isValid(tagId)
                ) {

                    return res.status(400).json({
                        message: "Invalid tag ID"
                    });

                }

            }

            const validTags = await TagModel.find({
                _id: {
                    $in: uniqueTagIds
                },
                userId
            }).select("_id");

            if (
                validTags.length !==
                uniqueTagIds.length
            ) {

                return res.status(403).json({
                    message:
                        "One or more tags do not belong to you"
                });

            }

            tagIds = validTags.map(
                (tag) => tag._id
            );

        }

        /*
         * =========================
         * COLLECTION VALIDATION
         * =========================
         */

        let validCollectionId:
            mongoose.Types.ObjectId | null = null;

        if (
            collectionId !== undefined &&
            collectionId !== null &&
            collectionId !== ""
        ) {

            if (
                typeof collectionId !== "string" ||
                !mongoose.Types.ObjectId.isValid(
                    collectionId
                )
            ) {

                return res.status(400).json({
                    message: "Invalid collection ID"
                });

            }

            const collection =
                await CollectionModel.findOne({
                    _id: collectionId,
                    userId
                });

            if (!collection) {

                return res.status(403).json({
                    message:
                        "Collection does not belong to you"
                });

            }

            validCollectionId =
                new mongoose.Types.ObjectId(
                    collectionId
                );
        }

        /*
         * =========================
         * CREATE CONTENT
         * =========================
         */

        await ContentModel.create({
            link,
            type,
            title,
            userId,
            tags: tagIds,
            collectionId: validCollectionId,
            notes: validNotes
        });

        return res.json({
            message: "Content added"
        });

    }

);

/*
 * =========================
 * GET CONTENT
 * =========================
 */

app.get(
    "/api/v1/content",
    userMiddleware,
    async (req, res) => {

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const content = await ContentModel.find({
            userId
        })
            .populate(
                "userId",
                "username"
            )
            .populate(
                "tags",
                "name"
            )
            .populate(
                "collectionId",
                "name"
            );

        res.json({
            content
        });

    }

);

/*
 * =========================
 * UPDATE CONTENT
 * =========================
 */

app.put(
    "/api/v1/content/:id",
    userMiddleware,
    async (req, res) => {

        const contentId = req.params.id;

        if (
            typeof contentId !== "string" ||
            !mongoose.Types.ObjectId.isValid(contentId)
        ) {

            return res.status(400).json({
                message: "Invalid content ID"
            });

        }

        const {
            title,
            link,
            type,
            tags,
            collectionId,
            notes
        } = req.body;

        if (
            typeof title !== "string" ||
            title.trim() === "" ||
            typeof link !== "string" ||
            link.trim() === "" ||
            (type !== "youtube" &&
                type !== "twitter")
        ) {

            return res.status(400).json({
                message: "Invalid content data"
            });

        }

        /*
         * =========================
         * NOTES VALIDATION
         * =========================
         */

        let validNotes: string | undefined;

        if (notes !== undefined) {

            if (typeof notes !== "string") {

                return res.status(400).json({
                    message: "Notes must be a string"
                });

            }

            validNotes = notes.trim();

            if (validNotes.length > 2000) {

                return res.status(400).json({
                    message:
                        "Notes cannot exceed 2000 characters"
                });

            }

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        /*
         * =========================
         * OWNERSHIP CHECK
         * =========================
         */

        const content = await ContentModel.findOne({
            _id: contentId,
            userId
        });

        if (!content) {

            return res.status(404).json({
                message: "Content not found"
            });

        }

        content.title = title.trim();

        content.link = link.trim();

        content.type = type;

        /*
         * =========================
         * UPDATE NOTES
         * =========================
         */

        if (validNotes !== undefined) {

            content.notes = validNotes;

        }

        /*
         * =========================
         * UPDATE TAGS
         * =========================
         */

        if (tags !== undefined) {

            if (!Array.isArray(tags)) {

                return res.status(400).json({
                    message: "Tags must be an array"
                });

            }

            const uniqueTagIds = [
                ...new Set(
                    tags.map((tagId: unknown) =>
                        String(tagId)
                    )
                )
            ];

            for (const tagId of uniqueTagIds) {

                if (
                    !mongoose.Types.ObjectId.isValid(tagId)
                ) {

                    return res.status(400).json({
                        message: "Invalid tag ID"
                    });

                }

            }

            const validTags = await TagModel.find({
                _id: {
                    $in: uniqueTagIds
                },
                userId
            }).select("_id");

            if (
                validTags.length !==
                uniqueTagIds.length
            ) {

                return res.status(403).json({
                    message:
                        "One or more tags do not belong to you"
                });

            }

            content.tags = validTags.map(
                (tag) => tag._id
            );

        }

        /*
         * =========================
         * UPDATE COLLECTION
         * =========================
         */

        if (collectionId !== undefined) {

            if (
                collectionId === null ||
                collectionId === ""
            ) {

                content.collectionId = null;

            } else {

                if (
                    typeof collectionId !== "string" ||
                    !mongoose.Types.ObjectId.isValid(
                        collectionId
                    )
                ) {

                    return res.status(400).json({
                        message:
                            "Invalid collection ID"
                    });

                }

                const collection =
                    await CollectionModel.findOne({
                        _id: collectionId,
                        userId
                    });

                if (!collection) {

                    return res.status(403).json({
                        message:
                            "Collection does not belong to you"
                    });

                }

                content.collectionId =
                    new mongoose.Types.ObjectId(
                        collectionId
                    );

            }

        }

        await content.save();

        const updatedContent =
            await ContentModel.findById(
                content._id
            )
                .populate(
                    "userId",
                    "username"
                )
                .populate(
                    "tags",
                    "name"
                )
                .populate(
                    "collectionId",
                    "name"
                );

        return res.json({
            message: "Content updated",
            content: updatedContent
        });

    }

);

/*
 * =========================
 * FAVORITE CONTENT
 * =========================
 */

app.patch(
    "/api/v1/content/:id/favorite",
    userMiddleware,
    async (req, res) => {

        const contentId = req.params.id;

        if (
            typeof contentId !== "string" ||
            !mongoose.Types.ObjectId.isValid(contentId)
        ) {

            return res.status(400).json({
                message: "Invalid content ID"
            });

        }

        const { isFavorite } = req.body;

        if (typeof isFavorite !== "boolean") {

            return res.status(400).json({
                message:
                    "isFavorite must be a boolean"
            });

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const content = await ContentModel.findOne({
            _id: contentId,
            userId
        });

        if (!content) {

            return res.status(404).json({
                message: "Content not found"
            });

        }

        content.isFavorite = isFavorite;

        await content.save();

        const updatedContent =
            await ContentModel.findById(
                content._id
            )
                .populate(
                    "userId",
                    "username"
                )
                .populate(
                    "tags",
                    "name"
                )
                .populate(
                    "collectionId",
                    "name"
                );

        return res.json({
            message: isFavorite
                ? "Content added to favorites"
                : "Content removed from favorites",
            content: updatedContent
        });

    }

);

/*
 * =========================
 * PIN CONTENT
 * =========================
 */

app.patch(
    "/api/v1/content/:id/pin",
    userMiddleware,
    async (req, res) => {

        const contentId = req.params.id;

        if (
            typeof contentId !== "string" ||
            !mongoose.Types.ObjectId.isValid(contentId)
        ) {

            return res.status(400).json({
                message: "Invalid content ID"
            });

        }

        const { isPinned } = req.body;

        if (typeof isPinned !== "boolean") {

            return res.status(400).json({
                message:
                    "isPinned must be a boolean"
            });

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const content = await ContentModel.findOne({
            _id: contentId,
            userId
        });

        if (!content) {

            return res.status(404).json({
                message: "Content not found"
            });

        }

        content.isPinned = isPinned;

        await content.save();

        const updatedContent =
            await ContentModel.findById(
                content._id
            )
                .populate(
                    "userId",
                    "username"
                )
                .populate(
                    "tags",
                    "name"
                )
                .populate(
                    "collectionId",
                    "name"
                );

        return res.json({
            message: isPinned
                ? "Content pinned"
                : "Content unpinned",
            content: updatedContent
        });

    }

);

/*
 * =========================
 * COLLECTIONS
 * =========================
 */

/*
 * CREATE COLLECTION
 */

app.post(
    "/api/v1/collections",
    userMiddleware,
    async (req, res) => {

        const { name } = req.body;

        if (
            typeof name !== "string" ||
            name.trim() === ""
        ) {

            return res.status(400).json({
                message:
                    "Collection name is required"
            });

        }

        const trimmedName = name.trim();

        if (trimmedName.length > 50) {

            return res.status(400).json({
                message:
                    "Collection name cannot exceed 50 characters"
            });

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        try {

            const collection =
                await CollectionModel.create({
                    name: trimmedName,
                    userId
                });

            return res.status(201).json({
                message:
                    "Collection created successfully",
                collection
            });

        } catch (error: any) {

            if (error?.code === 11000) {

                return res.status(409).json({
                    message:
                        "A collection with this name already exists"
                });

            }

            console.error(
                "Create collection error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to create collection"
            });

        }

    }

);

/*
 * GET COLLECTIONS
 */

app.get(
    "/api/v1/collections",
    userMiddleware,
    async (req, res) => {

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const collections =
            await CollectionModel.find({
                userId
            }).sort({
                createdAt: -1
            });

        return res.json({
            collections
        });

    }

);

/*
 * DELETE COLLECTION
 */

app.delete(
    "/api/v1/collections/:id",
    userMiddleware,
    async (req, res) => {

        const collectionId = req.params.id;

        if (
            typeof collectionId !== "string" ||
            !mongoose.Types.ObjectId.isValid(
                collectionId
            )
        ) {

            return res.status(400).json({
                message:
                    "Invalid collection ID"
            });

        }

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const collection =
            await CollectionModel.findOne({
                _id: collectionId,
                userId
            });

        if (!collection) {

            return res.status(404).json({
                message:
                    "Collection not found"
            });

        }

        /*
         * Remove the collection from any content
         * that belongs to the current user.
         */
        await ContentModel.updateMany(
            {
                userId,
                collectionId:
                    collection._id
            },
            {
                $set: {
                    collectionId: null
                }
            }
        );

        await CollectionModel.deleteOne({
            _id: collectionId,
            userId
        });

        return res.json({
            message:
                "Collection deleted successfully"
        });

    }

);

/*
 * =========================
 * DELETE CONTENT
 * =========================
 */

app.delete(
    "/api/v1/content",
    userMiddleware,
    async (req, res) => {

        const contentId = req.body.contentId;

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        await ContentModel.deleteOne({
            _id: contentId,
            userId
        });

        res.json({
            message: "Deleted"
        });

    }

);

/*
 * =========================
 * SHARE BRAIN
 * =========================
 */

app.post(
    "/api/v1/brain/share",
    userMiddleware,
    async (req, res) => {

        const share = req.body.share;

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        if (share) {

            const existingLink =
                await LinkModel.findOne({
                    userId
                });

            if (existingLink) {

                res.json({
                    hash: existingLink.hash
                });

                return;

            }

            const hash = random(10);

            await LinkModel.create({
                userId,
                hash
            });

            res.json({
                hash
            });

        } else {

            await LinkModel.deleteOne({
                userId
            });

            res.json({
                message: "Removed Link"
            });

        }

    }

);

/*
 * =========================
 * GET SHARED BRAIN
 * =========================
 */

app.get(
    "/api/v1/:shareLink",
    async (req, res) => {

        const hash = req.params.shareLink;

        const link = await LinkModel.findOne({
            hash
        });

        if (!link) {

            return res.status(411).json({
                message:
                    "Sorry incorrect input"
            });

        }

        /*
         * Personal notes must never be exposed
         * through the public shared Brain.
         */
        const content =
            await ContentModel.find({
                userId: link.userId
            }).select("-notes");

        console.log(link);

        const user =
            await UserModel.findOne({
                _id: link.userId
            });

        if (!user) {

            return res.status(411).json({
                message: "User not found"
            });

        }

        res.json({
            username: user.username,
            content
        });

    }

);

/*
 * =========================
 * SERVER
 * =========================
 */

app.listen(3000, () => {

    console.log(
        "Server running on port 3000"
    );

});
