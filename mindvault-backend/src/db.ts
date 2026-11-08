import mongoose from "mongoose";
import { MONGO_URI } from "./config.js";

import { UserModel } from "./models/User.js";
import { TagModel } from "./models/Tag.js";
import { CollectionModel } from "./models/Collection.js";
import { ContentModel } from "./models/Content.js";
import { LinkModel } from "./models/Link.js";

export async function connectToDatabase(): Promise<void> {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
}

export {
    UserModel,
    TagModel,
    CollectionModel,
    ContentModel,
    LinkModel,
};
