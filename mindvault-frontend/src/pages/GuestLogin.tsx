import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authErrorBox, authLink } from "../authStyles";
import { AuthLayout } from "../components/AuthLayout";
import { startGuestSession } from "../guestSession";

// Visiting /guest signs straight into a fresh demo account. Handy as a
// one-click link on a resume or portfolio.
export function GuestLogin() {
    const navigate = useNavigate();
    const [error, setError] = useState("");

    // React StrictMode runs effects twice in development; make sure we
    // only create one guest account per visit.
    const started = useRef(false);

    useEffect(() => {
        if (started.current) {
            return;
        }

        started.current = true;

        startGuestSession()
            .then(() => navigate("/dashboard", { replace: true }))
            .catch((caught: unknown) => {
                setError(
                    caught instanceof Error
                        ? caught.message
                        : "Couldn't start a guest session. Please try again."
                );
            });
    }, [navigate]);

    return error ? (
        <AuthLayout
            titleId="guest-title"
            title="Couldn't open the demo"
            subtitle=""
        >
            <p className={authErrorBox} role="alert">
                {error}
            </p>
            <Link to="/signin" className={`mt-6 inline-block text-sm ${authLink}`}>
                Go to sign in
            </Link>
        </AuthLayout>
    ) : (
        <AuthLayout
            titleId="guest-title"
            title="Setting up your demo…"
            subtitle=""
        >
            <p className="text-sm text-muted" aria-live="polite">
                Creating a guest account with sample content. This takes a few seconds.
            </p>
            <div className="mt-6 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
            </div>
        </AuthLayout>
    );
}
