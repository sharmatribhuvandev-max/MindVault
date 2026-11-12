
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

        // Temporary demo accounts created by "Continue as guest". They and
        // all their data are deleted once guestExpiresAt has passed.
        isGuest: {
            type: Boolean,
            default: false,
        },

        guestExpiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

UserSchema.index({ isGuest: 1, guestExpiresAt: 1 });

export const UserModel = model("User", UserSchema);
