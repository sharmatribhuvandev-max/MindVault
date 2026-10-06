import { BrainIcon } from "../icons/BrainIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";import { SidebarItem } from "./SidebarItem";

type ContentFilter = "all" | "twitter" | "youtube";

interface SidebarProps {
    selectedType: ContentFilter;
    onSelectType: (type: ContentFilter) => void;
}

export function Sidebar({
    selectedType,
    onSelectType,
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
                    active={selectedType === "all"}
                    onClick={() => onSelectType("all")}
                />

                <SidebarItem
                    text="Twitter"
                    icon={<TwitterIcon />}
                    active={selectedType === "twitter"}
                    onClick={() => onSelectType("twitter")}
                />

                <SidebarItem
                    text="YouTube"
                    icon={<YouTubeIcon />}
                    active={selectedType === "youtube"}
                    onClick={() => onSelectType("youtube")}
                />
            </div>
        </div>
    );
}