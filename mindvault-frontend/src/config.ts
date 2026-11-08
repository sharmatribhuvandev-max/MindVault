const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const BACKEND_URL =
    configuredApiUrl || "http://localhost:3000";
