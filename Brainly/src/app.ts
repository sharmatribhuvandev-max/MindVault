
import express from "express";
import cors from "cors";
import type { ErrorRequestHandler } from "express";

import { FRONTEND_URL, TRUST_PROXY } from "./config.js";

import authRoutes from "./routes/auth.routes.js";
import tagRoutes from "./routes/tag.routes.js";
import contentRoutes from "./routes/content.routes.js";
import collectionRoutes from "./routes/collection.routes.js";
import shareRoutes from "./routes/share.routes.js";
import publicBrainRoutes from "./routes/public-brain.routes.js";

const app = express();

app.set("trust proxy", TRUST_PROXY);

// Middleware
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL }));

// API routes
app.use("/api/v1", authRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/collections", collectionRoutes);
app.use("/api/v1/brain", shareRoutes);
app.use("/api/v1", publicBrainRoutes);

// Handle unknown routes
app.use((_req, res) => {
    return res.status(404).json({
        message: "Route not found",
    });
});

// Centralized error handler
const errorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    next
) => {
    // Let Express handle the error if the response has already started.
    if (res.headersSent) {
        return next(error);
    }

    // Handle invalid or malformed JSON sent in a request.
    if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        error.type === "entity.parse.failed"
    ) {
        return res.status(400).json({
            message: "Invalid JSON in request body",
        });
    }

    // Log unexpected errors for debugging.
    console.error("Unhandled API error:", error);

    // Do not expose internal error details to the client.
    return res.status(500).json({
        message: "Internal server error",
    });
};

app.use(errorHandler);

export default app;
