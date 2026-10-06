import mongoose, { model, Schema } from "mongoose";
import { MONGO_URI } from "./config.js";

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });

const UserSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
        },

        password: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const TagSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            minlength: 1,
            maxlength: 30,
        },

        userId: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

TagSchema.index(
    {
        userId: 1,
        name: 1,
    },
    {
        unique: true,
    }
);

const ContentSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        link: {
            type: String,
            required: true,
            trim: true,
        },

        tags: [
            {
                type: mongoose.Types.ObjectId,
                ref: "Tag",
            },
        ],

        type: {
            type: String,
            required: true,
        },

        userId: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const LinkSchema = new Schema(
    {
        hash: {
            type: String,
            required: true,
        },

        userId: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);

export const UserModel = model("User", UserSchema);

export const TagModel = model("Tag", TagSchema);

export const LinkModel = model("Links", LinkSchema);

export const ContentModel = model("Content", ContentSchema);