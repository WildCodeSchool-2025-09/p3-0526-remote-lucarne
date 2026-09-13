import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";

interface ConfirmDialogProps {
  actionLabel?: string;
  children?: ReactNode;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
  variant?: "primary" | "danger";
}

function ConfirmDialog({ actionLabel = "Confirmer", children, error, onCancel, onConfirm, open, pending = false, title, variant = "primary" }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
      if (event.key === "Tab") {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".league-list__dialog button:not([disabled])"));
        if (buttons.length < 2) return;
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [onCancel, open, pending]);

  if (!open) return null;
  return <div className="league-list__dialog-backdrop"><div aria-describedby={children ? descriptionId : undefined} aria-labelledby={titleId} aria-modal="true" className="league-list__dialog" role="dialog"><h2 id={titleId}>{title}</h2>{children ? <p id={descriptionId}>{children}</p> : null}{error ? <Alert variant="danger">{error}</Alert> : null}<div className="league-list__dialog-actions"><Button disabled={pending} onClick={onCancel} variant="outline">Annuler</Button><Button disabled={pending} onClick={onConfirm} ref={confirmRef} variant={variant}>{pending ? "Traitement…" : actionLabel}</Button></div></div></div>;
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
