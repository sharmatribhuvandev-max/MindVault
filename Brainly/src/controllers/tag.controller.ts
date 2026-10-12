
import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
    ContentModel,
    TagModel,
} from "../db.js";

export async function createTag(
    req: Request,
    res: Response
) {
    const { name } = req.body ?? {};

    if (
        typeof name !== "string" ||
        name.trim() === ""
    ) {
        return res.status(400).json({
            message: "Tag name is required",
        });
    }

    const normalizedName = name.trim().toLowerCase();

    if (normalizedName.length > 30) {
        return res.status(400).json({
            message: "Tag name must be 30 characters or less",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    try {
        const existingTag = await TagModel.findOne({
            userId,
            name: normalizedName,
        });

        if (existingTag) {
            return res.status(409).json({
                message: "Tag already exists",
            });
        }

        const tag = await TagModel.create({
            name: normalizedName,
            userId,
        });

        return res.status(201).json({
            message: "Tag created",
            tag,
        });
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000
        ) {
            return res.status(409).json({
                message: "Tag already exists",
            });
        }

        // Let the centralized Express error handler handle unexpected errors.
        throw error;
    }
}

export async function getTags(
    req: Request,
    res: Response
) {
    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const tags = await TagModel.find({
        userId,
    }).sort({
        name: 1,
    });

    return res.json({
        tags,
    });
}

export async function deleteTag(
    req: Request,
    res: Response
) {
    const tagId = req.params.id;

    if (
        typeof tagId !== "string" ||
        !mongoose.Types.ObjectId.isValid(tagId)
    ) {
        return res.status(400).json({
            message: "Invalid tag ID",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const tag = await TagModel.findOne({
        _id: tagId,
        userId,
    });

    if (!tag) {
        return res.status(404).json({
            message: "Tag not found",
        });
    }

    await ContentModel.updateMany(
        {
            userId,
            tags: tag._id,
        },
        {
            $pull: {
                tags: tag._id,
            },
        }
    );

    await TagModel.deleteOne({
        _id: tag._id,
        userId,
    });

    return res.json({
        message: "Tag deleted",
    });
}
