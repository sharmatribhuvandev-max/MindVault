import type { ReactElement } from "react";

interface SidebarItemProps {
    text: string;
    icon: ReactElement;
    active?: boolean;
    onClick: () => void;
}

export function SidebarItem({
    text,
    icon,
    active = false,
    onClick,
}: SidebarItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`sidebar-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                active
                    ? "bg-violet-100 text-violet-950"
                    : "text-gray-700 hover:bg-gray-100"
            }`}
        >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center" aria-hidden="true">
                {icon}
            </span>

            <span className="min-w-0 flex-1 break-words">{text}</span>
        </button>
    );
}
