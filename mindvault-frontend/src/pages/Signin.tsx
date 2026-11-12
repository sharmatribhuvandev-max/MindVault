
import axios from "axios";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AlternativeSignIn } from "../components/AlternativeSignIn";
import { AuthLayout } from "../components/AuthLayout";
import { authErrorBox, authLink, authPrimaryButton } from "../authStyles";
import { Input } from "../components/Input";
import { clearGuestSession } from "../guestSession";
import { oauthErrorMessage } from "../oauth";
import { BACKEND_URL } from "../config";

export function Signin() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();

    // Shown when Google/GitHub sign-in redirects back with ?error=...
    const [error, setError] = useState(() =>
        oauthErrorMessage(searchParams.get("error"))
    );

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
        <AuthLayout
            titleId="signin-title"
            title="Welcome back"
            subtitle="Sign in to get back to your saved knowledge."
        >
            <form className="space-y-4" onSubmit={signin} noValidate>
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
                        className={authErrorBox}
                        role="alert"
                    >
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={authPrimaryButton}
                >
                    {loading ? "Signing in…" : "Sign in"}
                </button>
            </form>

            <AlternativeSignIn />

            <p className="mt-8 text-center text-sm text-muted">
                Don&apos;t have an account?{" "}
                <Link
                    className={authLink}
                    to="/signup"
                >
                    Create one
                </Link>
            </p>
        </AuthLayout>
    );
}