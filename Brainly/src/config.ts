import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
}

export const JWT_PASSWORD = JWT_SECRET;

export const PORT = Number(process.env.PORT ?? 3000);

export const MONGO_URI =
    process.env.MONGO_URI ?? "mongodb://localhost:27017/brainly";

export const JWT_EXPIRES_IN = "1h";
export const FRONTEND_URL =
    process.env.FRONTEND_URL ?? "http://localhost:5173";