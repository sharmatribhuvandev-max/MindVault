import { useEffect, useState } from "react";
import { CrossIcon } from "../icons/CrossIcon";
import { Button } from "./Button";
import { Input } from "./Input";
import { BACKEND_URL } from "../config";
import axios from "axios";

type ContentType = "youtube" | "twitter";

interface EditContent {
    id: string;
    title: string;
    link: string;
    type: ContentType;
}

interface CreateContentModalProps {
    open: boolean;
    onClose: () => void;
    editContent?: EditContent | null;
    onUpdated?: () => Promise<void> | void;
}

export function CreateContentModal({
    open,
    onClose,
    editContent = null,
    onUpdated,
}: CreateContentModalProps) {
    const [title, setTitle] = useState("");
    const [link, setLink] = useState("");
    const [type, setType] = useState<ContentType>("youtube");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const isEditMode = editContent !== null;

    useEffect(() => {
    if (!open) {
        return;
    }

    if (editContent) {
        setTitle(editContent.title);
        setLink(editContent.link);
        setType(editContent.type);
    } else {
        setTitle("");
        setLink("");
        setType("youtube");
    }

    setError("");
    setLoading(false);
}, [open]);

    async function submitContent() {
        if (!title.trim() || !link.trim()) {
            setError("Title and link are required.");
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            setError("You are not authenticated.");
            return;
        }

        try {
            setError("");
            setLoading(true);

            if (isEditMode) {
                await axios.put(
                    `${BACKEND_URL}/api/v1/content/${editContent.id}`,
                    {
                        title: title.trim(),
                        link: link.trim(),
                        type,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (onUpdated) {
                    await onUpdated();
                }
            } else {
                await axios.post(
                    `${BACKEND_URL}/api/v1/content`,
                    {
                        link: link.trim(),
                        title: title.trim(),
                        type,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            }

            onClose();
        } catch (error) {
            console.error("Failed to save content:", error);

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    setError("Your session has expired. Please sign in again.");
                } else {
                    setError(
                        error.response?.data?.message ||
                        "Failed to save content. Please try again."
                    );
                }
            } else {
                setError("Failed to save content. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {open && (
                <div>
                    <div
                        className="
                            w-screen
                            h-screen
                            bg-slate-500
                            fixed
                            top-0
                            left-0
                            opacity-60
                            flex
                            justify-center
                        "
                    >
                    </div>

                    <div
                        className="
                            w-screen
                            h-screen
                            fixed
                            top-0
                            left-0
                            flex
                            justify-center
                        "
                    >
                        <div className="flex flex-col justify-center">
                            <span className="bg-white opacity-100 p-4 rounded fixed">

                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-semibold">
                                        {isEditMode
                                            ? "Edit Content"
                                            : "Add Content"}
                                    </h2>

                                    <div
                                        onClick={() => {
                                            if (!loading) {
                                                onClose();
                                            }
                                        }}
                                        className={
                                            loading
                                                ? "text-gray-400"
                                                : "cursor-pointer"
                                        }
                                    >
                                        <CrossIcon />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <Input
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                        }}
                                        placeholder="Title"
                                    />

                                    <Input
                                        value={link}
                                        onChange={(e) => {
                                            setLink(e.target.value);
                                        }}
                                        placeholder="Link"
                                    />
                                </div>

                                <div>
                                    <h1>Type</h1>

                                    <div className="flex gap-1 justify-center pb-2">

                                        <Button
                                            text="Youtube"
                                            variant={
                                                type === "youtube"
                                                    ? "primary"
                                                    : "secondary"
                                            }
                                            onClick={() => {
                                                setType("youtube");
                                            }}
                                        />

                                        <Button
                                            text="Twitter"
                                            variant={
                                                type === "twitter"
                                                    ? "primary"
                                                    : "secondary"
                                            }
                                            onClick={() => {
                                                setType("twitter");
                                            }}
                                        />

                                    </div>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm mt-2">
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-center mt-2">
                                    <Button
                                        onClick={submitContent}
                                        variant="primary"
                                        text={
                                            loading
                                                ? isEditMode
                                                    ? "Updating..."
                                                    : "Adding..."
                                                : isEditMode
                                                    ? "Update"
                                                    : "Submit"
                                        }
                                    />
                                </div>

                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}