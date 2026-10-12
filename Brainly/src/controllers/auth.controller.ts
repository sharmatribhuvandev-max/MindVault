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
    const username = req.body.username;
    const password = req.body.password;

    try {
        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        await UserModel.create({
            username: username,
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
            return res.status(411).json({
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
    const username = req.body.username;
    const password = req.body.password;

    const existingUser = await UserModel.findOne({
        username,
    });

    if (!existingUser) {
        return res.status(403).json({
            message: "Incorrect credentials",
        });
    }

    const passwordMatches = await bcrypt.compare(
        password,
        existingUser.password
    );

    if (!passwordMatches) {
        return res.status(403).json({
            message: "Incorrect credentials",
        });
    }

    const token = jwt.sign(
        {
            id: existingUser._id.toString(),
        },
        JWT_PASSWORD,
        {
            expiresIn: JWT_EXPIRES_IN,
        }
    );

    return res.json({
        token,
    });
}
