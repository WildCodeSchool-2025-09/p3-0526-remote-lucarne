import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useMatch } from "react-router";
import { Button, temporaryIcons } from "../../../ui";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { publicStyles } from "../../../components/public/publicStyles";
import { usePublicLeagueNavigation } from "../hooks/usePublicLeagueNavigation";
import PublicLeagueLogo from "./PublicLeagueLogo";

function PublicLeagueNavigation({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const match = useMatch({ path: publicNavigation.leaguePattern, end: false });
  const listMatch = useMatch({ path: publicNavigation.leagues, end: true });
  const [isOpen, setIsOpen] = useState(false);
  const query = usePublicLeagueNavigation(isOpen || match !== null);
  const panelId = useId();
  const groupRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const LeagueIcon = temporaryIcons.leagues;
  const ChevronIcon = temporaryIcons.chevron;
  const RetryIcon = temporaryIcons.retry;

  useEffect(() => {
    if (!compact || !isOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !groupRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [compact, isOpen]);

  return (
    <li onBlur={(event) => {
      if (compact && !event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
    }} onKeyDown={(event) => {
      if (event.key !== "Escape" || !isOpen) return;
      event.stopPropagation();
      setIsOpen(false);
      buttonRef.current?.focus();
    }} ref={groupRef}>
      <button aria-controls={panelId} aria-expanded={isOpen}
        className={`${publicStyles.navigationItem} ${compact ? publicStyles.compactItem : ""} ${match || listMatch ? publicStyles.activeItem : publicStyles.inactiveItem} cursor-pointer`}
        onClick={() => setIsOpen((open) => !open)} ref={buttonRef} title={compact ? "Ligues" : undefined} type="button">
        <LeagueIcon aria-hidden="true" className="shrink-0" size={20} strokeWidth={2} />
        <span className={compact ? "sr-only" : publicStyles.label}>Ligues</span>
        {!compact ? <ChevronIcon aria-hidden="true" className={isOpen ? "rotate-180" : ""} size={16} /> : null}
      </button>
      <div aria-busy={query.isFetching} className={compact ? publicStyles.compactLeagueList : publicStyles.leaguePanel} hidden={!isOpen} id={panelId} inert={!isOpen}>
        {query.isPending ? <p className={publicStyles.hint} role="status" title="Chargement des ligues…">
          {compact ? <><span aria-hidden="true">…</span><span className="sr-only">Chargement des ligues…</span></> : "Chargement des ligues…"}
        </p> : null}
        {query.isError ? <>
          <p className={compact ? "sr-only" : publicStyles.hint} role="alert">Impossible de charger les ligues.</p>
          <Button className={compact ? publicStyles.compactAccountButton : "mt-2 w-full gap-2"} onClick={() => void query.refetch()} title="Réessayer les ligues" variant="outline">
            <RetryIcon aria-hidden="true" size={20} />
            <span className={compact ? "sr-only" : ""}>Réessayer les ligues</span>
          </Button>
        </> : null}
        {query.isSuccess && query.data.length === 0 ? <p className={publicStyles.hint} title="Aucune ligue active.">
          {compact ? <><span aria-hidden="true">—</span><span className="sr-only">Aucune ligue active.</span></> : "Aucune ligue active."}
        </p> : null}
        {query.isSuccess && query.data.length > 0 ? <ul aria-label="Ligues actives" className={publicStyles.leagueList}>
          {query.data.map((league) => (
            <li className={compact ? "flex justify-center" : ""} key={league.id}>
              <NavLink aria-label={`${league.name} — ${league.country}`}
                className={({ isActive }) => `${publicStyles.navigationItem} ${compact ? publicStyles.compactLeagueItem : publicStyles.leagueItem} ${isActive ? publicStyles.activeItem : publicStyles.inactiveItem}`}
                onClick={() => { setIsOpen(false); onNavigate?.(); }} title={`${league.name} — ${league.country}`} to={publicNavigation.league(league.slug)}>
                <PublicLeagueLogo logoUrl={league.logoUrl} name={league.name} />
                <span className={compact ? "sr-only" : publicStyles.label}>{league.name}</span>
              </NavLink>
            </li>
          ))}
        </ul> : null}
        {!compact ? <Link className={`${publicStyles.navigationItem} ${publicStyles.inactiveItem}`} onClick={() => { setIsOpen(false); onNavigate?.(); }} to={publicNavigation.leagues}>Voir toutes les ligues</Link> : null}
      </div>
    </li>
  );
}

export default PublicLeagueNavigation;
