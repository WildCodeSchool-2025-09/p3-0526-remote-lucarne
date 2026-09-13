import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, type AlertVariant } from "./Alert";
import { Button } from "./Button";

function AlertModal({ children, variant = "danger", onClose }: { children: ReactNode; variant?: AlertVariant; onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(true);
  if (!isOpen) return null;
  return <div className="league-list__dialog-backdrop"><div aria-label="Message" aria-modal="true" className="league-list__dialog" role="alertdialog"><Alert variant={variant}>{children}</Alert><div className="league-list__dialog-actions"><Button onClick={() => { setIsOpen(false); onClose?.(); }} variant="outline">Fermer</Button></div></div></div>;
}

export { AlertModal };
