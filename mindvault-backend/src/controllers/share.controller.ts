
import type { Request, Response } from "express";
import mongoose from "mongoose";

import { LinkModel } from "../db.js";
import { random } from "../utils.js";

export async function shareBrain(
    req: Request,
    res: Response
) {
    const { share } = req.body ?? {};

    // Only accept an actual boolean.
    if (typeof share !== "boolean") {
        return res.status(400).json({
            message: "Share must be a boolean",
        });
    }

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    if (share === true) {
        try {
            const existingLink = await LinkModel.findOne({
                userId,
            });

            if (existingLink) {
                return res.json({
                    hash: existingLink.hash,
                });
            }

            // Retry on duplicate-key errors: either a concurrent request
            // already created this user's link, or (very unlikely) the
            // random hash collided with another user's.
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const link = await LinkModel.create({
                        userId,
                        hash: random(10),
                    });

                    return res.json({
                        hash: link.hash,
                    });
                } catch (error: unknown) {
                    if (
                        typeof error !== "object" ||
                        error === null ||
                        !("code" in error) ||
                        error.code !== 11000
                    ) {
                        throw error;
                    }

                    const raced = await LinkModel.findOne({ userId });

                    if (raced) {
                        return res.json({
                            hash: raced.hash,
                        });
                    }
                }
            }

            throw new Error("Could not generate a unique share link");
        } catch (error: unknown) {
            console.error("Enable sharing failed:", error);
            throw error;
        }
    }

    await LinkModel.deleteOne({
        userId,
    });

    return res.json({
        message: "Removed Link",
    });
}
