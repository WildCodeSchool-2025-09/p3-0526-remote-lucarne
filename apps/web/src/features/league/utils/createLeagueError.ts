import { HttpError } from "../../../lib/httpClient";

const createLeagueErrorMessages = {
  badRequest: "Les informations saisies sont invalides. Vérifiez le formulaire.",
  forbidden: "Vous n’avez pas les droits nécessaires pour créer une ligue.",
  network: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
  server: "Une erreur est survenue lors de la création de la ligue. Réessayez plus tard.",
  unauthorized: "Votre session n’est plus valide. Veuillez vous reconnecter.",
  conflict: "Une ligue avec ce nom existe déjà pour ce pays.",
} as const;

function getCreateLeagueErrorMessage(error: unknown): string {
  if (!(error instanceof HttpError)) {
    return createLeagueErrorMessages.network;
  }

  if (error.code === "RESOURCE_ALREADY_EXISTS" || error.status === 409) {
    return createLeagueErrorMessages.conflict;
  }

  if (error.status === 400) {
    return createLeagueErrorMessages.badRequest;
  }

  if (error.status === 401) {
    return createLeagueErrorMessages.unauthorized;
  }

  if (error.status === 403) {
    return createLeagueErrorMessages.forbidden;
  }

  if (error.status >= 500) {
    return createLeagueErrorMessages.server;
  }

  return createLeagueErrorMessages.network;
}

export { createLeagueErrorMessages, getCreateLeagueErrorMessage };
