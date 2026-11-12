export type SortOrder = "newest" | "oldest" | "title";

export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "title", label: "Title (A–Z)" },
];

export const DEFAULT_SORT: SortOrder = "newest";

const STORAGE_KEY = "contentSort";

export function isSortOrder(value: unknown): value is SortOrder {
    return SORT_OPTIONS.some((option) => option.value === value);
}

// The viewer's last choice; storage can be unavailable (private mode,
// blocked site data), in which case we just use the default.
export function loadSortOrder(): SortOrder {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return isSortOrder(saved) ? saved : DEFAULT_SORT;
    } catch {
        return DEFAULT_SORT;
    }
}

export function saveSortOrder(order: SortOrder) {
    try {
        localStorage.setItem(STORAGE_KEY, order);
    } catch {
        // Not critical; the choice just won't be remembered.
    }
}

interface Sortable {
    _id: string;
    title: string;
    isPinned?: boolean;
    createdAt?: string;
}

function createdTime(item: Sortable): number {
    const time = item.createdAt ? Date.parse(item.createdAt) : NaN;
    return Number.isNaN(time) ? 0 : time;
}

// Pinned items always come first; within each group, apply the order.
// Ties fall back to _id (MongoDB IDs increase over time) so the result
// is stable.
export function sortContents<T extends Sortable>(items: T[], order: SortOrder): T[] {
    const byId = (a: T, b: T) => (a._id < b._id ? 1 : a._id > b._id ? -1 : 0);

    const compare: Record<SortOrder, (a: T, b: T) => number> = {
        newest: (a, b) => createdTime(b) - createdTime(a) || byId(a, b),
        oldest: (a, b) => createdTime(a) - createdTime(b) || -byId(a, b),
        title: (a, b) =>
            a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }) ||
            byId(a, b),
    };

    return [...items].sort(
        (a, b) =>
            Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) ||
            compare[order](a, b)
    );
}
