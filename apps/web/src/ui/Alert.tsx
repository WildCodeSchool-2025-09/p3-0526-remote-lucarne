import type { HTMLAttributes } from "react";

type AlertVariant = "danger" | "success";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

function Alert({ className = "", variant = "danger", ...props }: AlertProps) {
  return (
    <div
      className={`lucarne-alert lucarne-alert--${variant} ${className}`.trim()}
      role="alert"
      {...props}
    />
  );
}

export { Alert };
export type { AlertProps, AlertVariant };
