import type { Request, Response } from "express";
import mongoose from "mongoose";

import { ContentModel, ShareLinkModel, UserModel } from "../db.js";
import { random } from "../utils.js";

const HASH_LENGTH = 12;
const MAX_ITEMS = 100;
const TITLE_MAX_LENGTH = 100;

function isDuplicateKeyError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
    );
}

type ShareLinkDoc = {
    _id: mongoose.Types.ObjectId;
    hash: string;
    kind: string;
    title?: string | null;
    contentIds: mongoose.Types.ObjectId[];
    createdAt?: Date;
};

function serialize(link: ShareLinkDoc, extra: Record<string, unknown> = {}) {
    return {
        id: link._id.toString(),
        hash: link.hash,
        kind: link.kind,
        title: link.title ?? "",
        itemCount: link.contentIds.length,
        createdAt: link.createdAt,
        ...extra,
    };
}

// POST /api/v1/share-links  { contentIds: string[], title?: string }
export async function createShareLink(req: Request, res: Response) {
    const { contentIds, title } = req.body ?? {};

    if (
        !Array.isArray(contentIds) ||
        contentIds.length === 0 ||
        contentIds.length > MAX_ITEMS
    ) {
        return res.status(400).json({
            message: `Choose between 1 and ${MAX_ITEMS} items to share`,
        });
    }

    if (
        !contentIds.every(
            (id: unknown) =>
                typeof id === "string" && mongoose.Types.ObjectId.isValid(id)
        )
    ) {
        return res.status(400).json({ message: "Invalid content ID" });
    }

    let validTitle = "";

    if (title !== undefined && title !== null) {
        if (typeof title !== "string") {
            return res.status(400).json({ message: "Title must be a string" });
        }

        validTitle = title.trim();

        if (validTitle.length > TITLE_MAX_LENGTH) {
            return res.status(400).json({
                message: `Title cannot exceed ${TITLE_MAX_LENGTH} characters`,
            });
        }
    }

    // Keep the user's order, drop duplicates.
    const uniqueIds = [...new Set(contentIds as string[])];
    const userId = new mongoose.Types.ObjectId(req.userId!);

    const owned = await ContentModel.find({
        _id: { $in: uniqueIds },
        userId,
    }).select("_id");

    if (owned.length !== uniqueIds.length) {
        return res.status(404).json({
            message: "One or more items were not found",
        });
    }

    const objectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
    const kind = objectIds.length === 1 ? "item" : "selection";

    // Sharing the same single item again reuses its link.
    if (kind === "item" && !validTitle) {
        const existing = await ShareLinkModel.findOne({
            userId,
            kind: "item",
            contentIds: objectIds,
            title: "",
        });

        if (existing) {
            return res.json({ shareLink: serialize(existing) });
        }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const link = await ShareLinkModel.create({
                hash: random(HASH_LENGTH),
                userId,
                kind,
                contentIds: objectIds,
                title: validTitle,
            });

            return res.status(201).json({ shareLink: serialize(link) });
        } catch (error) {
            // Retry only on a (very unlikely) hash collision.
            if (!isDuplicateKeyError(error)) {
                throw error;
            }
        }
    }

    throw new Error("Could not generate a unique share link");
}

// GET /api/v1/share-links
export async function listShareLinks(req: Request, res: Response) {
    const userId = new mongoose.Types.ObjectId(req.userId!);

    const links = await ShareLinkModel.find({ userId }).sort({
        createdAt: -1,
        _id: -1,
    });

    // One query for every linked item's title, for counts and previews.
    const allIds = links.flatMap((link) => link.contentIds);
    const items = await ContentModel.find({
        _id: { $in: allIds },
        userId,
    }).select("title");
    const titles = new Map(items.map((item) => [item._id.toString(), item.title]));

    return res.json({
        shareLinks: links.map((link) => {
            const existingTitles = link.contentIds
                .map((id) => titles.get(id.toString()))
                .filter((value): value is string => typeof value === "string");

            return serialize(link, {
                itemCount: existingTitles.length,
                preview: existingTitles.slice(0, 3),
            });
        }),
    });
}

// DELETE /api/v1/share-links/:id
export async function deleteShareLink(req: Request, res: Response) {
    const linkId = req.params.id;

    if (typeof linkId !== "string" || !mongoose.Types.ObjectId.isValid(linkId)) {
        return res.status(400).json({ message: "Invalid share link ID" });
    }

    const result = await ShareLinkModel.deleteOne({
        _id: linkId,
        userId: new mongoose.Types.ObjectId(req.userId!),
    });

    if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Share link not found" });
    }

    return res.json({ message: "Sharing stopped" });
}

// GET /api/v1/shared/:hash  (public)
export async function getSharedItems(req: Request, res: Response) {
    const hash = req.params.hash;

    if (typeof hash !== "string" || !/^[A-Za-z0-9]{12}$/.test(hash)) {
        return res.status(404).json({ message: "Shared link not found" });
    }

    const link = await ShareLinkModel.findOne({ hash });

    if (!link) {
        return res.status(404).json({ message: "Shared link not found" });
    }

    const [user, items] = await Promise.all([
        UserModel.findById(link.userId, "username"),
        // Personal notes must never be exposed publicly.
        ContentModel.find({
            _id: { $in: link.contentIds },
            userId: link.userId,
        }).select("-notes"),
    ]);

    if (!user) {
        return res.status(404).json({ message: "Shared link not found" });
    }

    // Return items in the order they were picked; deleted ones drop out.
    const byId = new Map(items.map((item) => [item._id.toString(), item]));
    const content = link.contentIds
        .map((id) => byId.get(id.toString()))
        .filter((item) => item !== undefined);

    return res.json({
        username: user.username,
        title: link.title ?? "",
        kind: link.kind,
        content,
    });
}
