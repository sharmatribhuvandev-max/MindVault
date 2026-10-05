import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { BACKEND_URL } from "../config";

export function Signin() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function signin() {
        const username = usernameRef.current?.value.trim();
        const password = passwordRef.current?.value;

        setError("");

        if (!username || !password) {
            setError("Username and password are required");
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                `${BACKEND_URL}/api/v1/signin`,
                {
                    username,
                    password,
                }
            );

            const token = response.data.token;

            localStorage.setItem("token", token);

            navigate("/dashboard");
        } catch (error: any) {
            setError(
                error.response?.data?.message ??
                    "Unable to sign in"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen w-screen bg-gray-200 flex justify-center items-center">
            <div className="bg-white rounded-xl min-w-48 p-8">
                <h1 className="text-2xl font-semibold text-center mb-4">
                    Sign in
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
                        onClick={signin}
                        loading={loading}
                        variant="primary"
                        text={loading ? "Signing in..." : "Signin"}
                        fullWidth={true}
                    />
                </div>
            </div>
        </div>
    );
}