import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "../../../ui";

interface AuthDialogProps {
  children: ReactNode;
  closeLabel: string;
  onClose: () => void;
  returnFocus: HTMLElement | null;
  title: string;
}

function AuthDialog({ children, closeLabel, onClose, returnFocus, title }: AuthDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), a[href]";
    (dialog?.querySelector<HTMLElement>("input, [data-dialog-initial-focus]") ?? dialog?.querySelector<HTMLElement>(focusableSelector))?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault();
        first?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus();
      else (document.querySelector<HTMLElement>("[data-public-account-trigger]") ?? document.querySelector<HTMLElement>("main"))?.focus();
    };
  }, [returnFocus, onClose]);

  return (
    <div className="lucarne-dialog-backdrop">
      <div aria-labelledby={titleId} aria-modal="true" className="lucarne-dialog max-h-[90dvh] w-[min(440px,calc(100vw-32px))]! overflow-y-auto" ref={dialogRef} role="dialog">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="m-0" id={titleId}>{title}</h2>
          <Button aria-label={closeLabel} onClick={onClose} size="sm" variant="outline">Fermer</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default AuthDialog;
