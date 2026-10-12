
import type { Request, Response } from "express";
import mongoose from "mongoose";

import { LinkModel } from "../db.js";
import { random } from "../utils.js";

export async function shareBrain(
    req: Request,
    res: Response
) {
    const share = req.body.share;

    const userId = new mongoose.Types.ObjectId(
        req.userId!
    );

    if (share) {
        const existingLink = await LinkModel.findOne({
            userId,
        });

        if (existingLink) {
            return res.json({
                hash: existingLink.hash,
            });
        }

        const hash = random(10);

        await LinkModel.create({
            userId,
            hash,
        });

        return res.json({
            hash,
        });
    }

    await LinkModel.deleteOne({
        userId,
    });

    return res.json({
        message: "Removed Link",
    });
}
