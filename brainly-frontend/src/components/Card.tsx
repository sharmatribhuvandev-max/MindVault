import { useEffect, useRef } from "react";
import { ShareIcon } from "../icons/ShareIcon";

interface CardProps {
    id: string;
    title: string;
    link: string;
    type: "twitter" | "youtube";
    onDelete: (id: string) => Promise<void>;
    isDeleting: boolean;
    onEdit: (id: string) => void;
}

function getYouTubeEmbedUrl(url: string) {
    try {
        const parsedUrl = new URL(url);
        const videoId = parsedUrl.searchParams.get("v");

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
            parsedUrl.hostname === "www.twitter.com" ||
            parsedUrl.hostname === "x.com" ||
            parsedUrl.hostname === "www.x.com";

        if (!isTwitter) {
            return "invalid";
        }

        if (parsedUrl.pathname.includes("/status/")) {
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
    onDelete,
    isDeleting,
    onEdit,
}: CardProps) {
    const twitterContainerRef = useRef<HTMLDivElement | null>(null);

    const youtubeEmbedUrl =
        type === "youtube" ? getYouTubeEmbedUrl(link) : null;

    const twitterUrlType =
        type === "twitter" ? getTwitterUrlType(link) : null;

    useEffect(() => {
        if (
            type !== "twitter" ||
            twitterUrlType !== "post" ||
            !twitterContainerRef.current
        ) {
            return;
        }

        const container = twitterContainerRef.current;

        // Remove anything left from the previous Twitter widget.
        container.innerHTML = "";

        // Create the blockquote outside React's DOM tree management.
        const blockquote = document.createElement("blockquote");

        blockquote.className = "twitter-tweet";

        const linkElement = document.createElement("a");

        linkElement.href = link;
        linkElement.textContent = "View this post on X";

        blockquote.appendChild(linkElement);
        container.appendChild(blockquote);

        const loadTwitterWidget = () => {
            const twitter = (
                window as typeof window & {
                    twttr?: {
                        widgets?: {
                            load: (element?: HTMLElement) => void;
                        };
                    };
                }
            ).twttr;

            if (twitter?.widgets) {
                twitter.widgets.load(container);
            }
        };

        const existingScript = document.querySelector(
            'script[src="https://platform.twitter.com/widgets.js"]'
        );

        if (existingScript) {
            loadTwitterWidget();
        } else {
            const script = document.createElement("script");

            script.src = "https://platform.twitter.com/widgets.js";
            script.async = true;

            script.onload = loadTwitterWidget;

            document.body.appendChild(script);
        }

        return () => {
            container.innerHTML = "";
        };
    }, [link, type, twitterUrlType]);

    return (
        <div>
            <div className="p-4 bg-white rounded-md border-gray-200 max-w-72 border min-h-48 min-w-72">
                <div className="flex justify-between">
                    <div className="flex items-center text-md">
                        <div className="text-gray-500 pr-2">
                            <ShareIcon />
                        </div>

                        {title}
                    </div>

                    <div className="flex items-center">
                        <div className="pr-2 text-gray-500">
                            <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ShareIcon />
                            </a>
                        </div>

                        <button
                            type="button"
                            onClick={() => onEdit(id)}
                            disabled={isDeleting}
                            className="pr-2 text-sm text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            onClick={() => onDelete(id)}
                            disabled={isDeleting}
                            className="text-sm text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    {/* YouTube */}
                    {type === "youtube" && youtubeEmbedUrl && (
                        <iframe
                            key={youtubeEmbedUrl}
                            className="w-full"
                            src={youtubeEmbedUrl}
                            title={title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    )}

                    {type === "youtube" && !youtubeEmbedUrl && (
                        <p className="text-red-500 text-sm">
                            Invalid YouTube link.
                        </p>
                    )}

                    {/* X/Twitter post */}
                    {type === "twitter" &&
                        twitterUrlType === "post" && (
                            <div
                                ref={twitterContainerRef}
                                className="min-h-20"
                            ></div>
                        )}

                    {/* X/Twitter profile */}
                    {type === "twitter" &&
                        twitterUrlType === "profile" && (
                            <div className="border rounded-md p-4">
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
                                    rel="noreferrer"
                                    className="inline-block mt-3 text-blue-500 hover:text-blue-700"
                                >
                                    Open Profile
                                </a>
                            </div>
                        )}

                    {/* Invalid X/Twitter URL */}
                    {type === "twitter" &&
                        twitterUrlType === "invalid" && (
                            <p className="text-red-500 text-sm">
                                Invalid X/Twitter link.
                            </p>
                        )}
                </div>
            </div>
        </div>
    );
}
