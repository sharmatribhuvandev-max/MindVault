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
            className={`sidebar-item flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] transition-colors ${
                active
                    ? "bg-surface-3 font-medium text-ink"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
        >
            <span
                className="flex h-4 w-4 flex-shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4"
                aria-hidden="true"
            >
                {icon}
            </span>

            <span className="min-w-0 flex-1 truncate">{text}</span>
        </button>
    );
}
