import type { ReactElement } from "react";

interface ButtonProps {
    variant: "primary" | "secondary";
    size: "sm" | "md" | "lg";
    text: string;
    startIcon?: ReactElement;
    endIcon?: ReactElement;
    onClick?: () => void;
    fullWidth?: boolean;
    loading?: boolean;
}

const variantStyles = {
    primary: "bg-[var(--purple-600)] text-white hover:bg-[var(--purple-600)]",
    secondary: "bg-[var(--purple-200)] text-[var(--purple-600)] hover:bg-[var(--purple-300)]",
};

const sizeStyles = {
    sm: "px-2 py-1",
    md: "px-4 py-2",
    lg: "px-6 py-4",
};

const defaultStyles = "px-4 py-2 rounded-md font-light flex items-center";

export function Button({ variant, text, startIcon, onClick, fullWidth, loading }: ButtonProps) {
    return <button onClick={onClick} className={variantStyles[variant] + " " + defaultStyles + " " + sizeStyles + `${fullWidth ? " w-full flex justify-center items-center" : ""} ${loading ? "opacity-45 " : ""}`} disabled={loading}>
        <div className="pr-2">
            {startIcon}
        </div>
        {text}
    </button>
}

