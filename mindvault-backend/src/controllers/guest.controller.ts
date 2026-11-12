import { randomBytes } from "node:crypto";

import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import {
    CollectionModel,
    ContentModel,
    LinkModel,
    TagModel,
    UserModel,
} from "../db.js";
import { JWT_EXPIRES_IN, JWT_PASSWORD } from "../config.js";
import type { ContentType } from "../content-types.js";

export const GUEST_LIFETIME_MS = 24 * 60 * 60 * 1000;

// Cap how many expired guests one request cleans up, so a backlog can't
// make a single "Continue as guest" click slow.
const CLEANUP_BATCH_SIZE = 100;

/**
 * Deletes guest accounts whose time is up, along with everything they
 * own. Runs on each new guest session instead of a scheduled job.
 */
export async function deleteExpiredGuests(now = new Date()): Promise<number> {
    const expired = await UserModel.find(
        { isGuest: true, guestExpiresAt: { $lte: now } },
        "_id"
    ).limit(CLEANUP_BATCH_SIZE);

    if (expired.length === 0) {
        return 0;
    }

    const ids = expired.map((user) => user._id);
    const owned = { userId: { $in: ids } };

    await Promise.all([
        ContentModel.deleteMany(owned),
        TagModel.deleteMany(owned),
        CollectionModel.deleteMany(owned),
        LinkModel.deleteMany(owned),
    ]);
    await UserModel.deleteMany({ _id: { $in: ids }, isGuest: true });

    return ids.length;
}

interface SeedItem {
    title: string;
    type: ContentType;
    link?: string;
    body?: string;
    notes?: string;
    tags?: string[];
    collection?: string;
    isFavorite?: boolean;
    isPinned?: boolean;
}

const SEED_TAGS = ["learning", "career", "dev", "ideas"];
const SEED_COLLECTIONS = ["Learn to code", "Inspiration"];

// Sample content showing off each feature. Only stable, well-known links.
const SEED_CONTENT: SeedItem[] = [
    {
        title: "Welcome to Mind Vault 👋",
        type: "note",
        isPinned: true,
        body: [
            "You're exploring a guest account, so feel free to click around and change anything.",
            "",
            "Things to try:",
            "• Add content: paste any link and the type is detected for you",
            "• Filter by type, favorites or pinned items in the sidebar",
            "• Search across titles, links and notes",
            "• Group items into collections and tag them",
            "• Share your Brain as a public, read-only page",
            "",
            "This account and everything in it is deleted after 24 hours.",
        ].join("\n"),
    },
    {
        title: "Steve Jobs' 2005 Stanford commencement address",
        type: "youtube",
        link: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
        tags: ["career"],
        collection: "Inspiration",
        isFavorite: true,
        notes: "Rewatch before big decisions. \"Connecting the dots\" part starts early.",
    },
    {
        title: "But what is a neural network?",
        type: "youtube",
        link: "https://www.youtube.com/watch?v=aircAruvnKk",
        tags: ["learning"],
        collection: "Learn to code",
    },
    {
        title: "Thinking in React",
        type: "article",
        link: "https://react.dev/learn/thinking-in-react",
        tags: ["dev", "learning"],
        collection: "Learn to code",
        isFavorite: true,
    },
    {
        title: "How to Do Great Work by Paul Graham",
        type: "article",
        link: "https://paulgraham.com/greatwork.html",
        tags: ["career"],
        collection: "Inspiration",
    },
    {
        title: "React",
        type: "github",
        link: "https://github.com/facebook/react",
        tags: ["dev"],
        collection: "Learn to code",
    },
    {
        title: "VS Code",
        type: "github",
        link: "https://github.com/microsoft/vscode",
        tags: ["dev"],
    },
    {
        title: "The first tweet ever",
        type: "twitter",
        link: "https://twitter.com/jack/status/20",
        tags: ["ideas"],
    },
    {
        title: "Side project ideas",
        type: "note",
        tags: ["ideas"],
        body: [
            "1. Browser extension that saves the current tab to Mind Vault",
            "2. Weekly email digest of pinned items",
            "3. Import bookmarks from Chrome",
        ].join("\n"),
    },
];

async function seedGuestData(userId: mongoose.Types.ObjectId) {
    const [tags, collections] = await Promise.all([
        TagModel.insertMany(SEED_TAGS.map((name) => ({ name, userId }))),
        CollectionModel.insertMany(
            SEED_COLLECTIONS.map((name) => ({ name, userId }))
        ),
    ]);

    const tagIds = new Map(tags.map((tag) => [tag.name, tag._id]));
    const collectionIds = new Map(
        collections.map((collection) => [collection.name, collection._id])
    );

    // The dashboard lists items in insertion order, so the welcome note
    // (first in SEED_CONTENT) shows up first.
    await ContentModel.insertMany(
        SEED_CONTENT.map((item) => ({
            title: item.title,
            type: item.type,
            link: item.link ?? "",
            body: item.body ?? "",
            notes: item.notes ?? "",
            isFavorite: item.isFavorite ?? false,
            isPinned: item.isPinned ?? false,
            userId,
            tags: (item.tags ?? []).map((name) => tagIds.get(name)),
            collectionId: item.collection
                ? collectionIds.get(item.collection) ?? null
                : null,
        }))
    );
}

export async function createGuest(
    _req: Request,
    res: Response
) {
    try {
        // Cleanup failures shouldn't block a recruiter from getting in.
        await deleteExpiredGuests().catch((error: unknown) => {
            console.error("Guest cleanup failed:", error);
        });

        const expiresAt = new Date(Date.now() + GUEST_LIFETIME_MS);

        // The password is random and never shown, so a guest account can
        // only be used through the token returned here.
        const user = await UserModel.create({
            username: `guest-${randomBytes(4).toString("hex")}`,
            password: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
            isGuest: true,
            guestExpiresAt: expiresAt,
        });

        try {
            await seedGuestData(user._id);
        } catch (error) {
            // Don't leave a half-seeded account behind.
            await Promise.all([
                ContentModel.deleteMany({ userId: user._id }),
                TagModel.deleteMany({ userId: user._id }),
                CollectionModel.deleteMany({ userId: user._id }),
                UserModel.deleteOne({ _id: user._id }),
            ]);
            throw error;
        }

        const token = jwt.sign(
            { id: user._id.toString(), tv: user.tokenVersion ?? 0 },
            JWT_PASSWORD,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
            token,
            username: user.username,
            guest: true,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error: unknown) {
        console.error("Guest sign-in failed:", error);

        return res.status(500).json({
            message: "Couldn't start a guest session. Please try again.",
        });
    }
}
