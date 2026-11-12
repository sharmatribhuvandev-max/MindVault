import mongoose, { model, Schema } from "mongoose";

// A public link to one item ("item") or a hand-picked set ("selection").
// It references content by ID, so the shared page always shows the
// current version and drops items that have been deleted.
const ShareLinkSchema = new Schema(
    {
        hash: {
            type: String,
            required: true,
            unique: true,
            minlength: 12,
            maxlength: 12,
        },

        userId: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        kind: {
            type: String,
            required: true,
            enum: ["item", "selection"],
        },

        // Kept in the order the user picked them.
        contentIds: [
            {
                type: mongoose.Types.ObjectId,
                ref: "Content",
            },
        ],

        title: {
            type: String,
            default: "",
            trim: true,
            maxlength: 100,
        },
    },
    {
        timestamps: true,
    }
);

export const ShareLinkModel = model("ShareLink", ShareLinkSchema);
