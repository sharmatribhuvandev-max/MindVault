// Brand mark: two brain halves on the accent color. Matches public/favicon.svg.
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className={`shrink-0 ${className}`}
        >
            <rect width="32" height="32" rx="8" className="fill-accent" />
            <path
                d="M15 8.5c-2.6 0-4.5 1.8-4.6 4.2-1.7.5-2.9 2-2.9 3.8 0 1.4.7 2.6 1.8 3.3-.1 2.3 1.8 4.2 4.2 4.2.6 0 1.1-.1 1.5-.3V8.5Zm2 0c2.6 0 4.5 1.8 4.6 4.2 1.7.5 2.9 2 2.9 3.8 0 1.4-.7 2.6-1.8 3.3.1 2.3-1.8 4.2-4.2 4.2-.6 0-1.1-.1-1.5-.3V8.5Z"
                fill="#fff"
            />
        </svg>
    );
}

export function Logo({ className = "" }: { className?: string }) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <LogoMark />
            <span className="text-[15px] font-semibold tracking-tight text-ink">
                Mind Vault
            </span>
        </span>
    );
}
