import { Link } from "react-router";
import { Button, temporaryIcons } from "../../ui";
import { useAuth } from "../../features/auth/AuthContext";
import { publicStyles } from "./publicStyles";

interface PublicAccountActionsProps {
  compact?: boolean;
  placement?: "sidebar" | "header";
  onOpenAccount?: () => void;
  onNavigate?: () => void;
}

function PublicAccountActions({ compact = false, placement = "sidebar", onOpenAccount, onNavigate }: PublicAccountActionsProps) {
  const { authenticated, role, checking, sessionError, retrySession, openAuth, logout } = useAuth();
  const UserIcon = temporaryIcons.user;
  const DashboardIcon = temporaryIcons.dashboard;
  const RetryIcon = temporaryIcons.retry;
  const className = compact ? publicStyles.compactAccountButton : publicStyles.accountButton;
  return (
    <section aria-label="Votre compte" className={placement === "header" ? publicStyles.headerAccount : publicStyles.accounts}>
      {authenticated ? <>
        {checking ? <p className={compact ? "sr-only" : publicStyles.hint} role="status">Vérification de la session…</p> : null}
        {sessionError ? <>
          <p className={compact ? "sr-only" : publicStyles.hint} role="alert">Impossible de vérifier la session.</p>
          <Button className={className} onClick={retrySession} title="Réessayer" variant="outline">
            <RetryIcon aria-hidden="true" size={20} strokeWidth={2} />
            <span className={compact ? "sr-only" : ""}>Réessayer</span>
          </Button>
        </> : null}
        {role === "ADMIN" && !checking && !sessionError ? (
          <Link className={`lucarne-button lucarne-button--primary lucarne-button--m no-underline ${className}`} onClick={onNavigate} title="Dashboard" to="/dashboard">
            <DashboardIcon aria-hidden="true" size={20} strokeWidth={2} />
            <span className={compact ? "sr-only" : ""}>Dashboard</span>
          </Link>
        ) : null}
        <Button className={className} onClick={() => { onNavigate?.(); logout(); }} title="Déconnexion" variant="outline">
          <UserIcon aria-hidden="true" size={20} strokeWidth={2} />
          <span className={compact ? "sr-only" : ""}>Déconnexion</span>
        </Button>
      </> : <Button aria-haspopup="dialog" className={className} data-public-account-trigger="" onClick={(event) => {
        onOpenAccount?.();
        openAuth("login", event.currentTarget);
      }} title="Compte" variant="primary">
        <UserIcon aria-hidden="true" size={20} strokeWidth={2} />
        <span className={compact ? "sr-only" : ""}>Compte</span>
      </Button>}
    </section>
  );
}

export default PublicAccountActions;
