import axios from "axios";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Input } from "../components/Input";
import { BACKEND_URL } from "../config";

export function Signup() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function signup(event: FormEvent<HTMLFormElement>) {
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
            setError("Password must be at least 8 characters");
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${BACKEND_URL}/api/v1/signup`, {
                username,
                password,
            });
            navigate("/signin");
        } catch (error: any) {
            setError(error.response?.data?.message ?? "Unable to create account");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-[var(--brainly-background)] px-4 py-8 sm:px-6">
            <section
                aria-labelledby="signup-title"
                className="w-full max-w-md rounded-2xl border border-[var(--brainly-border)] bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9"
            >
                <div className="mb-8 text-center">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--purple-600)]">
                        Brainly
                    </p>
                    <h1 id="signup-title" className="text-2xl font-bold tracking-tight text-[var(--brainly-ink)] sm:text-3xl">
                        Create your account
                    </h1>
                    <p className="mt-2 text-sm text-[var(--brainly-muted)]">
                        Keep your useful links, notes, and ideas together.
                    </p>
                </div>

                <form className="space-y-5" onSubmit={signup} noValidate>
                    <Input
                        id="signup-username"
                        label="Username"
                        reference={usernameRef}
                        placeholder="Choose a username"
                        required
                        autoComplete="username"
                    />
                    <Input
                        id="signup-password"
                        label="Password"
                        reference={passwordRef}
                        placeholder="Create a password (8+ characters)"
                        type="password"
                        required
                        autoComplete="new-password"
                    />

                    {error && (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--purple-600)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brainly-focus)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-[var(--brainly-muted)]">
                    Already have an account?{" "}
                    <Link className="font-semibold text-[var(--purple-600)] underline-offset-4 hover:underline" to="/signin">
                        Sign in
                    </Link>
                </p>
            </section>
        </main>
    );
}
