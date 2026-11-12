import { useEffect } from "react";

import { BrainIcon } from "../icons/BrainIcon";
import { LogoutIcon } from "../icons/LogoutIcon";
import {
    CONTENT_TYPES,
    CONTENT_TYPE_LABELS,
    type ContentType,
} from "../contentTypes";
import { ContentTypeIcon } from "./ContentTypeIcon";
import { SidebarItem } from "./SidebarItem";

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
                <div className="sidebar-brand">
                    <span className="sidebar-brand-icon" aria-hidden="true">
                        <BrainIcon />
                    </span>
                    <span>Mind Vault</span>
                </div>

                <nav className="sidebar-navigation" aria-label="Content navigation">
                    <SidebarItem
                        text="All content"
                        icon={<BrainIcon />}
                        active={selectedType === "all" && selectedCollectionId === null}
                        onClick={() => selectType("all")}
                    />

                    {CONTENT_TYPES.map((type) => (
                        <SidebarItem
                            key={type}
                            text={CONTENT_TYPE_LABELS[type]}
                            icon={<ContentTypeIcon type={type} />}
                            active={selectedType === type && selectedCollectionId === null}
                            onClick={() => selectType(type)}
                        />
                    ))}

                    {collections.length > 0 && (
                        <section className="sidebar-collections" aria-labelledby="sidebar-collections-heading">
                            <h2 id="sidebar-collections-heading" className="sidebar-section-title">
                                Collections
                            </h2>

                            <ul className="sidebar-collection-list">
                                {collections.map((collection) => (
                                    <li key={collection._id} className="sidebar-collection-row">
                                        <div className="sidebar-collection-select">
                                            <SidebarItem
                                                text={collection.name}
                                                icon={<BrainIcon />}
                                                active={selectedCollectionId === collection._id}
                                                onClick={() => selectCollection(collection._id)}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onDeleteCollection(collection._id)}
                                            disabled={deletingCollectionId === collection._id}
                                            aria-label={`Delete collection ${collection.name}`}
                                            title={`Delete ${collection.name}`}
                                            className="sidebar-delete-collection"
                                        >
                                            {deletingCollectionId === collection._id ? "…" : "×"}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </nav>

                {(username || onLogout) && (
                    <div className="sidebar-footer">
                        {username && (
                            <div className="sidebar-user" title={`Signed in as ${username}`}>
                                <span className="sidebar-user-avatar" aria-hidden="true">
                                    {username.charAt(0).toUpperCase()}
                                </span>
                                <span className="sidebar-user-text">
                                    <span className="sidebar-user-label">Signed in as</span>
                                    <span className="sidebar-user-name">{username}</span>
                                </span>
                            </div>
                        )}

                        {onLogout && (
                            <button
                                type="button"
                                onClick={onLogout}
                                disabled={loggingOut}
                                title="Signs you out on all your devices"
                                className="sidebar-item sidebar-logout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                            >
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center" aria-hidden="true">
                                    <LogoutIcon />
                                </span>
                                <span>{loggingOut ? "Logging out…" : "Logout"}</span>
                            </button>
                        )}
                    </div>
                )}
            </aside>
        </>
    );
}
