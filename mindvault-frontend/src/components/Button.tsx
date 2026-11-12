import type { ReactElement } from "react";

interface ButtonProps {
    variant: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    text: string;
    startIcon?: ReactElement;
    endIcon?: ReactElement;
    onClick?: () => void;
    fullWidth?: boolean;
    loading?: boolean;
}

const variantStyles = {
    primary:
        "bg-accent text-accent-ink shadow-soft hover:bg-accent-hover",
    secondary:
        "border border-line-strong bg-surface text-ink shadow-soft hover:bg-surface-2",
    ghost:
        "text-muted hover:bg-surface-2 hover:text-ink",
};

const sizeStyles = {
    sm: "h-8 gap-1.5 px-2.5 text-[13px]",
    md: "h-9 gap-2 px-3.5 text-sm",
    lg: "h-11 gap-2 px-5 text-[15px]",
};

const defaultStyles =
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0";

export function Button({
    variant,
    size = "md",
    text,
    startIcon,
    endIcon,
    onClick,
    fullWidth,
    loading,
}: ButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                defaultStyles,
                variantStyles[variant],
                sizeStyles[size],
                fullWidth ? "w-full" : "",
            ].join(" ")}
            disabled={loading}
            aria-busy={loading || undefined}
        >
            {startIcon}
            {text}
            {endIcon}
        </button>
    );
}
