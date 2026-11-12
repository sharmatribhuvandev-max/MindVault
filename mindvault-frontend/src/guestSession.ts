import axios from "axios";

import { BACKEND_URL } from "./config";

// localStorage key holding the guest account's expiry (ISO date) while
// the current session is a guest/demo session.
const GUEST_KEY = "guestExpiresAt";

export function isGuestSession(): boolean {
    try {
        return localStorage.getItem(GUEST_KEY) !== null;
    } catch {
        return false;
    }
}

export function clearGuestSession() {
    localStorage.removeItem(GUEST_KEY);
}

// Creates a temporary demo account on the server and signs in as it.
// Throws a user-facing message on failure.
export async function startGuestSession(): Promise<void> {
    try {
        const response = await axios.post<{
            token?: unknown;
            expiresAt?: unknown;
        }>(`${BACKEND_URL}/api/v1/guest`);

        const { token, expiresAt } = response.data ?? {};

        if (typeof token !== "string" || token === "") {
            throw new Error("Invalid response from server. Please try again.");
        }

        localStorage.setItem("token", token);
        localStorage.setItem(
            GUEST_KEY,
            typeof expiresAt === "string" ? expiresAt : ""
        );
    } catch (error: unknown) {
        if (axios.isAxiosError<{ message?: string }>(error)) {
            throw new Error(
                error.response?.data?.message ??
                    (error.response
                        ? "Couldn't start a guest session. Please try again."
                        : "Cannot connect to the server. Please try again in a moment."),
                { cause: error }
            );
        }

        throw error instanceof Error
            ? error
            : new Error("Couldn't start a guest session. Please try again.", {
                cause: error,
            });
    }
}
