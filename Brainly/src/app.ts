import express from "express";
import cors from "cors";

import { FRONTEND_URL } from "./config.js";

import authRoutes from "./routes/auth.routes.js";
import tagRoutes from "./routes/tag.routes.js";
import contentRoutes from "./routes/content.routes.js";
import collectionRoutes from "./routes/collection.routes.js";
import shareRoutes from "./routes/share.routes.js";
import publicBrainRoutes from "./routes/public-brain.routes.js";

const app = express();

app.use(express.json());

app.use(
    cors({
        origin: FRONTEND_URL,
    })
);

app.use("/api/v1", authRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/collections", collectionRoutes);
app.use("/api/v1/brain", shareRoutes);
app.use("/api/v1", publicBrainRoutes);

export default app;
