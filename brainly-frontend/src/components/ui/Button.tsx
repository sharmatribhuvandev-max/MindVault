import type { ReactElement } from "react";

type Variants = "primary" | "secondary";

interface ButtonProps {
    variant: Variants;
    size: "sm" | "md" | "lg";
    text: string;  
    startIcon?: ReactElement;
    endIcon?: ReactElement;
    onClick?: () => void;
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

export const Button = (props: ButtonProps) => {
    return (
        <button
            onClick={props.onClick}
            className={
                variantStyles[props.variant] +
                " " +
                sizeStyles[props.size] +
                " " +
                defaultStyles
            }
        >
            <div className="pr-2">
                {props.startIcon}
                </div>
            
            {props.text}
            {props.endIcon}
        </button>
    );
};