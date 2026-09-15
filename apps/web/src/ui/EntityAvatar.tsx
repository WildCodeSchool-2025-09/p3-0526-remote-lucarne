interface EntityAvatarProps {
  imageUrl: string | null;
  name: string;
}

import { temporaryIcons } from "./icons";

function EntityAvatar({ imageUrl, name }: EntityAvatarProps) {
  const UserIcon = temporaryIcons.user;

  return imageUrl ? (
    <img alt={`Photo de ${name}`} className="entity-logo" src={imageUrl} />
  ) : (
    <span aria-label={`Photo non disponible pour ${name}`} className="entity-logo entity-logo--placeholder">
      <UserIcon aria-hidden="true" size={22} />
    </span>
  );
}

export { EntityAvatar };
export type { EntityAvatarProps };
