import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Sparkles } from "lucide-react";

import { authErrorBox, authSecondaryButton } from "../authStyles";
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
        <div>
            <button
                type="button"
                onClick={() => void continueAsGuest()}
                disabled={loading}
                className={authSecondaryButton}
            >
                <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />
                {loading ? "Setting up a demo account…" : "Continue as guest"}
            </button>

            <p className="mt-2 text-center text-xs text-faint">
                No sign-up needed. Explore a demo account with sample content.
            </p>

            {error && (
                <p
                    className={`mt-3 ${authErrorBox}`}
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
