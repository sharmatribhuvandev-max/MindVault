interface InputProps {
    placeholder: string;
    reference?: React.RefObject<HTMLInputElement | null>;
    type?: "text" | "password";
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Input({
    placeholder,
    reference,
    type = "text",
    value,
    onChange,
}: InputProps) {
    return (
        <div>
            <input
                ref={reference}
                placeholder={placeholder}
                type={type}
                value={value}
                onChange={onChange}
                className="px-4 py-2 border rounded m-2"
            />
        </div>
    );
}