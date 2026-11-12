
import type { Request, Response } from "express";

import {
    ContentModel,
    LinkModel,
    UserModel,
} from "../db.js";
import { CONTENT_LIST_SORT } from "../content-types.js";

export async function getPublicBrain(
    req: Request,
    res: Response
) {
    const shareLink = req.params.shareLink;

    // Validate the share link before querying MongoDB.
    if (
        typeof shareLink !== "string" ||
        shareLink.trim() === ""
    ) {
        return res.status(404).json({
            message: "Sorry incorrect input",
        });
    }

    const link = await LinkModel.findOne({
        hash: shareLink,
    });

    if (!link) {
        return res.status(404).json({
            message: "Sorry incorrect input",
        });
    }

    // Personal notes must never be exposed through public sharing.
    const content = await ContentModel.find({
        userId: link.userId,
    })
        .select("-notes")
        .sort(CONTENT_LIST_SORT);

    const user = await UserModel.findOne({
        _id: link.userId,
    });

    if (!user) {
        return res.status(404).json({
            message: "User not found",
        });
    }

    return res.json({
        username: user.username,
        content,
    });
}
