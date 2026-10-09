import { useEffect, useMemo, useState } from "react";

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

import { useNavigate } from "react-router-dom";

type ContentType = "twitter" | "youtube";

type ContentFilter =
    | "all"
    | "favorites"
    | "pinned"
    | ContentType;

interface Tag {
    _id: string;
    name: string;
}

interface Collection {
    _id: string;
    name: string;
}

interface Content {
    _id: string;
    title: string;
    link: string;
    type: ContentType;
    tags: Tag[];
    isFavorite: boolean;
    isPinned: boolean;
    notes?: string;
    collectionId:
    | string
    | {
        _id: string;
        name: string;
    }
    | null;
}

export default function Dashboard() {
    const [modalOpen, setModalOpen] =
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

    const { contents, refresh } = useContent();

    const navigate = useNavigate();

    useEffect(() => {
        refresh();
        fetchCollections();
    }, [modalOpen]);

    async function fetchCollections() {
        const token =
            localStorage.getItem("token");

        if (!token) {
            return;
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

            setCollections(
                response.data.collections || []
            );
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
        }
    }

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

    function logout() {
        localStorage.removeItem("token");

        navigate("/signin");
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

        if (selectedType === "youtube") {
            return {
                title:
                    "No YouTube content found.",
                message:
                    "Try adding some YouTube content.",
                showAddButton: false,
            };
        }

        if (selectedType === "twitter") {
            return {
                title:
                    "No Twitter content found.",
                message:
                    "Try adding some Twitter content.",
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
            <div>
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
                />

                <div className="p-4 ml-72 min-h-screen bg-gray-100">
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

                    <div className="flex justify-end gap-4">
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

                        <Button
                            onClick={logout}
                            variant="secondary"
                            text="Logout"
                        />
                    </div>

                    {deleteError && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                            {deleteError}
                        </div>
                    )}

                    <div className="mt-6">
                        <div className="relative max-w-xl">
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
                                className="w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-4 outline-none focus:border-gray-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
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

                        <button
                            onClick={() =>
                                setSelectedType(
                                    "youtube"
                                )
                            }
                            className={`px-4 py-2 rounded-md border ${selectedType ===
                                "youtube"
                                ? "bg-black text-white"
                                : "bg-white text-gray-700"
                                }`}
                        >
                            YouTube
                        </button>

                        <button
                            onClick={() =>
                                setSelectedType(
                                    "twitter"
                                )
                            }
                            className={`px-4 py-2 rounded-md border ${selectedType ===
                                "twitter"
                                ? "bg-black text-white"
                                : "bg-white text-gray-700"
                                }`}
                        >
                            Twitter
                        </button>

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
                    </div>

                    {filteredContents.length >
                        0 ? (
                        <div className="flex gap-4 flex-wrap mt-4">
                            {filteredContents.map(
                                ({
                                    _id,
                                    type,
                                    link,
                                    title,
                                    notes,
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
                        </div>
                    ) : (
                        <div className="mt-12 flex flex-col items-center justify-center text-center">
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
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}