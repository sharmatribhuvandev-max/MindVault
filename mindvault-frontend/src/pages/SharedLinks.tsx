import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    Copy,
    Link2,
    Link2Off,
} from "lucide-react";

import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import {
    deleteShareLink,
    listShareLinks,
    sharedItemsUrl,
    ShareItemsError,
    type ShareLinkInfo,
} from "../shareItems";

function linkHeading(link: ShareLinkInfo): string {
    if (link.title) {
        return link.title;
    }

    if (link.kind === "item") {
        return link.preview?.[0] ?? "Shared item";
    }

    return `${link.itemCount} items`;
}

function formatDate(value?: string): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
}

const actionClass =
    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5";

// Lists the item and selection links the user has shared, with copy,
// open and stop-sharing actions.
export function SharedLinks() {
    const navigate = useNavigate();
    const [links, setLinks] = useState<ShareLinkInfo[] | null>(null);
    const [error, setError] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    function handleError(caught: unknown) {
        if (caught instanceof ShareItemsError && caught.unauthorized) {
            localStorage.removeItem("token");
            navigate("/signin");
            return;
        }

        setError(caught instanceof Error ? caught.message : "Something went wrong.");
    }

    useEffect(() => {
        let ignore = false;

        listShareLinks()
            .then((result) => {
                if (!ignore) {
                    setLinks(result);
                }
            })
            .catch((caught: unknown) => {
                if (!ignore) {
                    setLinks([]);
                    handleError(caught);
                }
            });

        return () => {
            ignore = true;
        };
        // handleError only uses navigate/setError, which are stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function copy(link: ShareLinkInfo) {
        try {
            await navigator.clipboard.writeText(sharedItemsUrl(link.hash));
            setCopiedId(link.id);
        } catch {
            setError("Couldn't copy automatically. Open the link and copy it from the address bar.");
        }
    }

    async function stopSharing(link: ShareLinkInfo) {
        if (
            !window.confirm(
                `Stop sharing "${linkHeading(link)}"? The link will stop working for everyone.`
            )
        ) {
            return;
        }

        setError("");
        setRemovingId(link.id);

        try {
            await deleteShareLink(link.id);
            setLinks((current) => current?.filter((item) => item.id !== link.id) ?? null);
        } catch (caught) {
            handleError(caught);
        } finally {
            setRemovingId(null);
        }
    }

    return (
        <div className="min-h-screen bg-canvas">
            <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
                    <Link to="/dashboard" aria-label="Back to your Brain">
                        <Logo />
                    </Link>
                    <ThemeToggle />
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to My Brain
                </Link>

                <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-ink">
                    Shared links
                </h1>
                <p className="mt-1 text-sm text-muted">
                    Links to single items or selections you've shared. Your whole-Brain link is managed from the dashboard.
                </p>

                {error && (
                    <div
                        className="mt-5 rounded-lg border border-danger-line bg-danger-soft px-4 py-2.5 text-sm text-danger"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {links === null ? (
                    <div className="mt-6 space-y-3" aria-busy="true">
                        <p className="sr-only">Loading shared links…</p>
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="h-20 animate-pulse rounded-xl border border-line bg-surface" />
                        ))}
                    </div>
                ) : links.length === 0 ? (
                    <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
                        <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted">
                            <Link2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h2 className="text-base font-semibold text-ink">Nothing shared yet</h2>
                        <p className="mt-1 max-w-sm text-sm text-muted">
                            Use the share button on any card, or "Select" on the dashboard to share several items with one link.
                        </p>
                    </div>
                ) : (
                    <ul className="mt-6 space-y-3">
                        {links.map((link) => (
                            <li
                                key={link.id}
                                className="rounded-xl border border-line bg-surface p-4 shadow-soft"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="break-words text-[15px] font-semibold text-ink">
                                            {linkHeading(link)}
                                        </h2>
                                        <p className="mt-0.5 text-xs text-muted">
                                            {link.kind === "item" ? "Single item" : `${link.itemCount} ${link.itemCount === 1 ? "item" : "items"}`}
                                            {formatDate(link.createdAt) && ` · Shared ${formatDate(link.createdAt)}`}
                                            {link.itemCount === 0 && " · Items were deleted"}
                                        </p>
                                        {link.kind === "selection" && link.preview && link.preview.length > 0 && (
                                            <p className="mt-1.5 truncate text-sm text-ink-2">
                                                {link.preview.join(" · ")}
                                                {link.itemCount > link.preview.length && " …"}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => void copy(link)}
                                            className={`${actionClass} text-ink-2 hover:bg-surface-2 hover:text-ink`}
                                        >
                                            {copiedId === link.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                                            {copiedId === link.id ? "Copied" : "Copy link"}
                                        </button>

                                        <a
                                            href={sharedItemsUrl(link.hash)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`${actionClass} text-ink-2 hover:bg-surface-2 hover:text-ink`}
                                        >
                                            <ArrowUpRight aria-hidden="true" />
                                            Open
                                        </a>

                                        <button
                                            type="button"
                                            onClick={() => void stopSharing(link)}
                                            disabled={removingId === link.id}
                                            className={`${actionClass} text-danger hover:bg-danger-soft disabled:opacity-50`}
                                        >
                                            <Link2Off aria-hidden="true" />
                                            {removingId === link.id ? "Stopping…" : "Stop sharing"}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
