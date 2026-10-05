interface InputProps {
    placeholder: string;
    reference?: React.RefObject<HTMLInputElement | null>;
    type?: "text" | "password";
}

export function Input({
    placeholder,
    reference,
    type = "text",
}: InputProps) {
    return (
        <div>
            <input
                ref={reference}
                placeholder={placeholder}
                type={type}
                className="px-4 py-2 border rounded m-2"
            />
        </div>
    );
}