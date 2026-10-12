
import { Router } from "express";

import {
    getPublicBrain,
} from "../controllers/public-brain.controller.js";

const router = Router();

router.get("/:shareLink", getPublicBrain);

export default router;
