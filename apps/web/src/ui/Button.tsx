import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger";
type ButtonSize = "xl" | "l" | "m" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  className = "",
  size = "m",
  type = "button",
  variant = "primary",
  ...props
}, ref) {
  return (
    <button
      className={`lucarne-button lucarne-button--${variant} lucarne-button--${size} ${className}`.trim()}
      ref={ref}
      type={type}
      {...props}
    />
  );
});

export { Button };
export type { ButtonProps, ButtonSize, ButtonVariant };
