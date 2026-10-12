import { useEffect, useRef, useState } from "react";

import { CrossIcon } from "../icons/CrossIcon";

import { Button } from "./Button";

import { Input } from "./Input";

import { BACKEND_URL } from "../config";

import axios from "axios";

type ContentType = "youtube" | "twitter";

interface Tag {
    _id: string;
    name: string;
}

interface Collection {
    _id: string;
    name: string;
}

interface EditContent {
    id: string;
    title: string;
    link: string;
    type: ContentType;
    tags: Tag[];
    notes: string;
    collectionId: string | null;
}

interface CreateContentModalProps {
    open: boolean;
    onClose: () => void;
    editContent?: EditContent | null;
    onUpdated?: () => Promise<void> | void;
}

export function CreateContentModal({
    open,
    onClose,
    editContent = null,
    onUpdated,
}: CreateContentModalProps) {
    const titleInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState("");

    const [link, setLink] = useState("");

    const [notes, setNotes] = useState("");

    const [type, setType] =
        useState<ContentType>("youtube");

    const [tags, setTags] = useState<Tag[]>([]);

    const [selectedTags, setSelectedTags] =
        useState<Tag[]>([]);

    const [selectedTagId, setSelectedTagId] =
        useState("");

    const [collections, setCollections] =
        useState<Collection[]>([]);

    const [selectedCollectionId, setSelectedCollectionId] =
        useState("");

    const [newCollectionName, setNewCollectionName] =
        useState("");

    const [showNewCollectionInput, setShowNewCollectionInput] =
        useState(false);

    const [collectionLoading, setCollectionLoading] =
        useState(false);

    const [newTagName, setNewTagName] = useState("");

    const [showNewTagInput, setShowNewTagInput] =
        useState(false);

    const [loading, setLoading] = useState(false);

    const [tagLoading, setTagLoading] =
        useState(false);

    const [error, setError] = useState("");

    const [tagError, setTagError] = useState("");

    const [collectionError, setCollectionError] =
        useState("");

    const isEditMode = editContent !== null;

    useEffect(() => {
        if (!open) return;

        titleInputRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !loading && !tagLoading && !collectionLoading) {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, loading, tagLoading, collectionLoading, onClose]);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (editContent) {
            setTitle(editContent.title);

            setLink(editContent.link);

            setNotes(editContent.notes || "");

            setType(editContent.type);

            setSelectedTags(editContent.tags || []);

            setSelectedCollectionId(
                editContent.collectionId || ""
            );
        } else {
            setTitle("");

            setLink("");

            setNotes("");

            setType("youtube");

            setSelectedTags([]);

            setSelectedCollectionId("");
        }

        setSelectedTagId("");

        setNewTagName("");

        setShowNewTagInput(false);

        setNewCollectionName("");

        setShowNewCollectionInput(false);

        setError("");

        setTagError("");

        setCollectionError("");

        setLoading(false);

        setTagLoading(false);

        setCollectionLoading(false);
    }, [open, editContent]);

    useEffect(() => {
        if (!open) {
            return;
        }

        fetchTags();

        fetchCollections();
    }, [open]);

    async function fetchTags() {
        const token = localStorage.getItem("token");

        if (!token) {
            setTagError("You are not authenticated.");
            return;
        }

        try {
            const response = await axios.get(
                `${BACKEND_URL}/api/v1/tags`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setTags(response.data.tags || []);
        } catch (error) {
            console.error(
                "Failed to fetch tags:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    setTagError(
                        "Your session has expired. Please sign in again."
                    );
                } else {
                    setTagError(
                        error.response?.data?.message ||
                        "Failed to load tags."
                    );
                }
            } else {
                setTagError("Failed to load tags.");
            }
        }
    }

    async function fetchCollections() {
        const token = localStorage.getItem("token");

        if (!token) {
            setCollectionError(
                "You are not authenticated."
            );
            return;
        }

        try {
            const response = await axios.get(
                `${BACKEND_URL}/api/v1/collections`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
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

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    setCollectionError(
                        "Your session has expired. Please sign in again."
                    );
                } else {
                    setCollectionError(
                        error.response?.data?.message ||
                        "Failed to load collections."
                    );
                }
            } else {
                setCollectionError(
                    "Failed to load collections."
                );
            }
        }
    }

    async function createNewCollection() {
        const trimmedName =
            newCollectionName.trim();

        if (!trimmedName) {
            setCollectionError(
                "Collection name is required."
            );
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            setCollectionError(
                "You are not authenticated."
            );
            return;
        }

        try {
            setCollectionError("");

            setCollectionLoading(true);

            const response = await axios.post(
                `${BACKEND_URL}/api/v1/collections`,
                {
                    name: trimmedName,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const newCollection: Collection =
                response.data.collection;

            setCollections((currentCollections) =>
                [
                    ...currentCollections,
                    newCollection,
                ].sort((a, b) =>
                    a.name.localeCompare(b.name)
                )
            );

            setSelectedCollectionId(
                newCollection._id
            );

            setNewCollectionName("");

            setShowNewCollectionInput(false);
        } catch (error) {
            console.error(
                "Failed to create collection:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    setCollectionError(
                        "Your session has expired. Please sign in again."
                    );
                } else if (
                    error.response?.status === 409
                ) {
                    setCollectionError(
                        "A collection with this name already exists."
                    );
                } else {
                    setCollectionError(
                        error.response?.data?.message ||
                        "Failed to create collection."
                    );
                }
            } else {
                setCollectionError(
                    "Failed to create collection."
                );
            }
        } finally {
            setCollectionLoading(false);
        }
    }

    function addSelectedTag() {
        if (!selectedTagId) {
            return;
        }

        const tag = tags.find(
            (item) => item._id === selectedTagId
        );

        if (!tag) {
            return;
        }

        const alreadySelected = selectedTags.some(
            (item) => item._id === tag._id
        );

        if (!alreadySelected) {
            setSelectedTags((currentTags) => [
                ...currentTags,
                tag,
            ]);
        }

        setSelectedTagId("");
    }

    function removeSelectedTag(tagId: string) {
        setSelectedTags((currentTags) =>
            currentTags.filter(
                (tag) => tag._id !== tagId
            )
        );
    }

    async function createNewTag() {
        const trimmedName = newTagName.trim();

        if (!trimmedName) {
            setTagError("Tag name is required.");
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            setTagError("You are not authenticated.");
            return;
        }

        try {
            setTagError("");

            setTagLoading(true);

            const response = await axios.post(
                `${BACKEND_URL}/api/v1/tags`,
                {
                    name: trimmedName,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const newTag: Tag =
                response.data.tag;

            setTags((currentTags) =>
                [
                    ...currentTags,
                    newTag,
                ].sort((a, b) =>
                    a.name.localeCompare(b.name)
                )
            );

            setSelectedTags((currentTags) => [
                ...currentTags,
                newTag,
            ]);

            setNewTagName("");

            setShowNewTagInput(false);
        } catch (error) {
            console.error(
                "Failed to create tag:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    setTagError(
                        "Your session has expired. Please sign in again."
                    );
                } else {
                    setTagError(
                        error.response?.data?.message ||
                        "Failed to create tag."
                    );
                }
            } else {
                setTagError(
                    "Failed to create tag."
                );
            }
        } finally {
            setTagLoading(false);
        }
    }

    async function submitContent() {

        if (!title.trim() || !link.trim()) {
            setError("Title and link are required.");
            return;
        }

        let parsedLink: URL;

        try {
            parsedLink = new URL(link.trim());
        } catch {
            setError("Please enter a valid URL, including https:// or http://.");
            return;
        }

        if (
            (parsedLink.protocol !== "http:" &&
                parsedLink.protocol !== "https:") ||
            !parsedLink.hostname
        ) {
            setError("Please enter a valid HTTP or HTTPS URL.");
            return;
        }

        if (notes.length > 2000) {
            setError("Notes cannot exceed 2000 characters.");
            return;
        }


        const token = localStorage.getItem("token");

        if (!token) {
            setError("You are not authenticated.");
            return;
        }

        try {
            setError("");

            setLoading(true);

            const tagIds = selectedTags.map(
                (tag) => tag._id
            );

            const collectionId =
                selectedCollectionId || null;

            if (isEditMode) {
                await axios.put(
                    `${BACKEND_URL}/api/v1/content/${editContent.id}`,
                    {
                        title: title.trim(),
                        link: link.trim(),
                        type,
                        tags: tagIds,
                        notes: notes.trim(),
                        collectionId,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (onUpdated) {
                    await onUpdated();
                }
            } else {
                await axios.post(
                    `${BACKEND_URL}/api/v1/content`,
                    {
                        link: link.trim(),
                        title: title.trim(),
                        type,
                        tags: tagIds,
                        collectionId,
                        notes: notes.trim(),
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            }

            onClose();
        } catch (error) {
            console.error(
                "Failed to save content:",
                error
            );

            if (axios.isAxiosError(error)) {
                if (
                    error.response?.status === 401
                ) {
                    setError(
                        "Your session has expired. Please sign in again."
                    );
                } else {
                    setError(
                        error.response?.data?.message ||
                        "Failed to save content. Please try again."
                    );
                }
            } else {
                setError(
                    "Failed to save content. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:items-center sm:p-6">
                    <div
                        className="relative my-auto w-full max-w-xl rounded-xl bg-white p-4 shadow-xl sm:p-6"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="content-modal-title"
                        tabIndex={-1}
                    >
                        <div className="flex justify-between items-center">
                            <h2 id="content-modal-title" className="text-lg font-semibold">
                                {isEditMode
                                    ? "Edit Content"
                                    : "Add Content"}
                            </h2>

                            <button
                                type="button"
                                aria-label="Close content dialog"
                                onClick={() => {
                                    if (!loading && !tagLoading && !collectionLoading) onClose();
                                }}
                                disabled={loading || tagLoading || collectionLoading}
                                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <CrossIcon />
                            </button>
                        </div>

                        <form
                            className="mt-4 max-h-[calc(100dvh-8rem)] space-y-4 overflow-y-auto pr-1"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void submitContent();
                            }}
                        >
                            <Input
                                id="content-title"
                                label="Title"
                                reference={titleInputRef}
                                required
                                disabled={loading}
                                value={title}
                                onChange={(e) => {
                                    setTitle(
                                        e.target.value
                                    );
                                }}
                                placeholder="Title"
                            />

                            <Input
                                id="content-link"
                                label="Link"
                                required
                                disabled={loading}
                                value={link}
                                onChange={(e) => {
                                    setLink(
                                        e.target.value
                                    );
                                }}
                                placeholder="Link"
                            />

                            <div className="mt-3">
                                <label htmlFor="content-notes" className="mb-1 block text-sm font-medium text-gray-800">
                                    Notes
                                </label>

                                <textarea
                                    id="content-notes"
                                    value={notes}
                                    onChange={(event) =>
                                        setNotes(event.target.value)
                                    }
                                    placeholder="Add personal notes (optional)"
                                    maxLength={2000}
                                    rows={4}
                                    disabled={loading}
                                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus-visible:border-violet-600 focus-visible:ring-2 focus-visible:ring-violet-600/20 disabled:bg-gray-100"
                                />

                                <div className="text-xs text-gray-500 text-right mt-1">
                                    {notes.length}/2000
                                </div>
                            </div>

                            <div>
                                <h2 className="text-sm font-semibold text-gray-800">Content type</h2>

                                <div className="flex flex-wrap gap-2 pb-2">
                                    <Button
                                        text="Youtube"
                                        variant={
                                            type ===
                                                "youtube"
                                                ? "primary"
                                                : "secondary"
                                        }
                                        onClick={() => {
                                            setType(
                                                "youtube"
                                            );
                                        }}
                                    />

                                    <Button
                                        text="Twitter"
                                        variant={
                                            type ===
                                                "twitter"
                                                ? "primary"
                                                : "secondary"
                                        }
                                        onClick={() => {
                                            setType(
                                                "twitter"
                                            );
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mt-3">
                                <label htmlFor="content-collection" className="mb-1 block text-sm font-semibold text-gray-800">
                                    Collection
                                </label>

                                <select
                                    id="content-collection"
                                    value={
                                        selectedCollectionId
                                    }
                                    onChange={(event) =>
                                        setSelectedCollectionId(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        loading ||
                                        collectionLoading
                                    }
                                    className="
                                            w-full
                                            border
                                            border-gray-300
                                            rounded-md
                                            px-3
                                            py-2
                                            bg-white
                                            mt-2
                                        "
                                >
                                    <option value="">
                                        No collection
                                    </option>

                                    {collections.map(
                                        (collection) => (
                                            <option
                                                key={
                                                    collection._id
                                                }
                                                value={
                                                    collection._id
                                                }
                                            >
                                                {
                                                    collection.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNewCollectionInput(
                                            (current) =>
                                                !current
                                        )
                                    }
                                    disabled={
                                        loading ||
                                        tagLoading ||
                                        collectionLoading
                                    }
                                    className="
                                            mt-2
                                            text-sm
                                            text-blue-500
                                            hover:text-blue-700
                                            disabled:text-gray-400
                                        "
                                >
                                    {showNewCollectionInput
                                        ? "Cancel"
                                        : "+ Create new collection"}
                                </button>

                                {showNewCollectionInput && (
                                    <div className="mt-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={
                                                    newCollectionName
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setNewCollectionName(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="New collection name"
                                                maxLength={
                                                    50
                                                }
                                                disabled={
                                                    collectionLoading ||
                                                    loading
                                                }
                                                className="
                                                        flex-1
                                                        border
                                                        border-gray-300
                                                        rounded-md
                                                        px-3
                                                        py-2
                                                        outline-none
                                                        focus:border-gray-500
                                                    "
                                            />

                                            <button
                                                type="button"
                                                onClick={
                                                    createNewCollection
                                                }
                                                disabled={
                                                    !newCollectionName.trim() ||
                                                    collectionLoading ||
                                                    loading
                                                }
                                                className="
                                                        px-3
                                                        py-2
                                                        rounded-md
                                                        bg-black
                                                        text-white
                                                        disabled:bg-gray-300
                                                    "
                                            >
                                                {collectionLoading
                                                    ? "Creating..."
                                                    : "Create"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {collectionError && (
                                    <div className="text-red-500 text-sm mt-2">
                                        {
                                            collectionError
                                        }
                                    </div>
                                )}
                            </div>

                            <div className="mt-3">
                                <h2 className="mb-1 text-sm font-semibold text-gray-800">
                                    Tags
                                </h2>

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedTags.length ===
                                        0 ? (
                                        <p className="text-sm text-gray-500">
                                            No tags selected.
                                        </p>
                                    ) : (
                                        selectedTags.map(
                                            (tag) => (
                                                <div
                                                    key={
                                                        tag._id
                                                    }
                                                    className="
                                                            flex
                                                            items-center
                                                            gap-1
                                                            bg-gray-200
                                                            rounded-full
                                                            px-3
                                                            py-1
                                                            text-sm
                                                        "
                                                >
                                                    <span>
                                                        #
                                                        {
                                                            tag.name
                                                        }
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeSelectedTag(
                                                                tag._id
                                                            )
                                                        }
                                                        disabled={
                                                            loading
                                                        }
                                                        className="
                                                                text-gray-500
                                                                hover:text-red-500
                                                                disabled:text-gray-400
                                                            "
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )
                                        )
                                    )}
                                </div>

                                <div className="flex gap-2 mt-3">
                                    <select
                                        value={
                                            selectedTagId
                                        }
                                        onChange={(event) =>
                                            setSelectedTagId(
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            loading ||
                                            tagLoading
                                        }
                                        className="
                                                flex-1
                                                border
                                                border-gray-300
                                                rounded-md
                                                px-3
                                                py-2
                                                bg-white
                                            "
                                    >
                                        <option value="">
                                            Select a tag
                                        </option>

                                        {tags
                                            .filter(
                                                (tag) =>
                                                    !selectedTags.some(
                                                        (
                                                            selectedTag
                                                        ) =>
                                                            selectedTag._id ===
                                                            tag._id
                                                    )
                                            )
                                            .map(
                                                (tag) => (
                                                    <option
                                                        key={
                                                            tag._id
                                                        }
                                                        value={
                                                            tag._id
                                                        }
                                                    >
                                                        {
                                                            tag.name
                                                        }
                                                    </option>
                                                )
                                            )}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={
                                            addSelectedTag
                                        }
                                        disabled={
                                            !selectedTagId ||
                                            loading ||
                                            tagLoading
                                        }
                                        className="
                                                px-3
                                                py-2
                                                rounded-md
                                                border
                                                bg-white
                                                hover:bg-gray-50
                                                disabled:text-gray-400
                                            "
                                    >
                                        Add
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNewTagInput(
                                            (current) =>
                                                !current
                                        )
                                    }
                                    disabled={
                                        loading ||
                                        tagLoading
                                    }
                                    className="
                                            mt-2
                                            text-sm
                                            text-blue-500
                                            hover:text-blue-700
                                            disabled:text-gray-400
                                        "
                                >
                                    {showNewTagInput
                                        ? "Cancel"
                                        : "+ Create new tag"}
                                </button>

                                {showNewTagInput && (
                                    <div className="mt-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={
                                                    newTagName
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setNewTagName(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="New tag name"
                                                disabled={
                                                    tagLoading ||
                                                    loading
                                                }
                                                className="
                                                        flex-1
                                                        border
                                                        border-gray-300
                                                        rounded-md
                                                        px-3
                                                        py-2
                                                        outline-none
                                                        focus:border-gray-500
                                                    "
                                            />

                                            <button
                                                type="button"
                                                onClick={
                                                    createNewTag
                                                }
                                                disabled={
                                                    !newTagName.trim() ||
                                                    tagLoading ||
                                                    loading
                                                }
                                                className="
                                                        px-3
                                                        py-2
                                                        rounded-md
                                                        bg-black
                                                        text-white
                                                        disabled:bg-gray-300
                                                    "
                                            >
                                                {tagLoading
                                                    ? "Adding..."
                                                    : "Create"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {tagError && (
                                    <div role="alert" aria-live="polite" className="mt-2 text-sm text-red-700">
                                        {tagError}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div role="alert" aria-live="polite" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 mt-2">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading || tagLoading || collectionLoading}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || tagLoading || collectionLoading}
                                    className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading
                                        ? isEditMode ? "Saving changes…" : "Adding content…"
                                        : isEditMode ? "Save changes" : "Add content"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
