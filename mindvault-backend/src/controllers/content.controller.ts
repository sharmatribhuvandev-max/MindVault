
import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
    CollectionModel,
    ContentModel,
    TagModel,
} from "../db.js";
import {
    CONTENT_LIST_SORT,
    CONTENT_TYPES,
    NOTE_BODY_MAX_LENGTH,
    isContentType,
    requiresLink,
    type ContentType,
} from "../content-types.js";

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

type CoreFieldsResult =
    | {
        ok: true;
        title: string;
        type: ContentType;
        link: string;
        body: string | undefined;
    }
    | { ok: false; message: string };

// Validates the fields shared by create and update: title, type, link
// and body. `body` is undefined when it wasn't sent.
function validateCoreFields(input: {
    title: unknown;
    type: unknown;
    link: unknown;
    body: unknown;
}): CoreFieldsResult {
    const { title, type, link, body } = input;

    if (typeof title !== "string" || title.trim() === "") {
        return { ok: false, message: "Title is required" };
    }

    if (!isContentType(type)) {
        return {
            ok: false,
            message: `Content type must be one of: ${CONTENT_TYPES.join(", ")}`,
        };
    }

    const linkProvided =
        typeof link === "string" && link.trim() !== "";

    if (requiresLink(type) || linkProvided) {
        if (!isValidHttpUrl(link)) {
            return {
                ok: false,
                message: "A valid HTTP or HTTPS link is required",
            };
        }
    }

    let validBody: string | undefined;

    if (body !== undefined) {
        if (typeof body !== "string") {
            return { ok: false, message: "Body must be a string" };
        }

        validBody = body.trim();

        if (validBody.length > NOTE_BODY_MAX_LENGTH) {
            return {
                ok: false,
                message: `Body cannot exceed ${NOTE_BODY_MAX_LENGTH} characters`,
            };
        }
    }

    return {
        ok: true,
        title: title.trim(),
        type,
        link: linkProvided ? (link as string).trim() : "",
        body: validBody,
    };
}

export async function createContent(
    req: Request,
    res: Response
) {
    const {
        link,
        type,
        title,
        body,
        tags,
        collectionId,
        notes,
    } = req.body ?? {};

    const core = validateCoreFields({ title, type, link, body });

    if (!core.ok) {
        return res.status(400).json({
            message: core.message,
        });
    }

    if (core.type === "note" && !core.body) {
        return res.status(400).json({
            message: "A note needs some text",
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
        link: core.link,
        type: core.type,
        title: core.title,
        body: core.body ?? "",
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
        .sort(CONTENT_LIST_SORT)
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
        body,
        tags,
        collectionId,
        notes,
    } = req.body ?? {};

    const core = validateCoreFields({ title, type, link, body });

    if (!core.ok) {
        return res.status(400).json({
            message: core.message,
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

    // Body is only replaced when sent; a note must end up with text.
    const finalBody = core.body ?? content.body ?? "";

    if (core.type === "note" && !finalBody) {
        return res.status(400).json({
            message: "A note needs some text",
        });
    }

    content.title = core.title;
    content.link = core.link;
    content.type = core.type;
    content.body = finalBody;

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
