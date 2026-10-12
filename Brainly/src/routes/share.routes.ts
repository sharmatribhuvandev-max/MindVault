
import { Router } from "express";

import { userMiddleware } from "../middleware/auth.middleware.js";
import { shareBrain } from "../controllers/share.controller.js";

const router = Router();

router.post("/share", userMiddleware, shareBrain);

export default router;
