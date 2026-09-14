import type { League } from "@lucarne/shared";

function LeagueLogo({ league }: { league: League }) {
  const initial = league.name.trim().charAt(0).toUpperCase() || "?";

  return league.logoUrl ? (
    <img
      alt={`Logo de ${league.name}`}
      className="league-list__logo"
      src={league.logoUrl}
    />
  ) : (
    <span
      aria-label={`Initiale de ${league.name}`}
      className="league-list__logo league-list__logo--placeholder"
    >
      {initial}
    </span>
  );
}

export default LeagueLogo;
