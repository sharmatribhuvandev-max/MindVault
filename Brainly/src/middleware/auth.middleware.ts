import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
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

        const [scheme, token] = authorization.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({
                message: "Invalid authorization format",
            });
        }

        const decoded = jwt.verify(token, JWT_PASSWORD);

        if (typeof decoded === "string") {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        const payload = decoded as JwtPayload;

        if (!payload.id) {
            return res.status(401).json({
                message: "Invalid token payload",
            });
        }

        req.userId = payload.id;

        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};