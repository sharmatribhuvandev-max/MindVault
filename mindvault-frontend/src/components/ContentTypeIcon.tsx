import type { ContentType } from "../contentTypes";
import { ArticleIcon } from "../icons/ArticleIcon";
import { NoteIcon } from "../icons/NoteIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";

export function ContentTypeIcon({ type }: { type: ContentType }) {
    switch (type) {
        case "youtube":
            return <YouTubeIcon />;
        case "twitter":
            return <TwitterIcon />;
        case "article":
            return <ArticleIcon />;
        case "note":
            return <NoteIcon />;
    }
}
