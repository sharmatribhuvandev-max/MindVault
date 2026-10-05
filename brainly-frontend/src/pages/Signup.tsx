import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { BACKEND_URL } from "../config";

export function Signup() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function signup() {
        const username = usernameRef.current?.value.trim();
        const password = passwordRef.current?.value;

        setError("");

        if (!username || !password) {
            setError("Username and password are required");
            return;
        }

        if (username.length < 3 || username.length > 30) {
            setError(
                "Username must be between 3 and 30 characters"
            );
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        try {
            setLoading(true);

            await axios.post(
                `${BACKEND_URL}/api/v1/signup`,
                {
                    username,
                    password,
                }
            );

            navigate("/signin");
        } catch (error: any) {
            setError(
                error.response?.data?.message ??
                    "Unable to create account"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen w-screen bg-gray-200 flex justify-center items-center">
            <div className="bg-white rounded-xl min-w-48 p-8">
                <h1 className="text-2xl font-semibold text-center mb-4">
                    Create account
                </h1>

                <Input
                    reference={usernameRef}
                    placeholder="Username"
                />

                <Input
                    reference={passwordRef}
                    placeholder="Password"
                    type="password"
                />

                {error && (
                    <p className="text-red-500 text-sm px-2 py-2">
                        {error}
                    </p>
                )}

                <div className="flex justify-center pt-4">
                    <Button
                        onClick={signup}
                        loading={loading}
                        variant="primary"
                        text={loading ? "Creating..." : "Signup"}
                        fullWidth={true}
                    />
                </div>
            </div>
        </div>
    );
}