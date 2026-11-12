
import mongoose, { model, Schema } from "mongoose";

import {
    CONTENT_TYPES,
    NOTE_BODY_MAX_LENGTH,
} from "../content-types.js";

const ContentSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        // Empty for notes, which don't need a link. The API validates
        // that every other type has one.
        link: {
            type: String,
            default: "",
            trim: true,
        },

        // The text of a note. Unlike `notes`, this is the content itself
        // and is included on public shared pages.
        body: {
            type: String,
            default: "",
            trim: true,
            maxlength: NOTE_BODY_MAX_LENGTH,
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
            enum: CONTENT_TYPES,
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
