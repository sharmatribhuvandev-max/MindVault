import { BrainIcon } from "../icons/BrainIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { SidebarItem } from "./SidebarItem";

type ContentFilter =
    | "all"
    | "favorites"
    | "pinned"
    | "twitter"
    | "youtube";

interface Collection {
    _id: string;
    name: string;
}

interface SidebarProps {
    selectedType: ContentFilter;
    onSelectType: (type: ContentFilter) => void;

    collections: Collection[];
    selectedCollectionId: string | null;
    onSelectCollection: (
        collectionId: string | null
    ) => void;

    onDeleteCollection: (
        collectionId: string
    ) => void;

    deletingCollectionId: string | null;
}

export function Sidebar({
    selectedType,
    onSelectType,
    collections,
    selectedCollectionId,
    onSelectCollection,
    onDeleteCollection,
    deletingCollectionId,
}: SidebarProps) {
    return (
        <div className="h-screen bg-white w-72 fixed left-0 top-0 pl-6">
            <div className="flex text-2xl pt-4 items-center">
                <div className="pr-2">
                    <BrainIcon />
                </div>

                Brainly
            </div>

            <div className="pt-8 pl-4">
                <SidebarItem
                    text="All"
                    icon={<BrainIcon />}
                    active={
                        selectedType === "all" &&
                        selectedCollectionId === null
                    }
                    onClick={() => {
                        onSelectType("all");
                        onSelectCollection(null);
                    }}
                />

                <SidebarItem
                    text="Twitter"
                    icon={<TwitterIcon />}
                    active={
                        selectedType === "twitter" &&
                        selectedCollectionId === null
                    }
                    onClick={() => {
                        onSelectType("twitter");
                        onSelectCollection(null);
                    }}
                />

                <SidebarItem
                    text="YouTube"
                    icon={<YouTubeIcon />}
                    active={
                        selectedType === "youtube" &&
                        selectedCollectionId === null
                    }
                    onClick={() => {
                        onSelectType("youtube");
                        onSelectCollection(null);
                    }}
                />

                {collections.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-sm font-semibold text-gray-500 mb-2">
                            Collections
                        </h2>

                        {collections.map(
                            (collection) => (
                                <div
                                    key={
                                        collection._id
                                    }
                                    className="flex items-center gap-1 pr-2"
                                >
                                    <div className="flex-1 min-w-0">
                                        <SidebarItem
                                            text={
                                                collection.name
                                            }
                                            icon={
                                                <BrainIcon />
                                            }
                                            active={
                                                selectedCollectionId ===
                                                collection._id
                                            }
                                            onClick={() =>
                                                onSelectCollection(
                                                    collection._id
                                                )
                                            }
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onDeleteCollection(
                                                collection._id
                                            )
                                        }
                                        disabled={
                                            deletingCollectionId ===
                                            collection._id
                                        }
                                        title="Delete collection"
                                        className="flex-shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed px-2"
                                    >
                                        {deletingCollectionId ===
                                        collection._id
                                            ? "..."
                                            : "×"}
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}