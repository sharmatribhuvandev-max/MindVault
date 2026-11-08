
import mongoose, { model, Schema } from "mongoose";

const CollectionSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 50,
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

CollectionSchema.index(
    {
        userId: 1,
        name: 1,
    },
    {
        unique: true,
    }
);

export const CollectionModel = model(
    "Collection",
    CollectionSchema
);
