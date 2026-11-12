
import { Router } from "express";

import {
    signup,
    signin,
    logout,
    me,
} from "../controllers/auth.controller.js";
import { userMiddleware } from "../middleware/auth.middleware.js";

import {
    signinLimiter,
    signupLimiter,
} from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/signup", signupLimiter, signup);
router.post("/signin", signinLimiter, signin);
router.post("/logout", userMiddleware, logout);
router.get("/me", userMiddleware, me);

export default router;
