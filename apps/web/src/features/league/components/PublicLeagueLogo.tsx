import { useState } from "react";
import { apiUrl } from "../../../config/environment";
import { EntityLogo } from "../../../ui";

function localLogoUrl(logoUrl: string | null): string | null {
  if (!logoUrl?.trim()) return null;
  try {
    const url = new URL(logoUrl, window.location.origin);
    const apiOrigin = new URL(apiUrl || window.location.origin).origin;
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      && [window.location.origin, apiOrigin].includes(url.origin) ? url.href : null;
  } catch { return null; }
}

function PublicLeagueLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = localLogoUrl(logoUrl);
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 [&_.entity-logo]:size-8!" onError={() => setFailedUrl(source)}>
      <EntityLogo logoUrl={source === failedUrl ? null : source} name={name} />
    </span>
  );
}

export default PublicLeagueLogo;
