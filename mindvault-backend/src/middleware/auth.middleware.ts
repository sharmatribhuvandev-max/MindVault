
import type {
    NextFunction,
    Request,
    Response,
} from "express";

import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import { JWT_PASSWORD } from "../config.js";

export const userMiddleware = (
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

        req.userId = decoded.id;

        return next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};
