// Single source of truth for the content types the API accepts.
// Adding a type here makes it valid in the model and in validation.
export const CONTENT_TYPES = [
    "youtube",
    "twitter",
    "article",
    "note",
    "github",
    "instagram",
    "linkedin",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

// Types whose link is optional. Every other type requires a link.
const LINK_OPTIONAL_TYPES: readonly ContentType[] = ["note"];

export function isContentType(value: unknown): value is ContentType {
    return (
        typeof value === "string" &&
        (CONTENT_TYPES as readonly string[]).includes(value)
    );
}

export function requiresLink(type: ContentType): boolean {
    return !LINK_OPTIONAL_TYPES.includes(type);
}

export const NOTE_BODY_MAX_LENGTH = 5000;

// Default order for content lists: pinned first, then newest first.
// _id breaks ties so the order is stable.
export const CONTENT_LIST_SORT = {
    isPinned: -1,
    createdAt: -1,
    _id: -1,
} as const;
