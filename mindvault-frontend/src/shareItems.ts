import axios from "axios";

import { BACKEND_URL } from "./config";

// Public links to a single item or a hand-picked selection, separate
// from the whole-Brain share link.

export interface ShareLinkInfo {
    id: string;
    hash: string;
    kind: "item" | "selection";
    title: string;
    itemCount: number;
    createdAt?: string;
    preview?: string[];
}

export class ShareItemsError extends Error {
    readonly unauthorized: boolean;

    constructor(message: string, unauthorized = false, cause?: unknown) {
        super(message, { cause });
        this.unauthorized = unauthorized;
    }
}

export function sharedItemsUrl(hash: string): string {
    return `${window.location.origin}/s/${hash}`;
}

function authHeaders() {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new ShareItemsError("Your session has expired. Please sign in again.", true);
    }

    return { Authorization: `Bearer ${token}` };
}

function toShareError(error: unknown, fallback: string): ShareItemsError {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        if (error.response?.status === 401) {
            return new ShareItemsError(
                "Your session has expired. Please sign in again.",
                true,
                error
            );
        }

        return new ShareItemsError(
            error.response?.data?.message ??
                (error.response ? fallback : "Cannot connect to the server. Please try again."),
            false,
            error
        );
    }

    return error instanceof ShareItemsError
        ? error
        : new ShareItemsError(fallback, false, error);
}

export async function createItemsShareLink(
    contentIds: string[],
    title = ""
): Promise<ShareLinkInfo> {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/v1/share-links`,
            { contentIds, ...(title.trim() && { title: title.trim() }) },
            { headers: authHeaders() }
        );

        const link = response.data?.shareLink;

        if (!link || typeof link.hash !== "string") {
            throw new ShareItemsError("Invalid response from server. Please try again.");
        }

        return link as ShareLinkInfo;
    } catch (error) {
        throw toShareError(error, "Couldn't create a share link. Please try again.");
    }
}

export async function listShareLinks(): Promise<ShareLinkInfo[]> {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/share-links`, {
            headers: authHeaders(),
        });

        return Array.isArray(response.data?.shareLinks) ? response.data.shareLinks : [];
    } catch (error) {
        throw toShareError(error, "Couldn't load your shared links. Please try again.");
    }
}

export async function deleteShareLink(id: string): Promise<void> {
    try {
        await axios.delete(`${BACKEND_URL}/api/v1/share-links/${encodeURIComponent(id)}`, {
            headers: authHeaders(),
        });
    } catch (error) {
        throw toShareError(error, "Couldn't stop sharing. Please try again.");
    }
}
