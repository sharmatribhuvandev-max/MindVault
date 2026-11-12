import { useEffect, useSyncExternalStore } from "react";

// "system" follows the OS setting; the other two are explicit choices.
export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

// Also read by the inline script in index.html, which applies the theme
// before React loads so the page never flashes the wrong colors.
export const THEME_STORAGE_KEY = "mindvault-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
            return stored;
        }
    } catch {
        // Storage can be blocked; fall back to the system theme.
    }
    return "system";
}

function systemPrefersDark(): boolean {
    return typeof window.matchMedia === "function"
        && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
    if (choice === "system") {
        return systemPrefersDark() ? "dark" : "light";
    }
    return choice;
}

function applyTheme(choice: ThemeChoice) {
    document.documentElement.dataset.theme = resolveTheme(choice);
}

export function setThemeChoice(choice: ThemeChoice) {
    try {
        if (choice === "system") {
            localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
            localStorage.setItem(THEME_STORAGE_KEY, choice);
        }
    } catch {
        // Not persisted, but still applied for this page view.
    }
    currentChoice = choice;
    applyTheme(choice);
    listeners.forEach((listener) => listener());
}

let currentChoice: ThemeChoice = readChoice();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useTheme() {
    const choice = useSyncExternalStore(subscribe, () => currentChoice);

    // While following the system, react to OS theme changes live.
    useEffect(() => {
        if (choice !== "system" || typeof window.matchMedia !== "function") {
            return;
        }

        const media = window.matchMedia(DARK_QUERY);
        const update = () => {
            applyTheme("system");
            listeners.forEach((listener) => listener());
        };

        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, [choice]);

    return {
        choice,
        resolved: resolveTheme(choice),
        setChoice: setThemeChoice,
    };
}
