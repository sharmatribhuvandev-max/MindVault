import axios from "axios";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AlternativeSignIn } from "../components/AlternativeSignIn";
import { AuthLayout } from "../components/AuthLayout";
import { authErrorBox, authLink, authPrimaryButton } from "../authStyles";
import { Input } from "../components/Input";
import { BACKEND_URL } from "../config";

type SignupResponse = {
    message?: string;
};

type SignupErrorResponse = {
    message?: string;
};

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

            const response = await axios.post<SignupResponse>(
                `${BACKEND_URL}/api/v1/signup`,
                {
                    username,
                    password,
                }
            );

            if (
                !response.data ||
                typeof response.data.message !== "string" ||
                response.data.message.trim().length === 0
            ) {
                setError(
                    "Your account may have been created, but the server returned an unexpected response. Please try signing in."
                );
                return;
            }

            navigate("/signin");
        } catch (error: unknown) {
            if (axios.isAxiosError<SignupErrorResponse>(error)) {
                const status = error.response?.status;
                const serverMessage = error.response?.data?.message;

                if (status === 409) {
                    setError(
                        serverMessage ||
                        "This username is already taken. Please choose another."
                    );
                } else if (status === 400) {
                    setError(
                        serverMessage ||
                        "Please check your username and password."
                    );
                } else if (error.response) {
                    setError(
                        serverMessage ||
                        "Unable to create your account. Please try again."
                    );
                } else if (error.request) {
                    setError(
                        "Cannot reach the server. Check your connection and try again."
                    );
                } else {
                    setError("Unable to create account. Please try again.");
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
            titleId="signup-title"
            title="Create your account"
            subtitle="Keep your useful links, notes, and ideas together."
        >
            <form className="space-y-4" onSubmit={signup} noValidate>
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
                    {loading ? "Creating account…" : "Create account"}
                </button>
            </form>

            <AlternativeSignIn />

            <p className="mt-8 text-center text-sm text-muted">
                Already have an account?{" "}
                <Link
                    className={authLink}
                    to="/signin"
                >
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
}