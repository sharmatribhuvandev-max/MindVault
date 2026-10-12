
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

            const hash = random(10);

            const link = await LinkModel.create({
                userId,
                hash,
            });

            return res.json({
                hash: link.hash,
            });
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
