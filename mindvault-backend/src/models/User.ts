
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

        // Empty for accounts that only sign in with Google or GitHub.
        password: {
            type: String,
            default: "",
        },

        // Provider account IDs for "Continue with Google/GitHub". Left
        // unset (not null) when unused so the sparse unique index skips them.
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },

        githubId: {
            type: String,
            unique: true,
            sparse: true,
        },

        // Incremented on logout. Tokens carry the version they were issued
        // with, so bumping it invalidates every outstanding token at once.
        tokenVersion: {
            type: Number,
            default: 0,
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
