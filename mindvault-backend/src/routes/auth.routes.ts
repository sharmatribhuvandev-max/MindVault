
import { Router } from "express";

import {
    signup,
    signin,
} from "../controllers/auth.controller.js";

import {
    signinLimiter,
    signupLimiter,
} from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/signup", signupLimiter, signup);
router.post("/signin", signinLimiter, signin);

export default router;
