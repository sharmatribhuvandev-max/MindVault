import { useEffect, useRef } from "react";

import { ShareIcon } from "../icons/ShareIcon";

interface CardProps {
    id: string;
    title: string;
    link: string;
    type: "twitter" | "youtube";
    notes?: string;
    isFavorite?: boolean;
    isPinned?: boolean;

    onFavorite?: (
        id: string,
        isFavorite: boolean
    ) => Promise<void>;

    onPin?: (
        id: string,
        isPinned: boolean
    ) => Promise<void>;

    onDelete: (id: string) => Promise<void>;

    isDeleting: boolean;
    isFavoriting?: boolean;
    isPinning?: boolean;

    onEdit: (id: string) => void;

    isPublic?: boolean;
}

function getYouTubeEmbedUrl(url: string) {
    try {
        const parsedUrl = new URL(url);

        const videoId =
            parsedUrl.searchParams.get("v");

        if (!videoId) {
            return null;
        }

        return `https://www.youtube.com/embed/${videoId}`;
    } catch {
        return null;
    }
}

function getTwitterUrlType(url: string) {
    try {
        const parsedUrl = new URL(url);

        const isTwitter =
            parsedUrl.hostname === "twitter.com" ||
            parsedUrl.hostname ===
            "www.twitter.com" ||
            parsedUrl.hostname === "x.com" ||
            parsedUrl.hostname ===
            "www.x.com";

        if (!isTwitter) {
            return "invalid";
        }

        if (
            parsedUrl.pathname.includes(
                "/status/"
            )
        ) {
            return "post";
        }

        return "profile";
    } catch {
        return "invalid";
    }
}

export function Card({
    id,
    title,
    link,
    type,
    notes = "",
    isFavorite = false,
    isPinned = false,
    onFavorite,
    onPin,
    onDelete,
    isDeleting,
    isFavoriting = false,
    isPinning = false,
    onEdit,
    isPublic = false,
}: CardProps) {
    const twitterContainerRef =
        useRef<HTMLDivElement | null>(
            null
        );

    const youtubeEmbedUrl =
        type === "youtube"
            ? getYouTubeEmbedUrl(link)
            : null;

    const twitterUrlType =
        type === "twitter"
            ? getTwitterUrlType(link)
            : null;

    useEffect(() => {
        if (
            type !== "twitter" ||
            twitterUrlType !== "post" ||
            !twitterContainerRef.current
        ) {
            return;
        }

        const container =
            twitterContainerRef.current;

        container.innerHTML = "";

        const blockquote =
            document.createElement(
                "blockquote"
            );

        blockquote.className =
            "twitter-tweet";

        const linkElement =
            document.createElement("a");

        linkElement.href = link;

        linkElement.textContent =
            "View this post on X";

        blockquote.appendChild(
            linkElement
        );

        container.appendChild(
            blockquote
        );

        const loadTwitterWidget =
            () => {
                const twitter = (
                    window as typeof window & {
                        twttr?: {
                            widgets?: {
                                load: (
                                    element?: HTMLElement
                                ) => void;
                            };
                        };
                    }
                ).twttr;

                if (twitter?.widgets) {
                    twitter.widgets.load(
                        container
                    );
                }
            };

        const existingScript =
            document.querySelector(
                'script[src="https://platform.twitter.com/widgets.js"]'
            );

        if (existingScript) {
            loadTwitterWidget();
        } else {
            const script =
                document.createElement(
                    "script"
                );

            script.src =
                "https://platform.twitter.com/widgets.js";

            script.async = true;

            script.onload =
                loadTwitterWidget;

            document.body.appendChild(
                script
            );
        }

        return () => {
            container.innerHTML = "";
        };
    }, [
        link,
        type,
        twitterUrlType,
    ]);

    const handleFavorite =
        async () => {
            if (
                isFavoriting ||
                isPinning ||
                isDeleting ||
                !onFavorite
            ) {
                return;
            }

            await onFavorite(
                id,
                !isFavorite
            );
        };

    const handlePin = async () => {
        if (
            isFavoriting ||
            isPinning ||
            isDeleting ||
            !onPin
        ) {
            return;
        }

        await onPin(
            id,
            !isPinned
        );
    };

    return (
        <div className="min-w-0 h-full">
            <article className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                <div className="flex flex-col gap-3">
                    <div className="flex min-w-0 items-start gap-2 text-base font-semibold text-slate-900">
                        <span className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true">
                            <ShareIcon />
                        </span>

                        <h2 className="min-w-0 break-words leading-snug">{title}</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <div className="text-slate-500">
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${title} in a new tab`}
                                title="Open original link"
                                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                <ShareIcon />
                            </a>
                        </div>

                        {!isPublic && (
                            <>
                                {/* Favorite */}
                                <button
                                    type="button"
                                    onClick={
                                        handleFavorite
                                    }
                                    disabled={
                                        isFavoriting ||
                                        isPinning ||
                                        isDeleting
                                    }
                                    aria-label={
                                        isFavorite ===
                                            true
                                            ? "Remove from favorites"
                                            : "Add to favorites"
                                    }
                                    title={
                                        isFavorite ===
                                            true
                                            ? "Remove from favorites"
                                            : "Add to favorites"
                                    }
                                    aria-pressed={isFavorite}
                                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-xl text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                    {isFavoriting
                                        ? "..."
                                        : isFavorite ===
                                            true
                                            ? "★"
                                            : "☆"}
                                </button>

                                {/* Pin */}
                                <button
                                    type="button"
                                    onClick={
                                        handlePin
                                    }
                                    disabled={
                                        isFavoriting ||
                                        isPinning ||
                                        isDeleting
                                    }
                                    aria-label={
                                        isPinned ===
                                            true
                                            ? "Unpin content"
                                            : "Pin content"
                                    }
                                    title={
                                        isPinned ===
                                            true
                                            ? "Unpin content"
                                            : "Pin content"
                                    }
                                    aria-pressed={isPinned}
                                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-xl text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                    {isPinning
                                        ? "..."
                                        : isPinned ===
                                            true
                                            ? "📌"
                                            : "📍"}
                                </button>

                                {/* Edit */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        onEdit(
                                            id
                                        )
                                    }
                                    disabled={
                                        isDeleting ||
                                        isFavoriting ||
                                        isPinning
                                    }
                                    className="inline-flex min-h-9 items-center rounded-md px-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                    Edit
                                </button>

                                {/* Delete */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        onDelete(
                                            id
                                        )
                                    }
                                    disabled={
                                        isDeleting ||
                                        isFavoriting ||
                                        isPinning
                                    }
                                    className="inline-flex min-h-9 items-center rounded-md px-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                    {isDeleting
                                        ? "Deleting..."
                                        : "Delete"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="pt-4">
                    {type === "youtube" &&
                        youtubeEmbedUrl && (
                            <iframe
                                key={
                                    youtubeEmbedUrl
                                }
                                className="aspect-video w-full rounded-lg border-0 bg-slate-100"
                                loading="lazy"
                                src={
                                    youtubeEmbedUrl
                                }
                                title={title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                            ></iframe>
                        )}

                    {type === "youtube" &&
                        !youtubeEmbedUrl && (
                            <p className="text-red-500 text-sm">
                                Invalid YouTube link.
                            </p>
                        )}

                    {type === "twitter" &&
                        twitterUrlType ===
                        "post" && (
                            <div
                                ref={
                                    twitterContainerRef
                                }
                                className="min-h-20 min-w-0 max-w-full overflow-hidden [&_iframe]:max-w-full"
                            ></div>
                        )}

                    {type === "twitter" &&
                        twitterUrlType ===
                        "profile" && (
                            <div className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold">
                                        X
                                    </div>

                                    <div className="min-w-0">
                                        <p className="font-semibold">
                                            X Profile
                                        </p>

                                        <p className="text-sm text-gray-500 break-all">
                                            {link}
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-block rounded text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                    Open Profile
                                </a>
                            </div>
                        )}

                    {type === "twitter" &&
                        twitterUrlType ===
                        "invalid" && (
                            <p className="text-red-500 text-sm">
                                Invalid X/Twitter link.
                            </p>
                        )}
                </div>

                {/* Notes: visible only on private dashboard cards */}
                {!isPublic && notes.trim() !== "" && (
                    <div className="mt-4 border-t border-gray-200 pt-3">
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">
                            Notes
                        </h3>

                        <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600" title="Scroll to read longer notes">
                            {notes}
                        </p>
                    </div>
                )}
            </article>
        </div>
    );
}