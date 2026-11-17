import { useState } from "react";
import { EntityAvatar } from "../../../ui";

function PlayerPhoto({ pictureUrl, name }: { pictureUrl: string | null; name: string }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="shrink-0 [&_.entity-logo]:size-24! [&_.entity-logo]:object-cover!">
      {pictureUrl && !hasError ? (
        <img
          alt={`Photo de ${name}`}
          className="size-24 rounded-lg object-cover"
          height={96}
          onError={() => setHasError(true)}
          src={pictureUrl}
          width={96}
        />
      ) : (
        <EntityAvatar imageUrl={null} name={name} />
      )}
    </div>
  );
}

export { PlayerPhoto };
