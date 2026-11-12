// Single source of truth for content types on the frontend. Keep in sync
// with mindvault-backend/src/content-types.ts.
export const CONTENT_TYPES = [
    "youtube",
    "twitter",
    "article",
    "note",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    youtube: "YouTube",
    twitter: "Twitter / X",
    article: "Article",
    note: "Note",
};

export const NOTE_BODY_MAX_LENGTH = 5000;

export function isContentType(value: unknown): value is ContentType {
    return (
        typeof value === "string" &&
        (CONTENT_TYPES as readonly string[]).includes(value)
    );
}

// Notes are the only type that doesn't need a link.
export function requiresLink(type: ContentType): boolean {
    return type !== "note";
}

const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
]);

const TWITTER_HOSTS = new Set([
    "twitter.com",
    "www.twitter.com",
    "mobile.twitter.com",
    "x.com",
    "www.x.com",
]);

// Guess the content type from a URL. Known sites get their own type;
// any other valid http(s) link is an article. Returns null for text
// that isn't a usable URL yet (e.g. while the user is still typing).
export function detectContentType(value: string): ContentType | null {
    let url: URL;

    try {
        url = new URL(value.trim());
    } catch {
        return null;
    }

    if (
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        !url.hostname.includes(".")
    ) {
        return null;
    }

    const host = url.hostname.toLowerCase();

    if (YOUTUBE_HOSTS.has(host)) {
        return "youtube";
    }

    if (TWITTER_HOSTS.has(host)) {
        return "twitter";
    }

    return "article";
}

// "https://www.example.com/a/b" -> "example.com"
export function getDisplayDomain(value: string): string | null {
    try {
        return new URL(value).hostname.replace(/^www\./, "");
    } catch {
        return null;
    }
}
