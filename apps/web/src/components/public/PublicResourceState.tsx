import { HttpError } from "../../lib/httpClient";
import { Alert, Button, LoadingState } from "../../ui";

type QueryState = { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown };

export default function PublicResourceState({ query, label }: { query: QueryState; label: string }) {
  if (query.isPending) return <LoadingState>Chargement…</LoadingState>;
  if (!query.isError) return null;
  const unavailable = query.error instanceof HttpError && [400, 404].includes(query.error.status);
  return <Alert>{unavailable ? `${label} introuvable ou indisponible.` : `Impossible de charger : ${label.toLocaleLowerCase("fr")}.`}
    {!unavailable ? <Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button> : null}
  </Alert>;
}
