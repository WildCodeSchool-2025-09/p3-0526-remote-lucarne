import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

function Checkbox({ className = "", hasError = false, ...props }: CheckboxProps) {
  return (
    <input
      {...props}
      aria-invalid={hasError || props["aria-invalid"]}
      className={`lucarne-checkbox ${className}`.trim()}
      type="checkbox"
    />
  );
}

export { Checkbox };
export type { CheckboxProps };
