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
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded max-w-48 pl-4 transition-all duration-150 cursor-pointer ${
                active
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-700 hover:bg-gray-200"
            }`}
        >
            <div className="w-5 h-5 flex items-center justify-center">
                {icon}
            </div>

            <div>{text}</div>
        </div>
    );
}