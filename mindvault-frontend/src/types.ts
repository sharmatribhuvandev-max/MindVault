import type { ContentType } from "./contentTypes";

export type { ContentType };

export interface Tag {
    _id: string;
    name: string;
}

export interface Collection {
    _id: string;
    name: string;
}

export interface Content {
    _id: string;
    title: string;
    link: string;
    type: ContentType;
    tags: Tag[];
    isFavorite: boolean;
    isPinned: boolean;
    notes?: string;
    body?: string;
    collectionId: string | Collection | null;
    createdAt?: string;
}
