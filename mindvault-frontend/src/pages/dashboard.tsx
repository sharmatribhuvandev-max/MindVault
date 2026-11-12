import { useCallback, useEffect, useMemo, useState } from "react";


import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { ShareDialog } from "../components/ShareDialog";
import {
    SORT_OPTIONS,
    isSortOrder,
    loadSortOrder,
    saveSortOrder,
    sortContents,
    type SortOrder,
} from "../sortContent";

import {
    Inbox,
    Link2Off,
    Menu,
    Plus,
    Search,
    Share2,
    Sparkles,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";

import { Sidebar } from "../components/Sidebar";

import { useContent } from "../hooks/useContent";

import axios from "axios";

import { BACKEND_URL } from "../config";

import { Link, useNavigate } from "react-router-dom";

import { clearGuestSession, isGuestSession } from "../guestSession";

import {
    CONTENT_TYPES,
    CONTENT_TYPE_LABELS,
    isContentType,
} from "../contentTypes";

import type {
    Collection,
    Content,
    ContentType,
} from "../types";

type ContentFilter =
    | "all"
    | "favorites"
    | "pinned"
    | ContentType;

export default function Dashboard() {
    const [modalOpen, setModalOpen] =
        useState(false);

    const [sidebarOpen, setSidebarOpen] =
        useState(false);

    const [deletingId, setDeletingId] =
        useState<string | null>(null);

    const [deleteError, setDeleteError] =
        useState("");

    const [editingContent, setEditingContent] =
        useState<Content | null>(null);

    const [sharingEnabled, setSharingEnabled] =
        useState(false);

    // The public link shown in the share dialog; null when it's closed.
    const [shareUrl, setShareUrl] =
        useState<string | null>(null);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [selectedType, setSelectedType] =
        useState<ContentFilter>("all");

    const [favoritingId, setFavoritingId] =
        useState<string | null>(null);

    const [pinningId, setPinningId] =
        useState<string | null>(null);

    const [
        selectedCollectionId,
        setSelectedCollectionId,
    ] = useState<string | null>(null);

    const [collections, setCollections] =
        useState<Collection[]>([]);

    const [
        deletingCollectionId,
        setDeletingCollectionId,
    ] = useState<string | null>(null);

    const {
        contents,
        refresh,
        error: contentError,
        loaded: contentsLoaded,
    } = useContent();
    const navigate = useNavigate();

    const [isGuest] = useState(isGuestSession);

    // Returns the user's collections, or null on failure.
    const loadCollections = useCallback(async (): Promise<Collection[] | null> => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            return null;
        }

        try {
            const response = await axios.get(
                `${BACKEND_URL}/api/v1/collections`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            return response.data.collections || [];
        } catch (error) {
            console.error(
                "Failed to fetch collections:",
                error
            );

            if (
                axios.isAxiosError(error) &&
                error.response?.status === 401
            ) {
                localStorage.removeItem("token");
                navigate("/signin");
            }

            return null;
        }
    }, [navigate]);

    const [username, setUsername] =
        useState<string | null>(null);

    // Load the signed-in user's name once, for the sidebar.
    useEffect(() => {
        let ignore = false;
        const token =
            localStorage.getItem("token");

        if (!token) {
            return;
        }

        axios
            .get(`${BACKEND_URL}/api/v1/me`, {
                headers: {
                    Authorization:
                        `Bearer ${token}`,
                },
            })
            .then((response) => {
                const name = response.data?.username;

                if (!ignore && typeof name === "string") {
                    setUsername(name);
                }
            })
            .catch((error) => {
                // Not critical: the sidebar just shows no name.
                console.error(
                    "Failed to fetch current user:",
                    error
                );
            });

        return () => {
            ignore = true;
        };
    }, []);

    async function fetchCollections() {
        const loaded = await loadCollections();

        if (loaded) {
            setCollections(loaded);
        }
    }

    // Load on mount, and reload whenever the content modal opens or
    // closes so newly created tags/collections/content are picked up.
    useEffect(() => {
        let ignore = false;

        void refresh();
        void loadCollections().then((loaded) => {
            if (!ignore && loaded) {
                setCollections(loaded);
            }
        });

        return () => {
            ignore = true;
        };
    }, [modalOpen, refresh, loadCollections]);

    const [sortOrder, setSortOrder] =
        useState<SortOrder>(loadSortOrder);

    function changeSortOrder(value: string) {
        if (isSortOrder(value)) {
            setSortOrder(value);
            saveSortOrder(value);
        }
    }

    const filteredContents = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase();

        const matching = contents.filter(
            (content: Content) => {
                const matchesType =
                    selectedType === "all" ||
                    selectedType === "favorites" ||
                    selectedType === "pinned" ||
                    content.type === selectedType;

                const matchesFavorite =
                    selectedType !== "favorites" ||
                    content.isFavorite;

                const matchesPinned =
                    selectedType !== "pinned" ||
                    content.isPinned;

                const contentCollectionId =
                    typeof content.collectionId ===
                        "string"
                        ? content.collectionId
                        : content.collectionId?._id ||
                        null;

                const matchesCollection =
                    selectedCollectionId === null ||
                    contentCollectionId ===
                    selectedCollectionId;

                const matchesSearch =
                    !query ||
                    content.title
                        .toLowerCase()
                        .includes(query) ||
                    content.link
                        .toLowerCase()
                        .includes(query) ||
                    (content.notes || "")
                        .toLowerCase()
                        .includes(query) ||
                    (content.body || "")
                        .toLowerCase()
                        .includes(query);

                return (
                    matchesType &&
                    matchesFavorite &&
                    matchesPinned &&
                    matchesCollection &&
                    matchesSearch
                );
            }
        );

        return sortContents(matching, sortOrder);
    }, [
        contents,
        searchQuery,
        selectedType,
        selectedCollectionId,
        sortOrder,
    ]);

    const [loggingOut, setLoggingOut] =
        useState(false);

    async function logout() {
        if (loggingOut) {
            return;
        }

        setLoggingOut(true);

        const token =
            localStorage.getItem("token");

        // Revoke the token on the server so a copied token stops working.
        // Even if this fails (offline, server down), still sign out locally.
        if (token) {
            try {
                await axios.post(
                    `${BACKEND_URL}/api/v1/logout`,
                    {},
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                        timeout: 5000,
                    }
                );
            } catch (error) {
                console.error("Server logout failed:", error);
            }
        }

        localStorage.removeItem("token");
        clearGuestSession();

        navigate("/signin", { replace: true });
    }

    const closeShareDialog = useCallback(() => {
        setShareUrl(null);
    }, []);

    async function createShareLink() {
        try {
            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/signin");
                return;
            }

            const response = await axios.post(
                `${BACKEND_URL}/api/v1/brain/share`,
                {
                    share: true,
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            setShareUrl(
                `${window.location.origin}/share/${response.data.hash}`
            );

            setSharingEnabled(true);
        } catch (error) {
            console.error(
                "Failed to create share link:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    localStorage.removeItem(
                        "token"
                    );

                    navigate("/signin");

                    return;
                }

                alert(
                    error.response?.data?.message ||
                    "Failed to create share link. Please try again."
                );

                return;
            }

            alert(
                "Failed to create share link. Please try again."
            );
        }
    }

    async function disableSharing() {
        try {
            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/signin");
                return;
            }

            await axios.post(
                `${BACKEND_URL}/api/v1/brain/share`,
                {
                    share: false,
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            setSharingEnabled(false);

            alert("Brain sharing disabled.");
        } catch (error) {
            console.error(
                "Failed to disable sharing:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    localStorage.removeItem(
                        "token"
                    );

                    navigate("/signin");

                    return;
                }

                alert(
                    error.response?.data?.message ||
                    "Failed to disable sharing. Please try again."
                );

                return;
            }

            alert(
                "Failed to disable sharing. Please try again."
            );
        }
    }

    async function deleteContent(
        contentId: string
    ) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this content?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeleteError("");
            setDeletingId(contentId);

            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/signin");
                return;
            }

            await axios.delete(
                `${BACKEND_URL}/api/v1/content`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                    data: {
                        contentId,
                    },
                }
            );

            await refresh();
        } catch (error) {
            console.error(
                "Failed to delete content:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    localStorage.removeItem(
                        "token"
                    );

                    navigate("/signin");

                    return;
                }

                setDeleteError(
                    error.response?.data?.message ||
                    "Failed to delete content. Please try again."
                );

                return;
            }

            setDeleteError(
                "Failed to delete content. Please try again."
            );
        } finally {
            setDeletingId(null);
        }
    }

    async function favoriteContent(
        contentId: string,
        isFavorite: boolean
    ) {
        try {
            setFavoritingId(contentId);

            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/signin");
                return;
            }

            await axios.patch(
                `${BACKEND_URL}/api/v1/content/${contentId}/favorite`,
                {
                    isFavorite,
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            await refresh();
        } catch (error) {
            console.error(
                "Failed to update favorite:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    localStorage.removeItem(
                        "token"
                    );

                    navigate("/signin");

                    return;
                }

                alert(
                    error.response?.data?.message ||
                    "Failed to update favorite. Please try again."
                );

                return;
            }

            alert(
                "Failed to update favorite. Please try again."
            );
        } finally {
            setFavoritingId(null);
        }
    }

    async function pinContent(
        contentId: string,
        isPinned: boolean
    ) {
        try {
            setPinningId(contentId);

            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/signin");
                return;
            }

            await axios.patch(
                `${BACKEND_URL}/api/v1/content/${contentId}/pin`,
                {
                    isPinned,
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            await refresh();
        } catch (error) {
            console.error(
                "Failed to update pinned state:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    localStorage.removeItem(
                        "token"
                    );

                    navigate("/signin");

                    return;
                }

                alert(
                    error.response?.data?.message ||
                    "Failed to update pinned state. Please try again."
                );

                return;
            }

            alert(
                "Failed to update pinned state. Please try again."
            );
        } finally {
            setPinningId(null);
        }
    }

    async function deleteCollection(
        collectionId: string
    ) {
        const collection =
            collections.find(
                (item) =>
                    item._id === collectionId
            );

        const confirmed = window.confirm(
            `Are you sure you want to delete the collection "${collection?.name || "this collection"}"? Content inside it will not be deleted.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingCollectionId(
                collectionId
            );

            const token =
                localStorage.getItem("token");

            if (!token) {
                navigate("/signin");
                return;
            }

            await axios.delete(
                `${BACKEND_URL}/api/v1/collections/${collectionId}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            setCollections(
                (currentCollections) =>
                    currentCollections.filter(
                        (item) =>
                            item._id !==
                            collectionId
                    )
            );

            if (
                selectedCollectionId ===
                collectionId
            ) {
                setSelectedCollectionId(null);
            }

            await refresh();
        } catch (error) {
            console.error(
                "Failed to delete collection:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    localStorage.removeItem(
                        "token"
                    );

                    navigate("/signin");

                    return;
                }

                alert(
                    error.response?.data?.message ||
                    "Failed to delete collection. Please try again."
                );

                return;
            }

            alert(
                "Failed to delete collection. Please try again."
            );
        } finally {
            setDeletingCollectionId(null);
        }
    }

    function editContent(contentId: string) {
        const content = contents.find(
            (item: Content) =>
                item._id === contentId
        );

        if (!content) {
            return;
        }

        setEditingContent({
            _id: content._id,
            title: content.title,
            link: content.link,
            type: content.type,
            tags: content.tags || [],
            notes: content.notes || "",
            body: content.body || "",
            isFavorite: content.isFavorite,
            isPinned: content.isPinned,
            collectionId: content.collectionId,
        });
        setModalOpen(true);
    }

    function closeContentModal() {
        setModalOpen(false);
        setEditingContent(null);
    }

    async function handleContentUpdated() {
        await refresh();
        await fetchCollections();
    }

    function getEmptyState() {
        if (contents.length === 0) {
            return {
                title: "Your Brain is empty.",
                message:
                    "Start saving useful content.",
                showAddButton: true,
            };
        }

        if (searchQuery.trim()) {
            return {
                title: "No content found.",
                message:
                    "Try a different search term.",
                showAddButton: false,
            };
        }

        if (selectedCollectionId) {
            const collection =
                collections.find(
                    (item) =>
                        item._id ===
                        selectedCollectionId
                );

            return {
                title:
                    "No content in this collection.",
                message: collection
                    ? `Add content to ${collection.name} to see it here.`
                    : "Add content to this collection to see it here.",
                showAddButton: true,
            };
        }

        if (selectedType === "favorites") {
            return {
                title:
                    "No favorite content found.",
                message:
                    "Favorite content to see it here.",
                showAddButton: false,
            };
        }

        if (selectedType === "pinned") {
            return {
                title:
                    "No pinned content found.",
                message:
                    "Pin content to see it here.",
                showAddButton: false,
            };
        }

        if (isContentType(selectedType)) {
            const label = CONTENT_TYPE_LABELS[selectedType];

            return {
                title: `No ${label} content found.`,
                message: `Try adding some ${label} content.`,
                showAddButton: false,
            };
        }

        return {
            title: "No content found.",
            message:
                "Try adding some content.",
            showAddButton: false,
        };
    }

    const emptyState = getEmptyState();
    const isLoading = contentsLoaded === false;

    const viewLabel = selectedCollectionId
        ? collections.find((item) => item._id === selectedCollectionId)?.name ?? "Collection"
        : selectedType === "all"
            ? "All content"
            : selectedType === "favorites"
                ? "Favorites"
                : selectedType === "pinned"
                    ? "Pinned"
                    : CONTENT_TYPE_LABELS[selectedType];

    const openAddContent = () => {
        setEditingContent(null);
        setModalOpen(true);
    };

    const chipClass = (active: boolean) =>
        `inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] font-medium transition-colors ${
            active
                ? "border-ink bg-ink text-canvas"
                : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
        }`;

    return (
        <>
            <div className="dashboard-shell">
                <Sidebar
                    selectedType={selectedType}
                    onSelectType={setSelectedType}
                    collections={collections}
                    selectedCollectionId={
                        selectedCollectionId
                    }
                    onSelectCollection={
                        setSelectedCollectionId
                    }
                    onDeleteCollection={
                        deleteCollection
                    }
                    deletingCollectionId={
                        deletingCollectionId
                    }
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    username={username}
                    onLogout={logout}
                    loggingOut={loggingOut}
                />

                <main className="dashboard-main">
                    <div className="dashboard-mobile-toolbar sticky top-0 z-30 -mx-4 mb-4 flex h-14 items-center justify-between gap-2 border-b border-line bg-canvas/85 px-2 backdrop-blur-md">
                        <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2"
                            onClick={() => setSidebarOpen(true)}
                            aria-expanded={sidebarOpen}
                            aria-controls="mindvault-sidebar"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <Logo />
                        <ThemeToggle />
                    </div>

                    <div className="dashboard-inner">
                        {isGuest && (
                            <div
                                className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] text-muted shadow-soft"
                                role="status"
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                                    <span>
                                        <strong className="font-medium text-ink">You're exploring a demo account.</strong>{" "}
                                        Add, edit or delete anything. It's all reset after 24 hours.
                                    </span>
                                </span>
                                <Link
                                    to="/signup"
                                    className="font-medium text-accent-text underline-offset-4 hover:underline"
                                >
                                    Create your own account →
                                </Link>
                            </div>
                        )}

                        {shareUrl && (
                            <ShareDialog
                                url={shareUrl}
                                onClose={closeShareDialog}
                            />
                        )}

                        <CreateContentModal
                            open={modalOpen}
                            onClose={
                                closeContentModal
                            }
                            editContent={
                                editingContent
                                    ? {
                                        id: editingContent._id,
                                        title:
                                            editingContent.title,
                                        link:
                                            editingContent.link,
                                        type:
                                            editingContent.type,
                                        tags:
                                            editingContent.tags,
                                        notes:
                                            editingContent.notes || "",
                                        body:
                                            editingContent.body || "",
                                        collectionId:
                                            typeof editingContent.collectionId ===
                                                "string"
                                                ? editingContent.collectionId
                                                : editingContent
                                                    .collectionId
                                                    ?._id ||
                                                null,
                                    }
                                    : null
                            }
                            onUpdated={
                                handleContentUpdated
                            }
                        />

                        <header className="flex flex-wrap items-end justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">
                                    My Brain
                                </h1>
                                <p className="mt-1 text-sm text-muted">
                                    {viewLabel}
                                    {!isLoading && (
                                        <>
                                            {" · "}
                                            {filteredContents.length}{" "}
                                            {filteredContents.length === 1 ? "item" : "items"}
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {sharingEnabled && (
                                    <Button
                                        onClick={
                                            disableSharing
                                        }
                                        variant="ghost"
                                        text="Disable Sharing"
                                        startIcon={<Link2Off />}
                                    />
                                )}

                                <Button
                                    onClick={
                                        createShareLink
                                    }
                                    variant="secondary"
                                    text="Share Brain"
                                    startIcon={<Share2 />}
                                />

                                <Button
                                    onClick={openAddContent}
                                    size="md"
                                    variant="primary"
                                    text="Add Content"
                                    startIcon={<Plus />}
                                />
                            </div>
                        </header>

                        {deleteError && (
                            <div className="mt-4 rounded-lg border border-danger-line bg-danger-soft px-4 py-2.5 text-sm text-danger">
                                {deleteError}
                            </div>
                        )}
                        {contentError && (
                            <div
                                className="mt-4 rounded-lg border border-danger-line bg-danger-soft px-4 py-2.5 text-sm text-danger"
                                role="alert"
                                aria-live="polite"
                            >
                                {contentError}
                            </div>
                        )}

                        <section className="mt-6 flex flex-wrap items-center gap-2">
                            <div className="relative min-w-0 flex-1 basis-60">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                                    aria-hidden="true"
                                />

                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(
                                        event
                                    ) =>
                                        setSearchQuery(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="Search titles, links and notes…"
                                    aria-label="Search saved content"
                                    className="field h-10 pl-9"
                                />
                            </div>

                            <label className="flex items-center">
                                <span className="sr-only">Sort</span>
                                <select
                                    value={sortOrder}
                                    onChange={(event) =>
                                        changeSortOrder(event.target.value)
                                    }
                                    aria-label="Sort saved content"
                                    className="field h-10 w-auto"
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>

                        <nav className="dashboard-filters mt-3" aria-label="Filter saved content">
                            <button
                                type="button"
                                onClick={() => setSelectedType("all")}
                                aria-pressed={selectedType === "all"}
                                className={chipClass(selectedType === "all")}
                            >
                                All
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedType("favorites")}
                                aria-pressed={selectedType === "favorites"}
                                className={chipClass(selectedType === "favorites")}
                            >
                                Favorites
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedType("pinned")}
                                aria-pressed={selectedType === "pinned"}
                                className={chipClass(selectedType === "pinned")}
                            >
                                Pinned
                            </button>

                            {CONTENT_TYPES.map((type) => (
                                <button
                                    type="button"
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    aria-pressed={selectedType === type}
                                    className={chipClass(selectedType === type)}
                                >
                                    {CONTENT_TYPE_LABELS[type]}
                                </button>
                            ))}
                        </nav>

                        {isLoading ? (
                            <section className="content-grid mt-6" aria-busy="true" aria-label="Loading saved content">
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <div
                                        key={index}
                                        className="h-56 animate-pulse rounded-xl border border-line bg-surface"
                                    >
                                        <div className="m-4 h-3 w-24 rounded bg-surface-2" />
                                        <div className="mx-4 h-4 w-3/4 rounded bg-surface-2" />
                                        <div className="m-4 h-28 rounded-lg bg-surface-2" />
                                    </div>
                                ))}
                            </section>
                        ) : filteredContents.length > 0 ? (
                            <section className="content-grid mt-6" aria-label="Saved content">
                                {filteredContents.map(
                                    ({
                                        _id,
                                        type,
                                        link,
                                        title,
                                        notes,
                                        body,
                                        isFavorite,
                                        isPinned,
                                    }: Content) => (
                                        <Card
                                            key={_id}
                                            id={_id}
                                            type={type}
                                            link={link}
                                            title={title}
                                            notes={notes || ""}
                                            body={body || ""}
                                            isFavorite={
                                                isFavorite
                                            }
                                            isPinned={
                                                isPinned
                                            }
                                            onFavorite={
                                                favoriteContent
                                            }
                                            onPin={
                                                pinContent
                                            }
                                            onDelete={
                                                deleteContent
                                            }
                                            isDeleting={
                                                deletingId ===
                                                _id
                                            }
                                            isFavoriting={
                                                favoritingId ===
                                                _id
                                            }
                                            isPinning={
                                                pinningId ===
                                                _id
                                            }
                                            onEdit={
                                                editContent
                                            }
                                        />
                                    )
                                )}
                            </section>
                        ) : (
                            <section
                                className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center"
                                aria-live="polite"
                            >
                                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted">
                                    <Inbox className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <h2 className="text-base font-semibold text-ink">
                                    {emptyState.title}
                                </h2>

                                <p className="mt-1 max-w-sm text-sm text-muted">
                                    {emptyState.message}
                                </p>

                                {emptyState.showAddButton && (
                                    <div className="mt-5">
                                        <Button
                                            onClick={openAddContent}
                                            size="md"
                                            variant="primary"
                                            text="Add Content"
                                            startIcon={<Plus />}
                                        />
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}
