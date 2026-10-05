import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { ContentModel, LinkModel, UserModel } from "./db.js";
import {
    JWT_PASSWORD,
    JWT_EXPIRES_IN
} from "./config.js";

import { userMiddleware } from "./middleware.js";
import { random } from "./utils.js";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());


/*
 * =========================
 * SIGN UP
 * =========================
 */

app.post("/api/v1/signup", async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    try {

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        await UserModel.create({
            username: username,
            password: hashedPassword
        });

        res.json({
            message: "User signed up"
        });

    }
    catch (e) {

        res.status(411).json({
            message: "User already exists"
        });
    }
});


/*
 * =========================
 * SIGN IN
 * =========================
 */

app.post("/api/v1/signin", async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    const existingUser = await UserModel.findOne({
        username
    });

    if (!existingUser) {

        return res.status(403).json({
            message: "Incorrect credentials"
        });
    }

    const passwordMatches = await bcrypt.compare(
        password,
        existingUser.password
    );

    if (!passwordMatches) {

        return res.status(403).json({
            message: "Incorrect credentials"
        });
    }

    const token = jwt.sign(
        {
            id: existingUser._id.toString()
        },
        JWT_PASSWORD,
        {
            expiresIn: JWT_EXPIRES_IN
        }
    );

    res.json({
        token
    });
});


/*
 * =========================
 * ADD CONTENT
 * =========================
 */

app.post(
    "/api/v1/content",
    userMiddleware,
    async (req, res) => {

        const link = req.body.link;
        const type = req.body.type;

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        await ContentModel.create({
            link,
            type,
            title: req.body.title,
            userId,
            tags: []
        });

        return res.json({
            message: "Content added"
        });
    }
);


/*
 * =========================
 * GET CONTENT
 * =========================
 */

app.get(
    "/api/v1/content",
    userMiddleware,
    async (req, res) => {

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        const content = await ContentModel.find({
            userId
        }).populate(
            "userId",
            "username"
        );

        res.json({
            content
        });
    }
);


/*
 * =========================
 * DELETE CONTENT
 * =========================
 */

app.delete(
    "/api/v1/content",
    userMiddleware,
    async (req, res) => {

        const contentId = req.body.contentId;

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        await ContentModel.deleteOne({
            _id: contentId,
            userId
        });

        res.json({
            message: "Deleted"
        });
    }
);


/*
 * =========================
 * SHARE BRAIN
 * =========================
 */

app.post(
    "/api/v1/brain/share",
    userMiddleware,
    async (req, res) => {

        const share = req.body.share;

        const userId = new mongoose.Types.ObjectId(
            req.userId!
        );

        if (share) {

            const existingLink = await LinkModel.findOne({
                userId
            });

            if (existingLink) {

                res.json({
                    hash: existingLink.hash
                });

                return;
            }

            const hash = random(10);

            await LinkModel.create({
                userId,
                hash
            });

            res.json({
                hash
            });

        } else {

            await LinkModel.deleteOne({
                userId
            });

            res.json({
                message: "Removed Link"
            });
        }
    }
);


/*
 * =========================
 * GET SHARED BRAIN
 * =========================
 */

app.get(
    "/api/v1/:shareLink",
    async (req, res) => {

        const hash = req.params.shareLink;

        const link = await LinkModel.findOne({
            hash
        });

        if (!link) {
            return res.status(411).json({
                message: "Sorry incorrect input"
            });
        }

        const content = await ContentModel.find({
            userId: link.userId
        });

        console.log(link);

        const user = await UserModel.findOne({
            _id: link.userId
        });

        if (!user) {
            return res.status(411).json({
                message: "User not found"
            });
        }

        res.json({
            username: user.username,
            content: content
        });
    }
);


/*
 * =========================
 * SERVER
 * =========================
 */

app.listen(3000, () => {
    console.log("Server running on port 3000");
});