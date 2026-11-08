
import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
    CollectionModel,
    ContentModel,
} from "../db.js";

export async function createCollection(
    req: Request,
    res: Response
) {
    const { name } = req.body ?? {};

    if (
        typeof name !== "string" ||
        name.trim() === ""
    ) {
        return res.status(400).json({
            message: "Collection name is required",
        });
    }

    const trimmedName = name.trim();

    if (trimmedName.length > 50) {
        return res.status(400).json({
            message: "Collection name cannot exceed 50 characters",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    try {
        const collection = await CollectionModel.create({
            name: trimmedName,
            userId,
        });

        return res.status(201).json({
            message: "Collection created successfully",
            collection,
        });
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000
        ) {
            return res.status(409).json({
                message: "A collection with this name already exists",
            });
        }

        // Let the centralized Express error handler handle unexpected errors.
        throw error;
    }
}

export async function getCollections(
    req: Request,
    res: Response
) {
    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const collections = await CollectionModel.find({
        userId,
    }).sort({
        createdAt: -1,
    });

    return res.json({
        collections,
    });
}

export async function deleteCollection(
    req: Request,
    res: Response
) {
    const collectionId = req.params.id;

    if (
        typeof collectionId !== "string" ||
        !mongoose.Types.ObjectId.isValid(collectionId)
    ) {
        return res.status(400).json({
            message: "Invalid collection ID",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    const collection = await CollectionModel.findOne({
        _id: collectionId,
        userId,
    });

    if (!collection) {
        return res.status(404).json({
            message: "Collection not found",
        });
    }

    // Remove the collection association from this user's content.
    await ContentModel.updateMany(
        {
            userId,
            collectionId: collection._id,
        },
        {
            $set: {
                collectionId: null,
            },
        }
    );

    await CollectionModel.deleteOne({
        _id: collectionId,
        userId,
    });

    return res.json({
        message: "Collection deleted successfully",
    });
}
