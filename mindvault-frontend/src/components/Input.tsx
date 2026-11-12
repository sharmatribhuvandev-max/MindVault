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
        <div className="w-full space-y-1.5">
            {label && (
                <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
                    {label}
                    {required && <span className="text-faint" aria-hidden="true"> *</span>}
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
                className="field"
            />
        </div>
    );
}
