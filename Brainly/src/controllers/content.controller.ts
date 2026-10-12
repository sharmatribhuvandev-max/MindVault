
import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
    CollectionModel,
    ContentModel,
    TagModel,
} from "../db.js";

// Accept only valid HTTP or HTTPS URLs.
function isValidHttpUrl(value: unknown): value is string {
    if (typeof value !== "string" || value.trim() === "") {
        return false;
    }

    try {
        const url = new URL(value.trim());

        return (
            (url.protocol === "http:" || url.protocol === "https:") &&
            url.hostname.length > 0
        );
    } catch {
        return false;
    }
}

export async function createContent(
    req: Request,
    res: Response
) {
    const {
        link,
        type,
        title,
        tags,
        collectionId,
        notes,
    } = req.body ?? {};

    // Validate title
    if (
        typeof title !== "string" ||
        title.trim() === ""
    ) {
        return res.status(400).json({
            message: "Title is required",
        });
    }

    // Validate link
    if (!isValidHttpUrl(link)) {
        return res.status(400).json({
            message: "A valid HTTP or HTTPS link is required",
        });
    }

    // Validate supported content type
    if (type !== "youtube" && type !== "twitter") {
        return res.status(400).json({
            message: "Content type must be youtube or twitter",
        });
    }

    // Validate notes
    let validNotes = "";

    if (notes !== undefined) {
        if (typeof notes !== "string") {
            return res.status(400).json({
                message: "Notes must be a string",
            });
        }

        validNotes = notes.trim();

        if (validNotes.length > 2000) {
            return res.status(400).json({
                message: "Notes cannot exceed 2000 characters",
            });
        }
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    // Validate tags
    let tagIds: mongoose.Types.ObjectId[] = [];

    if (tags !== undefined) {
        if (!Array.isArray(tags)) {
            return res.status(400).json({
                message: "Tags must be an array",
            });
        }

        const uniqueTagIds = [
            ...new Set(
                tags.map((tagId: unknown) => String(tagId))
            ),
        ];

        for (const tagId of uniqueTagIds) {
            if (!mongoose.Types.ObjectId.isValid(tagId)) {
                return res.status(400).json({
                    message: "Invalid tag ID",
                });
            }
        }

        const validTags = await TagModel.find({
            _id: {
                $in: uniqueTagIds,
            },
            userId,
        }).select("_id");

        if (validTags.length !== uniqueTagIds.length) {
            return res.status(403).json({
                message: "One or more tags do not belong to you",
            });
        }

        tagIds = validTags.map((tag) => tag._id);
    }

    // Validate collection
    let validCollectionId: mongoose.Types.ObjectId | null = null;

    if (
        collectionId !== undefined &&
        collectionId !== null &&
        collectionId !== ""
    ) {
        if (
            typeof collectionId !== "string" ||
            !mongoose.Types.ObjectId.isValid(collectionId)
        ) {
            return res.status(400).json({
                message: "Invalid collection ID",
            });
        }

        const collection = await CollectionModel.findOne({
            _id: collectionId,
            userId,
        });

        if (!collection) {
            return res.status(403).json({
                message: "Collection does not belong to you",
            });
        }

        validCollectionId = new mongoose.Types.ObjectId(
            collectionId
        );
    }

    // Create content
    await ContentModel.create({
        link: link.trim(),
        type,
        title: title.trim(),
        userId,
        tags: tagIds,
        collectionId: validCollectionId,
        notes: validNotes,
    });

    return res.json({
        message: "Content added",
    });
}

export async function getContent(
    req: Request,
    res: Response
) {
    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const content = await ContentModel.find({
        userId,
    })
        .populate("userId", "username")
        .populate("tags", "name")
        .populate("collectionId", "name");

    return res.json({
        content,
    });
}

export async function updateContent(
    req: Request,
    res: Response
) {
    const contentId = req.params.id;

    if (
        typeof contentId !== "string" ||
        !mongoose.Types.ObjectId.isValid(contentId)
    ) {
        return res.status(400).json({
            message: "Invalid content ID",
        });
    }

    const {
        title,
        link,
        type,
        tags,
        collectionId,
        notes,
    } = req.body ?? {};

    if (
        typeof title !== "string" ||
        title.trim() === ""
    ) {
        return res.status(400).json({
            message: "Title is required",
        });
    }

    if (!isValidHttpUrl(link)) {
        return res.status(400).json({
            message: "A valid HTTP or HTTPS link is required",
        });
    }

    if (type !== "youtube" && type !== "twitter") {
        return res.status(400).json({
            message: "Content type must be youtube or twitter",
        });
    }

    // Validate notes
    let validNotes: string | undefined;

    if (notes !== undefined) {
        if (typeof notes !== "string") {
            return res.status(400).json({
                message: "Notes must be a string",
            });
        }

        validNotes = notes.trim();

        if (validNotes.length > 2000) {
            return res.status(400).json({
                message: "Notes cannot exceed 2000 characters",
            });
        }
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    // Check content ownership
    const content = await ContentModel.findOne({
        _id: contentId,
        userId,
    });

    if (!content) {
        return res.status(404).json({
            message: "Content not found",
        });
    }

    content.title = title.trim();
    content.link = link.trim();
    content.type = type;

    // Update notes only when provided
    if (validNotes !== undefined) {
        content.notes = validNotes;
    }

    // Validate and update tags
    if (tags !== undefined) {
        if (!Array.isArray(tags)) {
            return res.status(400).json({
                message: "Tags must be an array",
            });
        }

        const uniqueTagIds = [
            ...new Set(
                tags.map((tagId: unknown) => String(tagId))
            ),
        ];

        for (const tagId of uniqueTagIds) {
            if (!mongoose.Types.ObjectId.isValid(tagId)) {
                return res.status(400).json({
                    message: "Invalid tag ID",
                });
            }
        }

        const validTags = await TagModel.find({
            _id: {
                $in: uniqueTagIds,
            },
            userId,
        }).select("_id");

        if (validTags.length !== uniqueTagIds.length) {
            return res.status(403).json({
                message: "One or more tags do not belong to you",
            });
        }

        content.tags = validTags.map((tag) => tag._id);
    }

    // Validate and update collection
    if (collectionId !== undefined) {
        if (collectionId === null || collectionId === "") {
            content.collectionId = null;
        } else {
            if (
                typeof collectionId !== "string" ||
                !mongoose.Types.ObjectId.isValid(collectionId)
            ) {
                return res.status(400).json({
                    message: "Invalid collection ID",
                });
            }

            const collection = await CollectionModel.findOne({
                _id: collectionId,
                userId,
            });

            if (!collection) {
                return res.status(403).json({
                    message: "Collection does not belong to you",
                });
            }

            content.collectionId =
                new mongoose.Types.ObjectId(collectionId);
        }
    }

    await content.save();

    const updatedContent = await ContentModel.findById(
        content._id
    )
        .populate("userId", "username")
        .populate("tags", "name")
        .populate("collectionId", "name");

    return res.json({
        message: "Content updated",
        content: updatedContent,
    });
}

export async function updateFavorite(
    req: Request,
    res: Response
) {
    const contentId = req.params.id;

    if (
        typeof contentId !== "string" ||
        !mongoose.Types.ObjectId.isValid(contentId)
    ) {
        return res.status(400).json({
            message: "Invalid content ID",
        });
    }

    const { isFavorite } = req.body ?? {};

    if (typeof isFavorite !== "boolean") {
        return res.status(400).json({
            message: "isFavorite must be a boolean",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const content = await ContentModel.findOne({
        _id: contentId,
        userId,
    });

    if (!content) {
        return res.status(404).json({
            message: "Content not found",
        });
    }

    content.isFavorite = isFavorite;

    await content.save();

    const updatedContent = await ContentModel.findById(
        content._id
    )
        .populate("userId", "username")
        .populate("tags", "name")
        .populate("collectionId", "name");

    return res.json({
        message: isFavorite
            ? "Content added to favorites"
            : "Content removed from favorites",
        content: updatedContent,
    });
}

export async function updatePin(
    req: Request,
    res: Response
) {
    const contentId = req.params.id;

    if (
        typeof contentId !== "string" ||
        !mongoose.Types.ObjectId.isValid(contentId)
    ) {
        return res.status(400).json({
            message: "Invalid content ID",
        });
    }

    const { isPinned } = req.body ?? {};

    if (typeof isPinned !== "boolean") {
        return res.status(400).json({
            message: "isPinned must be a boolean",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const content = await ContentModel.findOne({
        _id: contentId,
        userId,
    });

    if (!content) {
        return res.status(404).json({
            message: "Content not found",
        });
    }

    content.isPinned = isPinned;

    await content.save();

    const updatedContent = await ContentModel.findById(
        content._id
    )
        .populate("userId", "username")
        .populate("tags", "name")
        .populate("collectionId", "name");

    return res.json({
        message: isPinned
            ? "Content pinned"
            : "Content unpinned",
        content: updatedContent,
    });
}

export async function deleteContent(
    req: Request,
    res: Response
) {
    const contentId = req.body?.contentId;

    if (
        typeof contentId !== "string" ||
        !mongoose.Types.ObjectId.isValid(contentId)
    ) {
        return res.status(400).json({
            message: "Invalid content ID",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const result = await ContentModel.deleteOne({
        _id: contentId,
        userId,
    });

    if (result.deletedCount === 0) {
        return res.status(404).json({
            message: "Content not found",
        });
    }

    return res.json({
        message: "Deleted",
    });
}
