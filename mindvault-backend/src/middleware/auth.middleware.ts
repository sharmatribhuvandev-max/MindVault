
import type {
    NextFunction,
    Request,
    Response,
} from "express";

import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import { JWT_PASSWORD } from "../config.js";
import { UserModel } from "../db.js";

export const userMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const parts = authorization.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer" ||
            !parts[1]
        ) {
            return res.status(401).json({
                message: "Invalid authorization format",
            });
        }

        const token = parts[1];
        const decoded = jwt.verify(token, JWT_PASSWORD);

        if (
            typeof decoded === "string" ||
            typeof decoded.id !== "string" ||
            !mongoose.Types.ObjectId.isValid(decoded.id)
        ) {
            return res.status(401).json({
                message: "Invalid token payload",
            });
        }

        // Reject tokens issued before the user's last logout. Tokens from
        // before tokenVersion existed have no "tv" claim and count as 0.
        let user;

        try {
            user = await UserModel.findById(decoded.id, "tokenVersion");
        } catch (error) {
            // A database failure is a server error, not a bad token.
            return next(error);
        }

        const tokenVersion =
            typeof decoded.tv === "number" ? decoded.tv : 0;

        if (!user || tokenVersion !== (user.tokenVersion ?? 0)) {
            return res.status(401).json({
                message: "Invalid or expired token",
            });
        }

        req.userId = decoded.id;

        return next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};
