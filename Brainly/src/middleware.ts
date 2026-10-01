import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config.js";

export const userMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const header = req.headers["authorization"];

    if (!header) {
        return res.status(403).json({
            message: "No token"
        });
    }

    const decoded = jwt.verify(header, JWT_PASSWORD);

    if (typeof decoded === "string") {
        return res.status(403).json({
            message: "You are not logged in"
        });
    }

    req.userId = (decoded as JwtPayload).id;
    next();
};