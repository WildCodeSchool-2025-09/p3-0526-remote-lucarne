import { useCallback, useEffect, useId, useRef } from "react";
import { Alert, Button } from "../../../ui";
import type { AuthMode } from "../AuthContext";
import AuthForm from "./AuthForm";
import AuthDialog from "./AuthDialog";

interface AuthModalProps {
  mode: AuthMode;
  message?: string;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
  returnFocus: HTMLElement | null;
}

function AuthModal({ mode, message, onClose, onSwitch, returnFocus }: AuthModalProps) {
  const registrationTitleId = useId();
  const registration = mode === "register";
  const requestRef = useRef<AbortController | null>(null);
  const close = useCallback(() => {
    requestRef.current?.abort();
    onClose();
  }, [onClose]);
  useEffect(() => () => requestRef.current?.abort(), []);
  const switchMode = () => {
    requestRef.current?.abort();
    onSwitch(registration ? "login" : "register");
  };

  return (
    <AuthDialog closeLabel="Fermer le formulaire" onClose={close} returnFocus={returnFocus} title={registration ? "Créer un compte" : "Connexion"}>
      {message ? <Alert>{message}</Alert> : null}
      <AuthForm mode={mode} onSuccess={onClose} onRequest={(controller) => { requestRef.current = controller; }} />
      {registration ? (
        <Button className="mt-4 w-full" onClick={switchMode} variant="ghost">Déjà un compte ? Se connecter</Button>
      ) : (
        <section aria-labelledby={registrationTitleId} className="mt-4 grid gap-3 rounded-[var(--radius-button)] border border-[var(--color-action-primary)] bg-[var(--color-bg-subtle)] p-4">
          <h3 className="m-0 text-base font-semibold" id={registrationTitleId}>Pas encore inscrit ?</h3>
          <Button className="w-full border-2! border-[var(--color-action-primary)]!" onClick={switchMode} variant="outline">Créer un compte</Button>
        </section>
      )}
    </AuthDialog>
  );
}

export default AuthModal;
