import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { clearGuestSession } from "../guestSession";

// Google/GitHub sign-in lands here with our token in the URL fragment
// (#token=...), which browsers never send to a server.
export function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const token = params.get("token");

        // Remove the token from the address bar and history right away.
        window.history.replaceState(null, "", window.location.pathname);

        if (!token) {
            navigate("/signin?error=oauth_failed", { replace: true });
            return;
        }

        localStorage.setItem("token", token);
        clearGuestSession();
        navigate("/dashboard", { replace: true });
    }, [navigate]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--mindvault-background)] px-4">
            <p className="text-sm text-[var(--mindvault-muted)]" aria-live="polite">
                Signing you in…
            </p>
        </main>
    );
}
