import type { SelectHTMLAttributes } from "react";
import { temporaryIcons } from "./icons";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

function Select({ className = "", ...props }: SelectProps) {
  const ChevronIcon = temporaryIcons.chevron;

  return (
    <div className="lucarne-select-control">
      <select className={`lucarne-select ${className}`.trim()} {...props} />
      <ChevronIcon aria-hidden="true" className="lucarne-select-icon" size={16} />
    </div>
  );
}

export { Select };
export type { SelectProps };
