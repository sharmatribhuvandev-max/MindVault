// Pure URL parsers for the embeddable content types. Each returns null
// when the URL isn't from that site, so callers can fall back to a plain
// link card.

function parseUrl(value: string): URL | null {
    try {
        const url = new URL(value.trim());

        return url.protocol === "http:" || url.protocol === "https:"
            ? url
            : null;
    } catch {
        return null;
    }
}

function pathSegments(url: URL): string[] {
    return url.pathname.split("/").filter(Boolean);
}

// ---------------------------------------------------------------- GitHub

export type GitHubTarget =
    | { kind: "repo"; owner: string; repo: string }
    | { kind: "user"; owner: string }
    | { kind: "other" };

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

// Top-level GitHub pages that look like /<owner> but aren't users.
const GITHUB_RESERVED = new Set([
    "about", "collections", "explore", "features", "login", "marketplace",
    "new", "notifications", "orgs", "pricing", "pulls", "issues", "search",
    "settings", "sponsors", "topics", "trending", "enterprise", "join",
]);

const GITHUB_OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const GITHUB_REPO = /^[A-Za-z0-9._-]{1,100}$/;

export function parseGitHubUrl(value: string): GitHubTarget | null {
    const url = parseUrl(value);

    if (!url || !GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
        return null;
    }

    const [owner, rawRepo] = pathSegments(url);

    if (
        !owner ||
        GITHUB_RESERVED.has(owner.toLowerCase()) ||
        !GITHUB_OWNER.test(owner)
    ) {
        return { kind: "other" };
    }

    if (!rawRepo) {
        return { kind: "user", owner };
    }

    const repo = rawRepo.replace(/\.git$/, "");

    return GITHUB_REPO.test(repo)
        ? { kind: "repo", owner, repo }
        : { kind: "other" };
}

// ------------------------------------------------------------- Instagram

const INSTAGRAM_HOSTS = new Set([
    "instagram.com",
    "www.instagram.com",
    "m.instagram.com",
    "instagr.am",
    "www.instagr.am",
]);

const INSTAGRAM_POST_KINDS = new Set(["p", "reel", "reels", "tv"]);

export type InstagramTarget =
    | { kind: "post"; embedUrl: string }
    | { kind: "other" };

export function parseInstagramUrl(value: string): InstagramTarget | null {
    const url = parseUrl(value);

    if (!url || !INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) {
        return null;
    }

    const segments = pathSegments(url);

    // /p/<code>, /reel/<code>, and the /<username>/p/<code> share form.
    for (let i = 0; i < segments.length - 1; i++) {
        const code = segments[i + 1];

        if (
            INSTAGRAM_POST_KINDS.has(segments[i]) &&
            /^[A-Za-z0-9_-]+$/.test(code)
        ) {
            return {
                kind: "post",
                embedUrl: `https://www.instagram.com/p/${code}/embed`,
            };
        }
    }

    return { kind: "other" };
}

// -------------------------------------------------------------- LinkedIn

export type LinkedInTarget =
    | { kind: "post"; embedUrl: string }
    | { kind: "profile" }
    | { kind: "company" }
    | { kind: "other" };

function isLinkedInHost(host: string): boolean {
    const lower = host.toLowerCase();

    return lower === "linkedin.com" || lower.endsWith(".linkedin.com");
}

const LINKEDIN_URN = /urn:li:(activity|share|ugcPost):(\d+)/;

export function parseLinkedInUrl(value: string): LinkedInTarget | null {
    const url = parseUrl(value);

    if (!url || !isLinkedInHost(url.hostname)) {
        return null;
    }

    const path = decodeURIComponent(url.pathname);
    let urn: string | null = null;

    // /feed/update/urn:li:activity:123 and /embed/feed/update/urn:li:share:123
    const urnMatch = path.match(LINKEDIN_URN);

    if (urnMatch) {
        urn = `urn:li:${urnMatch[1]}:${urnMatch[2]}`;
    } else {
        // /posts/<slug>-activity-1234567890-AbCd
        const activityMatch = path.match(/^\/posts\/.*-activity-(\d+)/);

        if (activityMatch) {
            urn = `urn:li:activity:${activityMatch[1]}`;
        }
    }

    if (urn) {
        return {
            kind: "post",
            embedUrl: `https://www.linkedin.com/embed/feed/update/${urn}`,
        };
    }

    const [first] = pathSegments(url);

    if (first === "in") {
        return { kind: "profile" };
    }

    if (first === "company") {
        return { kind: "company" };
    }

    return { kind: "other" };
}
