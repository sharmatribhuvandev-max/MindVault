import type { ReactElement } from "react";

export function SidebarItem({ text, icon }: {
    text: string;
    icon: ReactElement;
}) {
    return <div className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-200 rounded max-w-48 pl-4 transition-all duration-150 cursor-pointer">
        <div className="w-5 h-5 flex items-center justify-center">
            {icon}
        </div>
        <div>
            {text}
        </div>
    </div>
}