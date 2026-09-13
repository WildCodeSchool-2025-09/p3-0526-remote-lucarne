import type { ListTeamsParams, Team, TeamSortField, TeamStatusFilter } from "@lucarne/shared";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { APP_ROLES, getCurrentAppRole, hasRole, TEAM_EDIT_ROLES } from "../../../auth/authRole";
import { HttpError } from "../../../lib/httpClient";
import { Alert, Button } from "../../../ui";
import { useTeamList } from "../../../hooks/useTeamList";
import { useTeamMutation } from "../hooks/useTeamMutation";

interface PendingAction { team: Team; type: "activate" | "deactivate" | "delete"; }

function paramsOf(search: URLSearchParams): ListTeamsParams {
  return { page: Number(search.get("page") ?? 1), pageSize: 20, search: search.get("search") ?? undefined, status: (search.get("status") as TeamStatusFilter) || "ALL", sortBy: (search.get("sortBy") as TeamSortField) || "name", sortOrder: (search.get("sortOrder") as "asc" | "desc") || "asc" };
}

function getFriendlyError(error: unknown): string {
  if (error instanceof HttpError && error.status === 404) return "Cette équipe n’existe plus ou a déjà été supprimée.";
  if (error instanceof HttpError && error.status === 403) return "Vous n’êtes pas autorisé à effectuer cette action.";
  return "L’équipe n’a pas pu être modifiée. Veuillez réessayer.";
}

export default function TeamListPage() {
  const [url, setUrl] = useSearchParams();
  const params = paramsOf(url);
  const query = useTeamList(params);
  const mutation = useTeamMutation();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isTeamSuggestionsOpen, setIsTeamSuggestionsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const role = getCurrentAppRole();
  const canEdit = hasRole(role, TEAM_EDIT_ROLES);
  const canDelete = role === APP_ROLES.ADMIN;
  const set = (change: Partial<ListTeamsParams>) => setUrl((current) => { const next = new URLSearchParams(current); Object.entries({ ...change, page: change.page ?? 1 }).forEach(([key, value]) => value == null || value === "" || value === "ALL" ? next.delete(key) : next.set(key, String(value))); return next; });
  const totalPages = query.data?.pagination.totalPages ?? 0;
  const teamSuggestions = useMemo(() => {
    const names = new Set(query.data?.data.map((team) => team.name) ?? []);
    const search = (params.search ?? "").trim().toLocaleLowerCase("fr");

    return [...names]
      .filter((name) => name.toLocaleLowerCase("fr").includes(search))
      .sort((left, right) => left.localeCompare(right, "fr"));
  }, [params.search, query.data?.data]);
  const confirmAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setFeedback(null);
    try {
      await mutation.mutateAsync({ action: action.type, id: action.team.id });
      setFeedback({ type: "success", message: action.type === "delete" ? "L’équipe a été supprimée." : action.type === "deactivate" ? "L’équipe a été désactivée." : "L’équipe a été activée." });
      if (action.type === "delete" && query.data?.data.length === 1 && (params.page ?? 1) > 1) set({ page: (params.page ?? 1) - 1 });
    } catch (error) { setFeedback({ type: "error", message: getFriendlyError(error) }); }
  };

  return <section className="league-list-page" aria-labelledby="team-list-title"><div className="league-list-page__container"><header className="league-list-page__header"><div><p className="league-list-page__eyebrow">Dashboard</p><h1 id="team-list-title">Équipes</h1><p>Consultez les équipes actives et inactives.</p></div><Link className="lucarne-button lucarne-button--primary" to="/dashboard/teams/new">Créer une équipe</Link></header>{feedback ? <Alert variant={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</Alert> : null}<div aria-label="Filtres des équipes" className="league-list__filters"><div className="league-list__field league-list__countries"><label htmlFor="team-name-filter">Rechercher</label><div className="league-list__country-control"><input aria-label="Rechercher une équipe par nom" id="team-name-filter" onBlur={() => { window.setTimeout(() => setIsTeamSuggestionsOpen(false), 0); }} onChange={(e) => { setIsTeamSuggestionsOpen(true); set({ search: e.target.value }); }} onFocus={() => setIsTeamSuggestionsOpen(true)} onKeyDown={(e) => { if (e.key === "Enter" && teamSuggestions[0] != null) { e.preventDefault(); set({ search: teamSuggestions[0] }); setIsTeamSuggestionsOpen(false); } }} placeholder="Nom de l’équipe" type="search" value={params.search ?? ""} /></div>{isTeamSuggestionsOpen ? <div aria-label="Suggestions d’équipes" className="league-list__country-suggestions" role="listbox">{teamSuggestions.length === 0 ? <span className="league-list__country-empty" role="status">Non disponible</span> : teamSuggestions.map((name) => <button aria-selected={params.search === name} className="league-list__country-suggestion" key={name} onMouseDown={(e) => e.preventDefault()} onClick={() => { set({ search: name }); setIsTeamSuggestionsOpen(false); }} role="option" type="button">{name}</button>)}</div> : null}</div><label className="league-list__field"><span>Statut</span><select aria-label="Filtrer par statut" value={params.status} onChange={(e) => set({ status: e.target.value as TeamStatusFilter })}><option value="ALL">Tous</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><label className="league-list__field"><span>Tri</span><select aria-label="Trier les équipes" value={`${params.sortBy}:${params.sortOrder}`} onChange={(e) => { const [sortBy, sortOrder] = e.target.value.split(":"); set({ sortBy: sortBy as TeamSortField, sortOrder: sortOrder as "asc" | "desc" }); }}><option value="name:asc">Nom : A à Z</option><option value="name:desc">Nom : Z à A</option><option value="createdAt:asc">Date de création : croissante</option><option value="createdAt:desc">Date de création : décroissante</option></select></label><Button className="league-list__reset" onClick={() => setUrl(new URLSearchParams())} variant="outline">Réinitialiser</Button></div>{query.isPending ? <p role="status">Chargement des équipes…</p> : null}{query.isError ? <p role="alert">Impossible de charger les équipes.</p> : null}{query.data?.data.length === 0 ? <p>Aucune équipe ne correspond à vos critères.</p> : null}{query.data && query.data.data.length > 0 ? <div className="league-list__table-wrapper"><table className="league-list__table"><caption className="sr-only">Liste des équipes</caption><thead><tr><th scope="col">Logo</th><th scope="col">Nom</th><th scope="col">Stade</th><th scope="col">Statut</th><th scope="col">Créée le</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{query.data.data.map((team) => { const actionType = team.isActive ? "deactivate" : "activate"; return <tr key={team.id}><td data-label="Logo">{team.logoUrl ? <img className="league-list__logo" alt={`Logo de ${team.name}`} src={team.logoUrl} /> : <span className="league-list__logo league-list__logo--placeholder">{team.name.charAt(0).toUpperCase()}</span>}</td><td data-label="Nom"><Link className="league-list__name" to={`/dashboard/teams/${team.id}`}>{team.name}</Link></td><td data-label="Stade">{team.stadium ?? "—"}</td><td data-label="Statut"><span className={`league-list__status league-list__status--${team.isActive ? "active" : "inactive"}`}>{team.isActive ? "Active" : "Inactive"}</span></td><td data-label="Créée le">{new Date(team.createdAt).toLocaleDateString("fr-FR")}</td><td data-label="Actions">{canEdit ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/teams/${team.id}/edit`}>Modifier</Link> : null}{canEdit ? <div className="league-list__actions"><Button aria-label={`${actionType === "deactivate" ? "Désactiver" : "Activer"} ${team.name}`} onClick={() => setPendingAction({ team, type: actionType })} variant="outline">{actionType === "deactivate" ? "Désactiver" : "Activer"}</Button>{canDelete ? <Button aria-label={`Supprimer ${team.name}`} onClick={() => setPendingAction({ team, type: "delete" })} variant="danger">Supprimer</Button> : null}</div> : null}</td></tr>; })}</tbody></table></div> : null}{totalPages > 0 ? <nav className="league-list__pagination" aria-label="Pagination des équipes"><Button variant="outline" disabled={params.page === 1} onClick={() => set({ page: (params.page ?? 1) - 1 })}>Précédent</Button><span>Page {params.page} sur {totalPages}</span><Button variant="outline" disabled={params.page === totalPages} onClick={() => set({ page: (params.page ?? 1) + 1 })}>Suivant</Button></nav> : null}</div>{pendingAction ? <div className="league-list__dialog-backdrop"><div aria-labelledby="team-action-title" aria-modal="true" className="league-list__dialog" role="dialog"><h2 id="team-action-title">{pendingAction.type === "deactivate" ? "Désactiver l’équipe ?" : pendingAction.type === "activate" ? "Activer l’équipe ?" : "Supprimer définitivement l’équipe ?"}</h2><p>{pendingAction.type === "deactivate" ? `${pendingAction.team.name} deviendra inactive et restera consultable.` : pendingAction.type === "activate" ? `${pendingAction.team.name} redeviendra active.` : `${pendingAction.team.name} sera supprimée définitivement.`}</p><div className="league-list__dialog-actions"><Button onClick={() => setPendingAction(null)} variant="outline">Annuler</Button><Button disabled={mutation.isPending} onClick={() => void confirmAction()} variant={pendingAction.type === "delete" ? "danger" : "primary"}>{mutation.isPending ? "Traitement…" : "Confirmer"}</Button></div></div></div> : null}</section>;
}
