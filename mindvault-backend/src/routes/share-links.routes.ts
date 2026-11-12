import { Router } from "express";

import { userMiddleware } from "../middleware/auth.middleware.js";
import {
    createShareLink,
    deleteShareLink,
    getSharedItems,
    listShareLinks,
} from "../controllers/share-links.controller.js";

// Owner-only management of item/selection share links.
export const shareLinksRouter = Router();

shareLinksRouter.post("/", userMiddleware, createShareLink);
shareLinksRouter.get("/", userMiddleware, listShareLinks);
shareLinksRouter.delete("/:id", userMiddleware, deleteShareLink);

// Public view of a shared item or selection.
export const sharedItemsRouter = Router();

sharedItemsRouter.get("/:hash", getSharedItems);
