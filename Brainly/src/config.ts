
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
}

export const JWT_PASSWORD = JWT_SECRET;

export const PORT = Number(process.env.PORT ?? 3000);

const configuredMongoUri = process.env.MONGO_URI;

if (isProduction && !configuredMongoUri) {
    throw new Error("MONGO_URI must be defined in production");
}

export const MONGO_URI =
    configuredMongoUri ?? "mongodb://localhost:27017/brainly";

export const JWT_EXPIRES_IN = "1h";

const configuredFrontendUrl = process.env.FRONTEND_URL;

if (isProduction && !configuredFrontendUrl) {
    throw new Error("FRONTEND_URL must be defined in production");
}

export const FRONTEND_URL =
    configuredFrontendUrl ?? "http://localhost:5173";
