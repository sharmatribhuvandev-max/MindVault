import { Router } from "express";

import { userMiddleware } from "../middleware/auth.middleware.js";

import {
    createContent,
    getContent,
    updateContent,
    updateFavorite,
    updatePin,
    deleteContent,
} from "../controllers/content.controller.js";

const router = Router();

router.post("/", userMiddleware, createContent);
router.get("/", userMiddleware, getContent);
router.put("/:id", userMiddleware, updateContent);
router.patch("/:id/favorite", userMiddleware, updateFavorite);
router.patch("/:id/pin", userMiddleware, updatePin);
router.delete("/", userMiddleware, deleteContent);

export default router;