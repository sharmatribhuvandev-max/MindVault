import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Link2Off } from "lucide-react";
import { BACKEND_URL } from "../config";
import { Card } from "../components/Card";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { isContentType, type ContentType } from "../contentTypes";

interface SharedContent {
    _id: string;
    title: string;
    link: string;
    type: ContentType;
    body?: string;
    tags?: string[];
}

interface SharedBrainResponse {
    username: string;
    content: SharedContent[];
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
        (item.body === undefined || typeof item.body === "string") &&
        isContentType(item.type)
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

            } catch (error: unknown) {
                console.error("Failed to fetch shared Brain:", error);

                if (axios.isAxiosError(error)) {
                    if (error.response?.status === 404) {
                        setError("Shared Brain Not Found");
                    } else if (error.response) {
                        setError("Unable to load shared Brain. Please try again later.");
                    } else if (error.request) {
                        setError(
                            "Unable to connect to the server. Check your connection and try again."
                        );
                    } else {
                        setError("An unexpected error occurred while loading Shared Brain.");
                    }
                } else {
                    setError("An unexpected error occurred while loading Shared Brain.");
                }
            } finally {
                setLoading(false);
            }

        };

        fetchSharedBrain();
    }, [hash]);

    // Show whose Brain this is in the browser tab.
    useEffect(() => {
        if (!brain) {
            return;
        }

        const previousTitle = document.title;
        document.title = `${brain.username}'s Brain · Mind Vault`;

        return () => {
            document.title = previousTitle;
        };
    }, [brain]);

    const topBar = (
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                <Link to="/signin" aria-label="Mind Vault home">
                    <Logo />
                </Link>
                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <Link
                        to="/signup"
                        className="ml-1 hidden h-8 items-center rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-ink shadow-soft transition-colors hover:bg-accent-hover sm:inline-flex"
                    >
                        Create your own Brain
                    </Link>
                </div>
            </div>
        </header>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-canvas">
                {topBar}
                <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
                    <p className="sr-only">Loading shared Brain...</p>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 animate-pulse rounded-full bg-surface-2" />
                        <div className="space-y-2">
                            <div className="h-5 w-48 animate-pulse rounded bg-surface-2" />
                            <div className="h-3.5 w-32 animate-pulse rounded bg-surface-2" />
                        </div>
                    </div>
                    <div className="content-grid mt-10">
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="h-56 animate-pulse rounded-xl border border-line bg-surface" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }


    if (error || !brain) {
        const isNotFound =
            !error || error === "Shared Brain Not Found";

        return (
            <div className="flex min-h-screen flex-col bg-canvas">
                {topBar}
                <div className="flex flex-1 items-center justify-center px-4 pb-16">
                    <div className="max-w-sm text-center">
                        <span className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted">
                            <Link2Off className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h1 className="text-lg font-semibold text-ink">
                            {isNotFound
                                ? "Shared Brain Not Found"
                                : "Unable to Load Shared Brain"}
                        </h1>

                        <p className="mt-1.5 text-sm text-muted" role="alert">
                            {error ||
                                "This link may be invalid or sharing may have been disabled."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-canvas">
            {topBar}

            <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
                <header className="mb-8 flex items-center gap-4">
                    <span
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent-text"
                        aria-hidden="true"
                    >
                        {brain.username.charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0">
                        <h1 className="break-words text-2xl font-semibold tracking-[-0.025em] text-ink">
                            {brain.username}'s Brain
                        </h1>

                        <p className="mt-0.5 text-sm text-muted">
                            Shared by{" "}
                            <span className="font-medium text-ink-2">
                                {brain.username}
                            </span>
                            {" · "}
                            {brain.content.length}{" "}
                            {brain.content.length === 1 ? "item" : "items"}
                        </p>
                    </div>
                </header>

                {brain.content.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
                        <p className="text-sm text-muted">
                            No shared content yet.
                        </p>
                    </div>
                ) : (
                    <section className="content-grid" aria-label="Shared content">
                        {brain.content.map((item) => (
                            <Card
                                key={item._id}
                                id={item._id}
                                type={item.type}
                                link={item.link}
                                title={item.title}
                                body={item.body || ""}
                                onDelete={async () => { }}
                                isDeleting={false}
                                onEdit={() => { }}
                                isPublic={true}
                            />
                        ))}
                    </section>
                )}

                <footer className="mt-14 flex flex-col items-center gap-3 border-t border-line pt-8 text-center">
                    <p className="text-sm text-muted">
                        Keep your own links, videos and notes in one place.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink shadow-soft transition-colors hover:bg-surface-2"
                    >
                        Create your own Brain
                    </Link>
                </footer>
            </div>
        </div>
    );
}
