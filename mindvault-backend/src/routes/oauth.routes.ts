import { Router } from "express";

import {
    listProviders,
    oauthCallback,
    startOAuth,
} from "../controllers/oauth.controller.js";
import { oauthLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.get("/providers", listProviders);
router.get("/:provider/start", oauthLimiter, startOAuth);
router.get("/:provider/callback", oauthLimiter, oauthCallback);

export default router;
