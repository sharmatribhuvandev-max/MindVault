import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/**
 * Limits failed sign-in attempts per IP to slow password guessing.
 * Successful sign-ins do not count toward the limit.
 */
export const signinLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many failed sign-in attempts. Please try again in 15 minutes.",
    },
});

/**
 * Limits OAuth sign-in redirects and callbacks per IP.
 */
export const oauthLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many sign-in attempts. Please try again in 15 minutes.",
    },
});

/**
 * Limits guest (demo) account creation per IP. Each guest account is
 * seeded with sample content, so this also caps database writes.
 */
export const guestLimiter = rateLimit({
    windowMs: ONE_HOUR,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many guest sessions from this network. Please try again later.",
    },
});

/**
 * Limits account creation per IP to curb automated sign-ups.
 */
export const signupLimiter = rateLimit({
    windowMs: ONE_HOUR,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message:
            "Too many accounts created from this network. Please try again later.",
    },
});
