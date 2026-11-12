
import { model, Schema } from "mongoose";

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

        // Incremented on logout. Tokens carry the version they were issued
        // with, so bumping it invalidates every outstanding token at once.
        tokenVersion: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export const UserModel = model("User", UserSchema);
