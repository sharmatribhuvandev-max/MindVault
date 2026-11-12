import { useEffect, useRef, useState } from "react";

import { X } from "lucide-react";

import { ContentTypeIcon } from "./ContentTypeIcon";

import { Input } from "./Input";

import { BACKEND_URL } from "../config";

import axios from "axios";

import {
    CONTENT_TYPES,
    CONTENT_TYPE_LABELS,
    NOTE_BODY_MAX_LENGTH,
    detectContentType,
    requiresLink,
    type ContentType,
} from "../contentTypes";

// Small filled button used for the inline "Create" actions.
const SMALL_SOLID_BUTTON =
    "inline-flex h-10 shrink-0 items-center rounded-lg bg-ink px-3 text-sm font-medium text-canvas transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

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
    body?: string;
    collectionId: string | null;
}

interface CreateContentModalProps {
    open: boolean;
    onClose: () => void;
    editContent?: EditContent | null;
    onUpdated?: () => Promise<void> | void;
}

type LoadResult<T> =
    | { ok: true; data: T[] }
    | { ok: false; error: string };

// Fetches GET /api/v1/<resource>, which responds with { <resource>: [...] }.
async function loadList<T>(
    resource: "tags" | "collections"
): Promise<LoadResult<T>> {
    const token = localStorage.getItem("token");

    if (!token) {
        return { ok: false, error: "You are not authenticated." };
    }

    try {
        const response = await axios.get(
            `${BACKEND_URL}/api/v1/${resource}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        return { ok: true, data: response.data[resource] || [] };
    } catch (error) {
        console.error(`Failed to fetch ${resource}:`, error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                return {
                    ok: false,
                    error: "Your session has expired. Please sign in again.",
                };
            }

            return {
                ok: false,
                error:
                    error.response?.data?.message ||
                    `Failed to load ${resource}.`,
            };
        }

        return { ok: false, error: `Failed to load ${resource}.` };
    }
}

export function CreateContentModal(
    props: CreateContentModalProps
) {
    if (!props.open) {
        return <div />;
    }

    // Mount a fresh form on every open, and whenever a different item
    // is edited, so form state always starts from `editContent`.
    return (
        <ContentModalForm
            key={props.editContent?.id ?? "new"}
            {...props}
        />
    );
}

function ContentModalForm({
    open,
    onClose,
    editContent = null,
    onUpdated,
}: CreateContentModalProps) {
    const titleInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState(
        editContent?.title ?? ""
    );

    const [link, setLink] = useState(
        editContent?.link ?? ""
    );

    const [notes, setNotes] = useState(
        editContent?.notes || ""
    );

    const [type, setType] = useState<ContentType>(
        editContent?.type ?? "article"
    );

    const [body, setBody] = useState(
        editContent?.body || ""
    );

    // Once the user picks a type themselves (or is editing an existing
    // item), stop overriding it from the link.
    const [typeChosenManually, setTypeChosenManually] =
        useState(editContent !== null);

    const [typeWasDetected, setTypeWasDetected] =
        useState(false);

    function handleLinkChange(value: string) {
        setLink(value);

        if (typeChosenManually) {
            return;
        }

        const detected = detectContentType(value);

        if (detected) {
            setType(detected);
            setTypeWasDetected(true);
        } else {
            setTypeWasDetected(false);
        }
    }

    function chooseType(nextType: ContentType) {
        setType(nextType);
        setTypeChosenManually(true);
        setTypeWasDetected(false);
    }

    const linkRequired = requiresLink(type);

    const [tags, setTags] = useState<Tag[]>([]);

    const [selectedTags, setSelectedTags] =
        useState<Tag[]>(editContent?.tags || []);

    const [selectedTagId, setSelectedTagId] =
        useState("");

    const [collections, setCollections] =
        useState<Collection[]>([]);

    const [selectedCollectionId, setSelectedCollectionId] =
        useState(editContent?.collectionId || "");

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

    // Load the user's tags and collections when the form mounts.
    useEffect(() => {
        let ignore = false;

        void loadList<Tag>("tags").then((result) => {
            if (ignore) return;
            if (result.ok) setTags(result.data);
            else setTagError(result.error);
        });

        void loadList<Collection>("collections").then((result) => {
            if (ignore) return;
            if (result.ok) setCollections(result.data);
            else setCollectionError(result.error);
        });

        return () => {
            ignore = true;
        };
    }, []);

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

        if (!title.trim() || (linkRequired && !link.trim())) {
            setError(
                linkRequired
                    ? "Title and link are required."
                    : "Title is required."
            );
            return;
        }

        if (link.trim()) {
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
        }

        if (type === "note" && !body.trim()) {
            setError("Write something in your note.");
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
                        ...(type === "note" && { body: body.trim() }),
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
                        ...(type === "note" && { body: body.trim() }),
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

    const busy = loading || tagLoading || collectionLoading;

    return (
        <div>
            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-[2px] sm:items-center sm:p-6">
                    <div
                        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-float sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="content-modal-title"
                        tabIndex={-1}
                    >
                        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
                            <h2 id="content-modal-title" className="text-base font-semibold text-ink">
                                {isEditMode
                                    ? "Edit Content"
                                    : "Add Content"}
                            </h2>

                            <button
                                type="button"
                                aria-label="Close content dialog"
                                onClick={() => {
                                    if (!busy) onClose();
                                }}
                                disabled={busy}
                                className="-mr-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <X className="h-[18px] w-[18px]" aria-hidden="true" />
                            </button>
                        </div>

                        <form
                            className="flex min-h-0 flex-1 flex-col"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void submitContent();
                            }}
                        >
                            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
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
                                    label={linkRequired ? "Link" : "Link (optional)"}
                                    required={linkRequired}
                                    disabled={loading}
                                    value={link}
                                    onChange={(e) =>
                                        handleLinkChange(e.target.value)
                                    }
                                    placeholder="Paste a link"
                                />

                                <div>
                                    <h3 id="content-type-heading" className="mb-1.5 text-[13px] font-medium text-ink-2">
                                        Type
                                    </h3>

                                    <div
                                        className="flex flex-wrap gap-1.5"
                                        role="group"
                                        aria-labelledby="content-type-heading"
                                    >
                                        {CONTENT_TYPES.map((option) => {
                                            const selected = type === option;
                                            return (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    aria-pressed={selected}
                                                    onClick={() => chooseType(option)}
                                                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5 ${
                                                        selected
                                                            ? "border-accent bg-accent-soft text-accent-text"
                                                            : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"
                                                    }`}
                                                >
                                                    <span aria-hidden="true" className="flex">
                                                        <ContentTypeIcon type={option} />
                                                    </span>
                                                    {CONTENT_TYPE_LABELS[option]}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <p className="mt-1.5 text-xs text-muted" aria-live="polite">
                                        {typeWasDetected
                                            ? `Detected ${CONTENT_TYPE_LABELS[type]} from the link.`
                                            : "Paste a link and the type is picked for you."}
                                    </p>
                                </div>

                                {type === "note" && (
                                    <div>
                                        <label htmlFor="content-body" className="mb-1.5 block text-[13px] font-medium text-ink-2">
                                            Note <span className="text-faint" aria-hidden="true">*</span>
                                        </label>

                                        <textarea
                                            id="content-body"
                                            value={body}
                                            onChange={(event) =>
                                                setBody(event.target.value)
                                            }
                                            placeholder="Write your note..."
                                            maxLength={NOTE_BODY_MAX_LENGTH}
                                            rows={6}
                                            required
                                            disabled={loading}
                                            className="field leading-relaxed"
                                        />

                                        <div className="mt-1 text-right text-xs tabular-nums text-faint">
                                            {body.length}/{NOTE_BODY_MAX_LENGTH}
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <label htmlFor="content-collection" className="text-[13px] font-medium text-ink-2">
                                                Collection
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowNewCollectionInput(
                                                        (current) =>
                                                            !current
                                                    )
                                                }
                                                disabled={busy}
                                                className="text-xs font-medium text-accent-text hover:underline disabled:text-faint disabled:no-underline"
                                            >
                                                {showNewCollectionInput
                                                    ? "Cancel"
                                                    : "+ Create new collection"}
                                            </button>
                                        </div>

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
                                            className="field"
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

                                        {showNewCollectionInput && (
                                            <div className="mt-2 flex gap-2">
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
                                                    aria-label="New collection name"
                                                    maxLength={
                                                        50
                                                    }
                                                    disabled={
                                                        collectionLoading ||
                                                        loading
                                                    }
                                                    className="field min-w-0 flex-1"
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
                                                    className={SMALL_SOLID_BUTTON}
                                                >
                                                    {collectionLoading
                                                        ? "Creating..."
                                                        : "Create"}
                                                </button>
                                            </div>
                                        )}

                                        {collectionError && (
                                            <div className="mt-2 text-sm text-danger">
                                                {
                                                    collectionError
                                                }
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <h3 className="text-[13px] font-medium text-ink-2">
                                                Tags
                                            </h3>

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
                                                className="text-xs font-medium text-accent-text hover:underline disabled:text-faint disabled:no-underline"
                                            >
                                                {showNewTagInput
                                                    ? "Cancel"
                                                    : "+ Create new tag"}
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
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
                                                aria-label="Select a tag"
                                                className="field min-w-0 flex-1"
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
                                                className="inline-flex h-10 shrink-0 items-center rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-surface"
                                            >
                                                Add
                                            </button>
                                        </div>

                                        {showNewTagInput && (
                                            <div className="mt-2 flex gap-2">
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
                                                    aria-label="New tag name"
                                                    disabled={
                                                        tagLoading ||
                                                        loading
                                                    }
                                                    className="field min-w-0 flex-1"
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
                                                    className={SMALL_SOLID_BUTTON}
                                                >
                                                    {tagLoading
                                                        ? "Adding..."
                                                        : "Create"}
                                                </button>
                                            </div>
                                        )}

                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {selectedTags.length ===
                                                0 ? (
                                                <p className="text-xs text-faint">
                                                    No tags selected.
                                                </p>
                                            ) : (
                                                selectedTags.map(
                                                    (tag) => (
                                                        <span
                                                            key={
                                                                tag._id
                                                            }
                                                            className="inline-flex h-6 items-center gap-0.5 rounded-full bg-surface-2 pl-2.5 pr-1 text-xs font-medium text-ink-2"
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
                                                                aria-label={`Remove tag ${tag.name}`}
                                                                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-faint hover:bg-surface-3 hover:text-ink disabled:opacity-50"
                                                            >
                                                                <X className="h-3 w-3" aria-hidden="true" />
                                                            </button>
                                                        </span>
                                                    )
                                                )
                                            )}
                                        </div>

                                        {tagError && (
                                            <div role="alert" aria-live="polite" className="mt-2 text-sm text-danger">
                                                {tagError}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="content-notes" className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
                                        Private notes
                                    </label>

                                    <textarea
                                        id="content-notes"
                                        value={notes}
                                        onChange={(event) =>
                                            setNotes(event.target.value)
                                        }
                                        placeholder="Only you can see these (optional)"
                                        maxLength={2000}
                                        rows={3}
                                        disabled={loading}
                                        className="field leading-relaxed"
                                    />

                                    <div className="mt-1 text-right text-xs tabular-nums text-faint">
                                        {notes.length}/2000
                                    </div>
                                </div>

                                {error && (
                                    <div role="alert" aria-live="polite" className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
                                        {error}
                                    </div>
                                )}
                            </div>

                            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3.5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={busy}
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink transition hover:bg-surface-2 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-ink shadow-soft transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
