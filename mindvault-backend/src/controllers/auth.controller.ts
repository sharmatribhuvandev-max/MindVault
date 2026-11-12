
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { UserModel } from "../db.js";
import {
    JWT_PASSWORD,
    JWT_EXPIRES_IN,
} from "../config.js";

export async function signup(
    req: Request,
    res: Response
) {
    const { username, password } = req.body ?? {};

    // Validate username
    if (
        typeof username !== "string" ||
        username.trim().length < 3 ||
        username.trim().length > 30
    ) {
        return res.status(400).json({
            message: "Username must be between 3 and 30 characters",
        });
    }

    // Validate password
    if (
        typeof password !== "string" ||
        password.length < 8
    ) {
        return res.status(400).json({
            message: "Password must be at least 8 characters long",
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        await UserModel.create({
            username: username.trim(),
            password: hashedPassword,
        });

        return res.json({
            message: "User signed up",
        });
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000
        ) {
            return res.status(409).json({
                message: "User already exists",
            });
        }

        console.error("Signup failed:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function signin(
    req: Request,
    res: Response
) {
    const { username, password } = req.body ?? {};

    // Validate username
    if (
        typeof username !== "string" ||
        username.trim().length < 3 ||
        username.trim().length > 30
    ) {
        return res.status(400).json({
            message: "Username must be between 3 and 30 characters",
        });
    }

    // Validate password
    if (
        typeof password !== "string" ||
        password.length < 8
    ) {
        return res.status(400).json({
            message: "Password must be at least 8 characters long",
        });
    }

    try {
        const existingUser = await UserModel.findOne({
            username: username.trim(),
        });

        if (!existingUser) {
            return res.status(401).json({
                message: "Incorrect credentials",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            existingUser.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Incorrect credentials",
            });
        }

        const token = jwt.sign(
            {
                id: existingUser._id.toString(),
                tv: existingUser.tokenVersion ?? 0,
            },
            JWT_PASSWORD,
            {
                expiresIn: JWT_EXPIRES_IN,
            }
        );

        return res.json({
            token,
        });
    } catch (error: unknown) {
        console.error("Signin failed:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function logout(
    req: Request,
    res: Response
) {
    try {
        await UserModel.updateOne(
            { _id: req.userId },
            { $inc: { tokenVersion: 1 } }
        );

        return res.json({
            message: "Logged out",
        });
    } catch (error: unknown) {
        console.error("Logout failed:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
