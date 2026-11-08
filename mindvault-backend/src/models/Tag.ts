
import mongoose, { model, Schema } from "mongoose";

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

export const TagModel = model("Tag", TagSchema);
