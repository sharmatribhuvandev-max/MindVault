import { useCallback, useEffect, useMemo, useState } from "react";

import "../App.css";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";

import { PlusIcon } from "../icons/PlusIcon";
import { ShareIcon } from "../icons/ShareIcon";

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

    const { contents, refresh, error: contentError } = useContent();
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

    const filteredContents = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase();

        return contents.filter(
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
    }, [
        contents,
        searchQuery,
        selectedType,
        selectedCollectionId,
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

            const shareUrl =
                `${window.location.origin}/share/${response.data.hash}`;

            await navigator.clipboard.writeText(
                shareUrl
            );

            setSharingEnabled(true);

            alert(
                "Share link copied to clipboard!"
            );
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
                    {isGuest && (
                        <div
                            className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900"
                            role="status"
                        >
                            <span>
                                <strong>You're exploring a demo account.</strong>{" "}
                                Add, edit or delete anything. It's all reset after 24 hours.
                            </span>
                            <Link
                                to="/signup"
                                className="font-semibold text-violet-700 underline-offset-4 hover:underline"
                            >
                                Create your own account →
                            </Link>
                        </div>
                    )}

                    <div className="dashboard-mobile-toolbar">
                        <button
                            type="button"
                            className="dashboard-menu-button"
                            onClick={() => setSidebarOpen(true)}
                            aria-expanded={sidebarOpen}
                            aria-controls="mindvault-sidebar"
                            aria-label="Open navigation menu"
                        >
                            <span className="dashboard-menu-icon" aria-hidden="true">☰</span>
                            <span>Menu</span>
                        </button>
                        <span className="dashboard-mobile-brand">Mind Vault</span>
                    </div>

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

                    <header className="dashboard-header">
                        <div className="dashboard-heading">
                            <p className="dashboard-eyebrow">Your personal knowledge space</p>
                            <h1 className="dashboard-title">My Brain</h1>
                            <p className="dashboard-subtitle">Keep your ideas, useful links, and learning notes in one place.</p>
                        </div>

                        <div className="dashboard-actions">
                            <Button
                                onClick={() => {
                                    setEditingContent(
                                        null
                                    );

                                    setModalOpen(true);
                                }}
                                size="md"
                                variant="primary"
                                text="Add Content"
                                startIcon={
                                    <PlusIcon />
                                }
                            />

                            {sharingEnabled ? (
                                <Button
                                    onClick={
                                        disableSharing
                                    }
                                    variant="secondary"
                                    text="Disable Sharing"
                                    startIcon={
                                        <ShareIcon />
                                    }
                                />
                            ) : (
                                <Button
                                    onClick={
                                        createShareLink
                                    }
                                    variant="secondary"
                                    text="Share Brain"
                                    startIcon={
                                        <ShareIcon />
                                    }
                                />
                            )}
                        </div>
                    </header>

                    {deleteError && (
                        <div className="dashboard-feedback mt-4 border border-red-300 bg-red-50 text-red-700">
                            {deleteError}
                        </div>
                    )}
                    {contentError && (
                        <div
                            className="dashboard-feedback mt-4 border border-red-300 bg-red-50 text-red-700"
                            role="alert"
                            aria-live="polite"
                        >
                            {contentError}
                        </div>
                    )}

                    <section className="dashboard-search-section">
                        <div className="dashboard-search-wrap relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                🔍
                            </span>

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
                                placeholder="Search your content..."
                                aria-label="Search saved content"
                                className="dashboard-search w-full border bg-white py-3 pl-10 pr-4 outline-none"
                            />
                        </div>
                    </section>

                    <nav className="dashboard-filters" aria-label="Filter saved content">
                        <button
                            onClick={() =>
                                setSelectedType(
                                    "all"
                                )
                            }
                            className={`px-4 py-2 rounded-md border ${selectedType ===
                                "all"
                                ? "bg-black text-white"
                                : "bg-white text-gray-700"
                                }`}
                        >
                            All
                        </button>

                        {CONTENT_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() =>
                                    setSelectedType(type)
                                }
                                className={`px-4 py-2 rounded-md border ${selectedType ===
                                    type
                                    ? "bg-black text-white"
                                    : "bg-white text-gray-700"
                                    }`}
                            >
                                {CONTENT_TYPE_LABELS[type]}
                            </button>
                        ))}

                        <button
                            onClick={() =>
                                setSelectedType(
                                    "favorites"
                                )
                            }
                            className={`px-4 py-2 rounded-md border ${selectedType ===
                                "favorites"
                                ? "bg-black text-white"
                                : "bg-white text-gray-700"
                                }`}
                        >
                            Favorites
                        </button>

                        <button
                            onClick={() =>
                                setSelectedType(
                                    "pinned"
                                )
                            }
                            className={`px-4 py-2 rounded-md border ${selectedType ===
                                "pinned"
                                ? "bg-black text-white"
                                : "bg-white text-gray-700"
                                }`}
                        >
                            Pinned
                        </button>
                    </nav>

                    {filteredContents.length >
                        0 ? (
                        <section className="dashboard-content-grid" aria-label="Saved content">
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
                        <section className="dashboard-empty-state" aria-live="polite">
                            <h2 className="text-2xl font-semibold text-gray-800">
                                {
                                    emptyState.title
                                }
                            </h2>

                            <p className="mt-2 text-gray-500">
                                {
                                    emptyState.message
                                }
                            </p>

                            {emptyState.showAddButton && (
                                <div className="mt-5">
                                    <Button
                                        onClick={() => {
                                            setEditingContent(
                                                null
                                            );

                                            setModalOpen(
                                                true
                                            );
                                        }}
                                        size="md"
                                        variant="primary"
                                        text="Add Content"
                                        startIcon={
                                            <PlusIcon />
                                        }
                                    />
                                </div>
                            )}
                        </section>
                    )}
                </main>
            </div>
        </>
    );
}