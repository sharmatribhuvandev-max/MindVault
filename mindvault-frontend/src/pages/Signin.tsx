
import axios from "axios";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { GuestButton } from "../components/GuestButton";
import { Input } from "../components/Input";
import { clearGuestSession } from "../guestSession";
import { BACKEND_URL } from "../config";

export function Signin() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function signin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const username = usernameRef.current?.value.trim();
        const password = passwordRef.current?.value;

        setError("");

        if (!username || !password) {
            setError("Username and password are required");
            return;
        }

        if (username.length < 3 || username.length > 30) {
            setError("Username must be between 3 and 30 characters");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post<{
                token?: unknown;
            }>(`${BACKEND_URL}/api/v1/signin`, {
                username,
                password,
            });

            const token = response.data?.token;

            if (typeof token !== "string" || token.trim() === "") {
                setError("Invalid response from server. Please try again.");
                return;
            }

            localStorage.setItem("token", token);
            clearGuestSession();
            navigate("/dashboard");
        } catch (error: unknown) {
            if (axios.isAxiosError<{ message?: string }>(error)) {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    setError("Incorrect username or password");
                } else if (error.response?.data?.message) {
                    setError(error.response.data.message);
                } else if (error.response) {
                    setError("Unable to sign in. Please try again.");
                } else {
                    setError("Cannot connect to the server. Check that the backend is running.");
                }
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-[var(--mindvault-background)] px-4 py-8 sm:px-6">
            <section
                aria-labelledby="signin-title"
                className="w-full max-w-md rounded-2xl border border-[var(--mindvault-border)] bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9"
            >
                <div className="mb-8 text-center">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--purple-600)]">
                        Mind Vault
                    </p>
                    <h1
                        id="signin-title"
                        className="text-2xl font-bold tracking-tight text-[var(--mindvault-ink)] sm:text-3xl"
                    >
                        Welcome back
                    </h1>
                    <p className="mt-2 text-sm text-[var(--mindvault-muted)]">
                        Sign in to get back to your saved knowledge.
                    </p>
                </div>

                <form className="space-y-5" onSubmit={signin} noValidate>
                    <Input
                        id="signin-username"
                        label="Username"
                        reference={usernameRef}
                        placeholder="Enter your username"
                        required
                        autoComplete="username"
                    />
                    <Input
                        id="signin-password"
                        label="Password"
                        reference={passwordRef}
                        placeholder="Enter your password"
                        type="password"
                        required
                        autoComplete="current-password"
                    />

                    {error && (
                        <p
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--purple-600)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mindvault-focus)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </form>

                <GuestButton />

                <p className="mt-6 text-center text-sm text-[var(--mindvault-muted)]">
                    Don&apos;t have an account?{" "}
                    <Link
                        className="font-semibold text-[var(--purple-600)] underline-offset-4 hover:underline"
                        to="/signup"
                    >
                        Create one
                    </Link>
                </p>
            </section>
        </main>
    );
}