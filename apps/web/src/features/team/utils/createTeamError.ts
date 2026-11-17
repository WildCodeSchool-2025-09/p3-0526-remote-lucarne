import { HttpError } from "../../../lib/httpClient";

const createTeamErrorMessages = {
  badRequest: "Les informations saisies sont invalides. Vérifiez le formulaire.",
  forbidden: "Vous n’avez pas les droits nécessaires pour créer une équipe.",
  network: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
  server: "Une erreur est survenue lors de la création de l’équipe. Réessayez plus tard.",
  unauthorized: "Votre session n’est plus valide. Veuillez vous reconnecter.",
} as const;

function getCreateTeamErrorMessage(error: unknown): string {
  if (!(error instanceof HttpError)) return createTeamErrorMessages.network;
  if (error.status === 400) return createTeamErrorMessages.badRequest;
  if (error.status === 401) return createTeamErrorMessages.unauthorized;
  if (error.status === 403) return createTeamErrorMessages.forbidden;
  if (error.status >= 500) return createTeamErrorMessages.server;

  return error.message || createTeamErrorMessages.network;
}

export { createTeamErrorMessages, getCreateTeamErrorMessage };
