import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

function Button({
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`lucarne-button lucarne-button--${variant} ${className}`.trim()}
      type={type}
      {...props}
    />
  );
}

export { Button };
export type { ButtonProps, ButtonVariant };
