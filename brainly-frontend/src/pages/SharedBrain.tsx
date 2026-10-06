import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BACKEND_URL } from "../config";
import { Card } from "../components/Card";

type SharedContentType = "twitter" | "youtube";

interface SharedContent {
    _id: string;
    title: string;
    link: string;
    type: SharedContentType;
    tags?: string[];
}

interface SharedBrainResponse {
    username: string;
    content: SharedContent[];
}

function isValidContentType(
    type: unknown
): type is SharedContentType {
    return type === "twitter" || type === "youtube";
}

function isValidSharedContent(
    content: unknown
): content is SharedContent {
    if (!content || typeof content !== "object") {
        return false;
    }

    const item = content as Record<string, unknown>;

    return (
        typeof item._id === "string" &&
        typeof item.title === "string" &&
        typeof item.link === "string" &&
        isValidContentType(item.type)
    );
}

export function SharedBrain() {
    const { hash } = useParams<{ hash: string }>();

    const [brain, setBrain] =
        useState<SharedBrainResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchSharedBrain = async () => {
            if (!hash) {
                setError("Shared Brain Not Found");
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(
                    `${BACKEND_URL}/api/v1/${hash}`
                );

                if (
                    !response.data ||
                    typeof response.data.username !== "string" ||
                    !Array.isArray(response.data.content)
                ) {
                    setError("Unable to load shared Brain.");
                    return;
                }

                const validContent =
                    response.data.content.every(
                        isValidSharedContent
                    );

                if (!validContent) {
                    setError("Unable to load shared Brain.");
                    return;
                }

                setBrain({
                    username: response.data.username,
                    content: response.data.content,
                });
            } catch (error) {
                console.error(
                    "Failed to fetch shared Brain:",
                    error
                );
                setError("Shared Brain Not Found");
            } finally {
                setLoading(false);
            }
        };

        fetchSharedBrain();
    }, [hash]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">
                    Loading shared Brain...
                </p>
            </div>
        );
    }

    if (error || !brain) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-gray-800">
                        Shared Brain Not Found
                    </h1>

                    <p className="mt-2 text-gray-500">
                        This link may be invalid or sharing may have
                        been disabled.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-6 py-10">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Shared Brain
                    </h1>

                    <p className="mt-2 text-gray-600">
                        {brain.username}'s Brain
                    </p>
                </div>

                {brain.content.length === 0 ? (
                    <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
                        <p className="text-gray-500">
                            No shared content yet.
                        </p>
                    </div>
                ) : (
                    <div>
                        <h2 className="mb-4 text-xl font-semibold text-gray-800">
                            Content
                        </h2>

                        <div className="flex flex-wrap gap-6">
                            {brain.content.map((item) => (
                                <Card
                                    key={item._id}
                                    id={item._id}
                                    type={item.type}
                                    link={item.link}
                                    title={item.title}
                                    onDelete={async () => {}}
                                    isDeleting={false}
                                    onEdit={() => {}}
                                    isPublic={true}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}