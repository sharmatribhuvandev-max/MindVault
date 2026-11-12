import { useEffect, useRef, useState, type ReactElement } from "react";

import { CrossIcon } from "../icons/CrossIcon";
import { FacebookIcon } from "../icons/FacebookIcon";
import { LinkedInIcon } from "../icons/LinkedInIcon";
import { MailIcon } from "../icons/MailIcon";
import { ShareIcon } from "../icons/ShareIcon";
import { TelegramIcon } from "../icons/TelegramIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { WhatsAppIcon } from "../icons/WhatsAppIcon";
import {
    DEFAULT_SHARE_MESSAGE,
    buildShareTargets,
    type ShareTargetId,
} from "../shareLinks";

const TARGET_ICONS: Record<ShareTargetId, ReactElement> = {
    whatsapp: <WhatsAppIcon />,
    email: <MailIcon />,
    telegram: <TelegramIcon />,
    x: <TwitterIcon />,
    linkedin: <LinkedInIcon />,
    facebook: <FacebookIcon />,
};

interface ShareDialogProps {
    url: string;
    onClose: () => void;
}

type CopyState = "idle" | "copied" | "failed";

const tileClass =
    "flex flex-col items-center gap-2 rounded-xl border border-gray-200 px-2 py-3 text-xs font-medium text-gray-700 transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600";

const tileIconClass =
    "flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 [&_svg]:h-5 [&_svg]:w-5";

export function ShareDialog({ url, onClose }: ShareDialogProps) {
    const copyButtonRef = useRef<HTMLButtonElement>(null);
    const linkInputRef = useRef<HTMLInputElement>(null);
    const [copyState, setCopyState] = useState<CopyState>("idle");

    const canUseNativeShare =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function";

    useEffect(() => {
        copyButtonRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
            setCopyState("copied");
        } catch {
            // Clipboard can be blocked (permissions, insecure origin).
            // Select the text so the user can copy it themselves.
            setCopyState("failed");
            linkInputRef.current?.select();
        }
    }

    async function shareNatively() {
        try {
            await navigator.share({
                title: "Mind Vault",
                text: DEFAULT_SHARE_MESSAGE,
                url,
            });
        } catch {
            // The user closed the share sheet; nothing to do.
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-dialog-title"
                className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6"
            >
                <div className="flex items-center justify-between">
                    <h2 id="share-dialog-title" className="text-lg font-semibold text-gray-900">
                        Share your Brain
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close share dialog"
                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        <CrossIcon />
                    </button>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                    Anyone with this link can view your saved content. Private notes stay private.
                </p>

                <div className="mt-4 flex gap-2">
                    <input
                        ref={linkInputRef}
                        type="text"
                        readOnly
                        value={url}
                        aria-label="Share link"
                        onFocus={(event) => event.target.select()}
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800"
                    />

                    <button
                        ref={copyButtonRef}
                        type="button"
                        onClick={() => void copyLink()}
                        className="shrink-0 rounded-lg bg-[var(--purple-600)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        {copyState === "copied" ? "Copied!" : "Copy"}
                    </button>
                </div>

                <p className="mt-1 min-h-5 text-xs" aria-live="polite">
                    {copyState === "copied" && (
                        <span className="text-green-700">Link copied to clipboard.</span>
                    )}
                    {copyState === "failed" && (
                        <span className="text-red-700">
                            Couldn't copy automatically. The link is selected, so press Ctrl+C (or ⌘+C).
                        </span>
                    )}
                </p>

                <h3 className="mt-3 text-sm font-semibold text-gray-800">
                    Share via
                </h3>

                <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {buildShareTargets(url).map((target) => (
                        <li key={target.id}>
                            <a
                                href={target.href}
                                target={target.id === "email" ? undefined : "_blank"}
                                rel="noopener noreferrer"
                                className={tileClass}
                            >
                                <span className={tileIconClass} aria-hidden="true">
                                    {TARGET_ICONS[target.id]}
                                </span>
                                {target.label}
                            </a>
                        </li>
                    ))}

                    {canUseNativeShare && (
                        <li>
                            <button
                                type="button"
                                onClick={() => void shareNatively()}
                                className={`${tileClass} w-full`}
                            >
                                <span className={`${tileIconClass} text-gray-600`} aria-hidden="true">
                                    <ShareIcon />
                                </span>
                                More options…
                            </button>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
