
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

import { BACKEND_URL } from "../config";

export function useContent() {
    const [contents, setContents] = useState<any[]>([]);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                setError("You are not authenticated. Please sign in.");
                setContents([]);
                return;
            }

            const response = await axios.get(
                `${BACKEND_URL}/api/v1/content`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (
                !response.data ||
                !Array.isArray(response.data.content)
            ) {
                setError("The server returned an invalid content response.");
                return;
            }

            setContents(response.data.content);
            setError("");
        } catch (error: unknown) {
            console.error("Failed to fetch content:", error);

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    setError("Your session has expired. Please sign in again.");
                } else if (error.response) {
                    setError(
                        error.response.data?.message ||
                            "Failed to load content. Please try again."
                    );
                } else if (error.request) {
                    setError(
                        "Unable to connect to the server. Check your connection and try again."
                    );
                } else {
                    setError("An unexpected error occurred while loading content.");
                }
            } else {
                setError("An unexpected error occurred while loading content.");
            }
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return {
        contents,
        refresh,
        error,
    };
}
