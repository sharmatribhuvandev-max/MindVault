// Fetches public repository details from the GitHub REST API (no auth).

export interface RepoInfo {
    fullName: string;
    description: string | null;
    stars: number;
    language: string | null;
}

// One request per repo per page load, shared by every card showing it.
// Failures (including GitHub's 60 requests/hour anonymous limit) are
// cached as null so we don't keep retrying.
const repoCache = new Map<string, Promise<RepoInfo | null>>();

export function clearGitHubRepoCache() {
    repoCache.clear();
}

export function fetchRepo(owner: string, repo: string): Promise<RepoInfo | null> {
    const key = `${owner}/${repo}`.toLowerCase();
    const cached = repoCache.get(key);

    if (cached) {
        return cached;
    }

    const request = fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        { headers: { Accept: "application/vnd.github+json" } }
    )
        .then((response) => (response.ok ? response.json() : null))
        .then((data: unknown): RepoInfo | null => {
            if (!data || typeof data !== "object") {
                return null;
            }

            const item = data as Record<string, unknown>;

            if (typeof item.full_name !== "string") {
                return null;
            }

            return {
                fullName: item.full_name,
                description:
                    typeof item.description === "string"
                        ? item.description
                        : null,
                stars:
                    typeof item.stargazers_count === "number"
                        ? item.stargazers_count
                        : 0,
                language:
                    typeof item.language === "string"
                        ? item.language
                        : null,
            };
        })
        .catch(() => null);

    repoCache.set(key, request);

    return request;
}
