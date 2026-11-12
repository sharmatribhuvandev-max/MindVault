import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemeChoice } from "../theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
    { value: "system", label: "System", Icon: Monitor },
];

// "segmented": three-way Light / Dark / System control (sidebar).
// "icon": a single button that flips between light and dark (headers).
export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "segmented" }) {
    const { choice, resolved, setChoice } = useTheme();

    if (variant === "segmented") {
        return (
            <div
                role="radiogroup"
                aria-label="Color theme"
                className="grid grid-cols-3 gap-0.5 rounded-lg bg-surface-2 p-0.5"
            >
                {OPTIONS.map(({ value, label, Icon }) => {
                    const selected = choice === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            title={`${label} theme`}
                            onClick={() => setChoice(value)}
                            className={`flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
                                selected
                                    ? "bg-surface text-ink shadow-soft"
                                    : "text-muted hover:text-ink"
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {label}
                        </button>
                    );
                })}
            </div>
        );
    }

    const next = resolved === "dark" ? "light" : "dark";
    const Icon = resolved === "dark" ? Sun : Moon;

    return (
        <button
            type="button"
            onClick={() => setChoice(next)}
            aria-label={`Switch to ${next} theme`}
            title={`Switch to ${next} theme`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
    );
}
