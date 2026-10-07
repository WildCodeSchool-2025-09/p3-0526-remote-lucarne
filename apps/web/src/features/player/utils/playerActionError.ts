import { HttpError } from "../../../lib/httpClient";

function playerActionError(error: unknown): string {
  if (error instanceof HttpError && error.status < 500) {
    if (error.code === "PROTECTED_DEPENDENCIES") {
      return "Suppression impossible : cette joueuse possède des événements de match. Son historique de matchs doit être conservé. Vous pouvez la désactiver.";
    }

    return error.message;
  }

  return "Cette action est impossible pour le moment.";
}

export { playerActionError };
