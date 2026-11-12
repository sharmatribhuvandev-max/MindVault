import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { startGuestSession } from "../guestSession";

export function GuestButton() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function continueAsGuest() {
        setError("");
        setLoading(true);

        try {
            await startGuestSession();
            navigate("/dashboard", { replace: true });
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Couldn't start a guest session. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-5">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--mindvault-muted)]">
                <span className="h-px flex-1 bg-[var(--mindvault-border)]" />
                or
                <span className="h-px flex-1 bg-[var(--mindvault-border)]" />
            </div>

            <button
                type="button"
                onClick={() => void continueAsGuest()}
                disabled={loading}
                className="mt-5 flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--purple-600)] bg-white px-4 py-3 text-sm font-semibold text-[var(--purple-600)] transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mindvault-focus)] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? "Setting up a demo account…" : "Continue as guest"}
            </button>

            <p className="mt-2 text-center text-xs text-[var(--mindvault-muted)]">
                No sign-up needed. Explore a demo account with sample content.
            </p>

            {error && (
                <p
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
