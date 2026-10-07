import type { HttpError } from "../../../lib/httpClient";
import { Alert, Button } from "../../../ui";

function MatchMutationError({
  error,
  onReload,
}: {
  error: HttpError | null;
  onReload: () => void;
}) {
  if (!error) return null;

  return (
    <Alert variant="danger">
      {error.code === "RESOURCE_VERSION_CONFLICT"
        ? "Ce match a été modifié. Rechargez les données avant de réessayer."
        : error.message}
      {error.code === "RESOURCE_VERSION_CONFLICT" ? (
        <Button onClick={onReload} variant="outline">
          Recharger les données
        </Button>
      ) : null}
    </Alert>
  );
}

export default MatchMutationError;
