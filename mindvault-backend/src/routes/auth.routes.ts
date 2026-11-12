
import { Router } from "express";

import {
    signup,
    signin,
} from "../controllers/auth.controller.js";

import { createGuest } from "../controllers/guest.controller.js";
import {
    guestLimiter,
    signinLimiter,
    signupLimiter,
} from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/signup", signupLimiter, signup);
router.post("/signin", signinLimiter, signin);
router.post("/guest", guestLimiter, createGuest);

export default router;
