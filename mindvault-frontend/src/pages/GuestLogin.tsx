import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-[var(--mindvault-background)] px-4 py-8">
            <section className="w-full max-w-md rounded-2xl border border-[var(--mindvault-border)] bg-white p-6 text-center shadow-xl shadow-slate-200/60 sm:p-9">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--purple-600)]">
                    Mind Vault
                </p>

                {error ? (
                    <>
                        <h1 className="text-xl font-bold text-[var(--mindvault-ink)]">
                            Couldn't open the demo
                        </h1>
                        <p className="mt-2 text-sm text-red-700" role="alert">
                            {error}
                        </p>
                        <Link
                            to="/signin"
                            className="mt-6 inline-block font-semibold text-[var(--purple-600)] underline-offset-4 hover:underline"
                        >
                            Go to sign in
                        </Link>
                    </>
                ) : (
                    <>
                        <h1 className="text-xl font-bold text-[var(--mindvault-ink)]">
                            Setting up your demo…
                        </h1>
                        <p className="mt-2 text-sm text-[var(--mindvault-muted)]" aria-live="polite">
                            Creating a guest account with sample content. This takes a few seconds.
                        </p>
                    </>
                )}
            </section>
        </main>
    );
}
