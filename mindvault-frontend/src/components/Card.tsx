import { useEffect, useRef, useState, type ReactElement } from "react";
import { ArrowUpRight, Lock, Pencil, Pin, Star, Trash2 } from "lucide-react";

import { ArticleIcon } from "../icons/ArticleIcon";
import {
    CONTENT_TYPE_LABELS,
    getDisplayDomain,
    type ContentType,
} from "../contentTypes";
import { useTheme } from "../theme";
import { ContentTypeIcon } from "./ContentTypeIcon";
import {
    GitHubEmbed,
    InstagramEmbed,
    LinkCard,
    LinkedInEmbed,
} from "./Embeds";

// Notes longer than this are collapsed behind "Show more".
const NOTE_PREVIEW_CHARS = 360;
const NOTE_PREVIEW_LINES = 9;

interface CardProps {
    id: string;
    title: string;
    link: string;
    type: ContentType;
    notes?: string;
    body?: string;
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

function getYouTubeEmbedUrl(url: string): string | null {
    try {
        const parsedUrl = new URL(url);
        let videoId: string | null = null;

        if (
            parsedUrl.hostname === "youtu.be" ||
            parsedUrl.hostname === "www.youtu.be"
        ) {
            videoId = parsedUrl.pathname.split("/")[1] || null;
        } else if (
            [
                "youtube.com",
                "www.youtube.com",
                "m.youtube.com",
                "music.youtube.com",
            ].includes(parsedUrl.hostname)
        ) {
            if (parsedUrl.pathname === "/watch") {
                videoId = parsedUrl.searchParams.get("v");
            } else {
                const match = parsedUrl.pathname.match(
                    /^\/(embed|shorts|live)\/([^/]+)/
                );

                videoId = match?.[2] ?? null;
            }
        }

        if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
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
    body = "",
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
    const [noteExpanded, setNoteExpanded] = useState(false);
    const { resolved: resolvedTheme } = useTheme();

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

        // Match the X widget to the app theme.
        blockquote.dataset.theme = resolvedTheme;

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
        resolvedTheme,
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

    const domain = link ? getDisplayDomain(link) : null;
    const actionsDisabled = isDeleting || isFavoriting || isPinning;
    const noteIsLong =
        body.length > NOTE_PREVIEW_CHARS ||
        body.split("\n").length > NOTE_PREVIEW_LINES;

    return (
        <div className="min-w-0">
            <article className="content-card flex min-w-0 flex-col rounded-xl border border-line bg-surface shadow-soft transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised">
                {/* Meta row: type + source, with actions on the right */}
                <div className="flex min-h-11 items-center gap-2 py-1.5 pl-4 pr-1.5">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted [&_svg]:h-3.5 [&_svg]:w-3.5">
                        <span className="shrink-0" aria-hidden="true">
                            <ContentTypeIcon type={type} />
                        </span>
                        <span className="shrink-0 font-medium text-ink-2">
                            {CONTENT_TYPE_LABELS[type]}
                        </span>
                        {domain && type !== "article" && (
                            <span className="truncate">· {domain}</span>
                        )}
                    </span>

                    <div className="flex shrink-0 items-center">
                        {!isPublic && (
                            <>
                                <span className="card-hover-actions flex items-center">
                                    <IconButton
                                        label="Edit"
                                        onClick={() => onEdit(id)}
                                        disabled={actionsDisabled}
                                    >
                                        <Pencil />
                                    </IconButton>

                                    <IconButton
                                        label={isDeleting ? "Deleting..." : "Delete"}
                                        title="Delete"
                                        onClick={() => onDelete(id)}
                                        disabled={actionsDisabled}
                                        tone="danger"
                                    >
                                        <Trash2 />
                                    </IconButton>
                                </span>

                                <span className={isPinned ? "flex" : "card-hover-actions flex"}>
                                    <IconButton
                                        label={isPinned ? "Unpin content" : "Pin content"}
                                        onClick={handlePin}
                                        disabled={actionsDisabled}
                                        pressed={isPinned}
                                        busy={isPinning}
                                    >
                                        <Pin className={isPinned ? "fill-current text-accent-text" : ""} />
                                    </IconButton>
                                </span>

                                <span className={isFavorite ? "flex" : "card-hover-actions flex"}>
                                    <IconButton
                                        label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                                        onClick={handleFavorite}
                                        disabled={actionsDisabled}
                                        pressed={isFavorite}
                                        busy={isFavoriting}
                                    >
                                        <Star className={isFavorite ? "fill-current text-star" : ""} />
                                    </IconButton>
                                </span>
                            </>
                        )}

                        {link && (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${title} in a new tab`}
                                title="Open original link"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                            >
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col px-4 pb-4">
                    <h2 className="mb-3 break-words text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                        {title}
                    </h2>

                    {type === "youtube" && youtubeEmbedUrl && (
                        <iframe
                            key={youtubeEmbedUrl}
                            className="aspect-video w-full rounded-lg border-0 bg-surface-2"
                            loading="lazy"
                            src={youtubeEmbedUrl}
                            title={title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    )}

                    {type === "youtube" && !youtubeEmbedUrl && (
                        <p className="text-sm text-danger">
                            Invalid YouTube link.
                        </p>
                    )}

                    {type === "twitter" && twitterUrlType === "post" && (
                        <div>
                            <div
                                ref={twitterContainerRef}
                                className="min-w-0 max-w-full overflow-hidden [&_blockquote]:m-0 [&_blockquote]:rounded-lg [&_blockquote]:border [&_blockquote]:border-line [&_blockquote]:p-3 [&_blockquote]:text-sm [&_blockquote_a]:font-medium [&_blockquote_a]:text-accent-text [&_iframe]:max-w-full"
                            ></div>
                            {/* The X widget is often blocked (privacy settings,
                                content blockers), so always offer the link. */}
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                            >
                                Not loading? Open on X
                            </a>
                        </div>
                    )}

                    {type === "twitter" && twitterUrlType === "profile" && (
                        <div className="min-w-0 rounded-lg border border-line p-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-canvas">
                                    X
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-ink">
                                        X Profile
                                    </p>

                                    <p className="truncate text-xs text-muted">
                                        {link}
                                    </p>
                                </div>
                            </div>

                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-sm font-medium text-accent-text underline-offset-2 hover:underline"
                            >
                                Open Profile
                            </a>
                        </div>
                    )}

                    {type === "article" && (
                        <LinkCard
                            href={link}
                            icon={<ArticleIcon />}
                            primary={getDisplayDomain(link) ?? link}
                            secondary="Read article →"
                        />
                    )}

                    {type === "github" && <GitHubEmbed link={link} />}

                    {type === "instagram" && (
                        <InstagramEmbed link={link} title={title} />
                    )}

                    {type === "linkedin" && (
                        <LinkedInEmbed link={link} title={title} />
                    )}

                    {type === "note" && (
                        <div className="rounded-lg border border-note-line bg-note">
                            <p
                                id={`note-body-${id}`}
                                className={`whitespace-pre-wrap break-words px-3.5 pt-3 text-[13.5px] leading-relaxed text-ink-2 ${
                                    noteIsLong && !noteExpanded
                                        ? "max-h-48 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
                                        : "pb-3"
                                }`}
                            >
                                {body}
                            </p>
                            {noteIsLong && (
                                <button
                                    type="button"
                                    onClick={() => setNoteExpanded((current) => !current)}
                                    aria-expanded={noteExpanded}
                                    aria-controls={`note-body-${id}`}
                                    className="mx-2 mb-1.5 rounded px-1.5 py-1 text-xs font-medium text-accent-text hover:underline"
                                >
                                    {noteExpanded ? "Show less" : "Show more"}
                                </button>
                            )}
                        </div>
                    )}

                    {type === "twitter" && twitterUrlType === "invalid" && (
                        <p className="text-sm text-danger">
                            Invalid X/Twitter link.
                        </p>
                    )}

                    {/* Notes: visible only on private dashboard cards */}
                    {!isPublic && notes.trim() !== "" && (
                        <div className="mt-auto pt-3">
                            <div className="border-t border-line pt-3">
                                <h3 className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-faint">
                                    <Lock className="h-3 w-3" aria-hidden="true" />
                                    Notes
                                </h3>

                                <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted" title="Scroll to read longer notes">
                                    {notes}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </article>
        </div>
    );
}

// Compact icon-only action button used in the card's header.
function IconButton({
    label,
    title,
    onClick,
    disabled,
    pressed,
    busy = false,
    tone = "default",
    children,
}: {
    label: string;
    title?: string;
    onClick: () => void;
    disabled?: boolean;
    pressed?: boolean;
    busy?: boolean;
    tone?: "default" | "danger";
    children: ReactElement;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            aria-busy={busy || undefined}
            title={title ?? label}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 ${
                tone === "danger"
                    ? "hover:bg-danger-soft hover:text-danger"
                    : "hover:bg-surface-2 hover:text-ink"
            } ${busy ? "animate-pulse" : ""}`}
        >
            {children}
        </button>
    );
}
