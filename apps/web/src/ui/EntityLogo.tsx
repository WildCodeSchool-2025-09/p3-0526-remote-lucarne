interface EntityLogoProps {
  logoUrl: string | null;
  name: string;
}

function EntityLogo({ logoUrl, name }: EntityLogoProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return logoUrl ? (
    <img alt={`Logo de ${name}`} className="entity-logo" src={logoUrl} />
  ) : (
    <span aria-label={`Initiale de ${name}`} className="entity-logo entity-logo--placeholder">
      {initial}
    </span>
  );
}

export { EntityLogo };
export type { EntityLogoProps };
