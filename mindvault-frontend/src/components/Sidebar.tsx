import { useEffect } from "react";
import { Folder, LayoutGrid, LogOut, Pin, Star, X } from "lucide-react";

import {
    CONTENT_TYPES,
    CONTENT_TYPE_LABELS,
    type ContentType,
} from "../contentTypes";
import { ContentTypeIcon } from "./ContentTypeIcon";
import { Logo } from "./Logo";
import { SidebarItem } from "./SidebarItem";
import { ThemeToggle } from "./ThemeToggle";

type ContentFilter =
    | "all"
    | "favorites"
    | "pinned"
    | ContentType;

interface Collection {
    _id: string;
    name: string;
}

interface SidebarProps {
    selectedType: ContentFilter;
    onSelectType: (type: ContentFilter) => void;
    collections: Collection[];
    selectedCollectionId: string | null;
    onSelectCollection: (collectionId: string | null) => void;
    onDeleteCollection: (collectionId: string) => void;
    deletingCollectionId: string | null;
    isOpen?: boolean;
    onClose?: () => void;
    onLogout?: () => void;
    loggingOut?: boolean;
    username?: string | null;
}

function SectionTitle({ id, children }: { id: string; children: string }) {
    return (
        <h2
            id={id}
            className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-faint"
        >
            {children}
        </h2>
    );
}

export function Sidebar({
    selectedType,
    onSelectType,
    collections,
    selectedCollectionId,
    onSelectCollection,
    onDeleteCollection,
    deletingCollectionId,
    isOpen = false,
    onClose,
    onLogout,
    loggingOut = false,
    username = null,
}: SidebarProps) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose?.();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    function selectType(type: ContentFilter) {
        onSelectType(type);
        onSelectCollection(null);
        onClose?.();
    }

    function selectCollection(collectionId: string) {
        onSelectCollection(collectionId);
        onClose?.();
    }

    const isActive = (type: ContentFilter) =>
        selectedType === type && selectedCollectionId === null;

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    aria-label="Close navigation menu"
                    onClick={onClose}
                />
            )}

            <aside
                id="mindvault-sidebar"
                aria-label="Main navigation"
                className={`mindvault-sidebar ${isOpen ? "is-open" : ""}`}
            >
                <div className="px-2.5 pb-5 pt-1">
                    <Logo />
                </div>

                <nav className="sidebar-navigation" aria-label="Content navigation">
                    <div className="space-y-px">
                        <SidebarItem
                            text="All content"
                            icon={<LayoutGrid />}
                            active={isActive("all")}
                            onClick={() => selectType("all")}
                        />
                        <SidebarItem
                            text="Favorites"
                            icon={<Star />}
                            active={isActive("favorites")}
                            onClick={() => selectType("favorites")}
                        />
                        <SidebarItem
                            text="Pinned"
                            icon={<Pin />}
                            active={isActive("pinned")}
                            onClick={() => selectType("pinned")}
                        />
                    </div>

                    <section className="mt-6" aria-labelledby="sidebar-types-heading">
                        <SectionTitle id="sidebar-types-heading">Types</SectionTitle>
                        <div className="space-y-px">
                            {CONTENT_TYPES.map((type) => (
                                <SidebarItem
                                    key={type}
                                    text={CONTENT_TYPE_LABELS[type]}
                                    icon={<ContentTypeIcon type={type} />}
                                    active={isActive(type)}
                                    onClick={() => selectType(type)}
                                />
                            ))}
                        </div>
                    </section>

                    {collections.length > 0 && (
                        <section className="mt-6" aria-labelledby="sidebar-collections-heading">
                            <SectionTitle id="sidebar-collections-heading">Collections</SectionTitle>

                            <ul className="m-0 list-none space-y-px p-0">
                                {collections.map((collection) => (
                                    <li key={collection._id} className="sidebar-collection-row relative [&_.sidebar-item]:pr-8">
                                        <SidebarItem
                                            text={collection.name}
                                            icon={<Folder />}
                                            active={selectedCollectionId === collection._id}
                                            onClick={() => selectCollection(collection._id)}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => onDeleteCollection(collection._id)}
                                            disabled={deletingCollectionId === collection._id}
                                            aria-label={`Delete collection ${collection.name}`}
                                            title={`Delete ${collection.name}`}
                                            className="sidebar-delete-collection absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-faint transition hover:bg-danger-soft hover:text-danger disabled:cursor-wait"
                                        >
                                            {deletingCollectionId === collection._id
                                                ? "…"
                                                : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </nav>

                <div className="mt-auto space-y-3 border-t border-line pt-3">
                    <ThemeToggle variant="segmented" />

                    {(username || onLogout) && (
                        <div className="flex min-w-0 items-center gap-2.5 px-1">
                            {username && (
                                <>
                                    <span
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text"
                                        aria-hidden="true"
                                    >
                                        {username.charAt(0).toUpperCase()}
                                    </span>
                                    <span
                                        className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink"
                                        title={`Signed in as ${username}`}
                                    >
                                        <span className="sr-only">Signed in as </span>
                                        {username}
                                    </span>
                                </>
                            )}

                            {onLogout && (
                                <button
                                    type="button"
                                    onClick={onLogout}
                                    disabled={loggingOut}
                                    aria-label={loggingOut ? "Logging out…" : "Logout"}
                                    title="Log out on all your devices"
                                    className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-wait disabled:opacity-60"
                                >
                                    <LogOut className="h-4 w-4" aria-hidden="true" />
                                    {!username && <span>{loggingOut ? "Logging out…" : "Logout"}</span>}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
