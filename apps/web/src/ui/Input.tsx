import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

function Input({ className = "", hasError = false, ...props }: InputProps) {
  return (
    <input
      className={`lucarne-input ${className}`.trim()}
      aria-invalid={hasError || props["aria-invalid"]}
      {...props}
    />
  );
}

export { Input };
export type { InputProps };
