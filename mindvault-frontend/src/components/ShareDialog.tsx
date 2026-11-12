import { useEffect, useRef, useState, type ReactElement } from "react";

import { Check, Copy, Share2, X } from "lucide-react";

import { FacebookIcon } from "../icons/FacebookIcon";
import { LinkedInIcon } from "../icons/LinkedInIcon";
import { MailIcon } from "../icons/MailIcon";
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
    "flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

const tileIconClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface [&_svg]:h-5 [&_svg]:w-5";

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-[2px]"
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
                className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-float"
            >
                <div className="flex items-center justify-between">
                    <h2 id="share-dialog-title" className="text-base font-semibold text-ink">
                        Share your Brain
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close share dialog"
                        className="-mr-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-ink"
                    >
                        <X className="h-[18px] w-[18px]" aria-hidden="true" />
                    </button>
                </div>

                <p className="mt-1 text-sm text-muted">
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
                        className="field min-w-0 flex-1 bg-surface-2 text-ink-2"
                    />

                    <button
                        ref={copyButtonRef}
                        type="button"
                        onClick={() => void copyLink()}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink shadow-soft transition hover:bg-accent-hover"
                    >
                        {copyState === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                        {copyState === "copied" ? "Copied!" : "Copy"}
                    </button>
                </div>

                <p className="mt-1 min-h-5 text-xs" aria-live="polite">
                    {copyState === "copied" && (
                        <span className="text-success">Link copied to clipboard.</span>
                    )}
                    {copyState === "failed" && (
                        <span className="text-danger">
                            Couldn't copy automatically. The link is selected, so press Ctrl+C (or ⌘+C).
                        </span>
                    )}
                </p>

                <h3 className="mt-3 text-[13px] font-medium text-ink-2">
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
                                <span className={`${tileIconClass} text-muted`} aria-hidden="true">
                                    <Share2 />
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
