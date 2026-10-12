
import { Router } from "express";

import { userMiddleware } from "../middleware/auth.middleware.js";

import {
    createTag,
    getTags,
    deleteTag,
} from "../controllers/tag.controller.js";

const router = Router();

router.post("/", userMiddleware, createTag);
router.get("/", userMiddleware, getTags);
router.delete("/:id", userMiddleware, deleteTag);

export default router;
