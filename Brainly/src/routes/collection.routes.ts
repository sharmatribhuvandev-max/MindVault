
import { Router } from "express";

import { userMiddleware } from "../middleware/auth.middleware.js";

import {
    createCollection,
    getCollections,
    deleteCollection,
} from "../controllers/collection.controller.js";

const router = Router();

router.post("/", userMiddleware, createCollection);
router.get("/", userMiddleware, getCollections);
router.delete("/:id", userMiddleware, deleteCollection);

export default router;
