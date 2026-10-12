
import mongoose, { model, Schema } from "mongoose";

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

        isFavorite: {
            type: Boolean,
            default: false,
        },

        isPinned: {
            type: Boolean,
            default: false,
        },

        collectionId: {
            type: mongoose.Types.ObjectId,
            ref: "Collection",
            default: null,
        },

        notes: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000,
        },
    },
    {
        timestamps: true,
    }
);

export const ContentModel = model(
    "Content",
    ContentSchema
);
