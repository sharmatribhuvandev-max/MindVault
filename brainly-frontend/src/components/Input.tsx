interface InputProps {
    placeholder?: string;
    id?: string;
    label?: string;
    reference?: React.RefObject<HTMLInputElement | null>;
    type?: "text" | "password" | "url";
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    disabled?: boolean;
    autoComplete?: string;
}

export function Input({
    placeholder,
    id,
    label,
    reference,
    type = "text",
    value,
    onChange,
    required = false,
    disabled = false,
    autoComplete,
}: InputProps) {
    return (
        <div className="w-full space-y-1">
            {label && (
                <label htmlFor={id} className="block text-sm font-semibold text-gray-800">
                    {label}{required ? " *" : ""}
                </label>
            )}
            <input
                id={id}
                ref={reference}
                placeholder={placeholder}
                type={type}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                autoComplete={autoComplete}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus-visible:border-violet-600 focus-visible:ring-2 focus-visible:ring-violet-600/20 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
        </div>
    );
}
