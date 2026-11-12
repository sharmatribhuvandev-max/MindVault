// Builds "share to" URLs for a link. Each opens the target app or site
// with the link pre-filled; nothing is sent until the user confirms there.

export type ShareTargetId =
    | "whatsapp"
    | "email"
    | "telegram"
    | "x"
    | "linkedin"
    | "facebook";

export interface ShareTarget {
    id: ShareTargetId;
    label: string;
    href: string;
}

export const DEFAULT_SHARE_MESSAGE = "Take a look at my Mind Vault";

export function buildShareTargets(
    url: string,
    message: string = DEFAULT_SHARE_MESSAGE
): ShareTarget[] {
    const u = encodeURIComponent(url);
    const text = encodeURIComponent(message);
    const textWithUrl = encodeURIComponent(`${message}: ${url}`);

    return [
        {
            id: "whatsapp",
            label: "WhatsApp",
            href: `https://wa.me/?text=${textWithUrl}`,
        },
        {
            id: "email",
            label: "Email",
            href: `mailto:?subject=${text}&body=${textWithUrl}`,
        },
        {
            id: "telegram",
            label: "Telegram",
            href: `https://t.me/share/url?url=${u}&text=${text}`,
        },
        {
            id: "x",
            label: "X",
            href: `https://twitter.com/intent/tweet?url=${u}&text=${text}`,
        },
        {
            id: "linkedin",
            label: "LinkedIn",
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
        },
        {
            id: "facebook",
            label: "Facebook",
            href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
        },
    ];
}
