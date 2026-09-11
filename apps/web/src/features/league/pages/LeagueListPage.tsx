import type {
  League,
  LeagueSortField,
  LeagueStatusFilter,
  ListLeaguesParams,
} from "@lucarne/shared";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Alert, Button, Input } from "../../../ui";
import { canCreateLeague, canDeleteLeague, canViewLeague, getCurrentAppRole } from "../../../auth/authRole";
import { HttpError } from "../../../lib/httpClient";
import { useLeagueList } from "../hooks/useLeagueList";
import { useLeagueCountries } from "../hooks/useLeagueCountries";
import { useLeagueMutation } from "../hooks/useLeagueMutation";
import {
  formatDate,
  getStatus,
  parseParams,
  updateParams,
} from "../utils/leagueList";

interface PendingAction {
  league: League;
  type: "activate" | "deactivate" | "delete";
}

function getFriendlyError(error: unknown, fallback: string): string {
  if (error instanceof HttpError && error.status === 404 && error.code === "RESOURCE_NOT_FOUND") {
    return "Cette ligue n’existe plus ou a déjà été supprimée.";
  }

  if (error instanceof HttpError && error.status === 403) {
    return "Vous n’êtes pas autorisé à effectuer cette action.";
  }

  return fallback;
}

function LeagueLogo({ league }: { league: League }) {
  const initial = league.name.trim().charAt(0).toUpperCase() || "?";

  return league.logoUrl ? (
    <img
      alt={`Logo de ${league.name}`}
      className="league-list__logo"
      src={league.logoUrl}
    />
  ) : (
    <span
      aria-label={`Initiale de ${league.name}`}
      className="league-list__logo league-list__logo--placeholder"
    >
      {initial}
    </span>
  );
}

function LeagueListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const query = useLeagueList(params);
  const countriesQuery = useLeagueCountries();
  const mutation = useLeagueMutation();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [countryInput, setCountryInput] = useState("");
  const [isCountrySuggestionsOpen, setIsCountrySuggestionsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const role = getCurrentAppRole();
  const canDelete = canDeleteLeague(role);
  const canCreate = canCreateLeague(role);
  const canEdit = canViewLeague(role);

  const countryOptions = useMemo(() => {
    const countries = new Set([...(params.countries ?? []), ...(countriesQuery.data ?? [])]);

    return [...countries].sort((left, right) => left.localeCompare(right, "fr"));
  }, [params.countries, countriesQuery.data]);
  const countrySuggestions = countryOptions.filter((country) =>
    country.toLocaleLowerCase("fr").includes(countryInput.trim().toLocaleLowerCase("fr")),
  );

  const setCriteria = (changes: Partial<ListLeaguesParams> & { countries?: string[] }) => {
    setSearchParams((current) => updateParams(current, { ...changes, page: changes.page ?? 1 }));
  };

  const addCountry = (value: string) => {
    const country = value.trim();

    if (!country || params.countries?.includes(country)) {
      setCountryInput("");
      return;
    }

    setCriteria({ countries: [...(params.countries ?? []), country] });
    setCountryInput("");
  };

  const resetCriteria = () => setSearchParams(new URLSearchParams());
  const totalPages = query.data?.pagination.totalPages ?? 0;
  const isFiltered = Boolean(params.search) || params.status !== "ALL" || (params.countries?.length ?? 0) > 0;

  const confirmAction = async () => {
    if (pendingAction == null) return;

    const action = pendingAction;
    setPendingAction(null);
    setFeedback(null);

    try {
      await mutation.mutateAsync({ action: action.type, id: action.league.id });
      setFeedback({
        type: "success",
        message: action.type === "deactivate"
          ? "La ligue a été désactivée."
          : action.type === "activate"
            ? "La ligue a été activée."
            : "La ligue a été supprimée.",
      });

      const currentPage = params.page ?? 1;
      if (action.type === "delete" && query.data?.data.length === 1 && currentPage > 1) {
        setSearchParams((current) => updateParams(current, { page: currentPage - 1 }));
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: getFriendlyError(error, "La ligue n’a pas pu être modifiée. Veuillez réessayer."),
      });
    }
  };

  return (
    <section className="league-list-page" aria-labelledby="league-list-title">
      <div className="league-list-page__container">
        <header className="league-list-page__header">
          <div>
            <p className="league-list-page__eyebrow">Dashboard</p>
            <h1 id="league-list-title">Ligues</h1>
            <p>Consultez les ligues actives et inactives.</p>
          </div>
          {canCreate ? <Link className="lucarne-button lucarne-button--primary lucarne-button--xl" to="/dashboard/leagues/new">Créer une ligue</Link> : null}
        </header>

        {feedback ? <Alert variant={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</Alert> : null}

        <div className="league-list__filters" aria-label="Filtres des ligues">
          <label className="league-list__field">
            <span>Rechercher</span>
            <Input
              aria-label="Rechercher une ligue par nom"
              onChange={(event) => setCriteria({ search: event.target.value })}
              placeholder="Nom de la ligue"
              type="search"
              value={params.search ?? ""}
            />
          </label>

          <div className="league-list__field league-list__countries">
            <label htmlFor="league-country-filter">Pays</label>
            <div className="league-list__country-control">
              {params.countries?.map((country) => (
                <button
                  aria-label={`Retirer ${country}`}
                  className="league-list__country-tag"
                  key={country}
                  onClick={() => setCriteria({ countries: params.countries?.filter((item) => item !== country) })}
                  type="button"
                >
                  {country} ×
                </button>
              ))}
              <input
                aria-label="Ajouter un pays"
                id="league-country-filter"
                onBlur={() => {
                  window.setTimeout(() => setIsCountrySuggestionsOpen(false), 0);
                }}
                onChange={(event) => {
                  setCountryInput(event.target.value);
                  setIsCountrySuggestionsOpen(true);
                }}
                onFocus={() => setIsCountrySuggestionsOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCountry(countryInput);
                    setIsCountrySuggestionsOpen(false);
                  }
                }}
                placeholder={params.countries?.length ? "Ajouter un pays" : "Saisir un pays"}
                type="search"
                value={countryInput}
              />
            </div>
            {isCountrySuggestionsOpen ? (
              <div aria-label="Suggestions de pays" className="league-list__country-suggestions" role="listbox">
                {countrySuggestions.length === 0 ? (
                  <span className="league-list__country-empty" role="status">Non disponible</span>
                ) : countrySuggestions.map((country) => (
                  <button
                    aria-selected={params.countries?.includes(country) ?? false}
                    className="league-list__country-suggestion"
                    key={country}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      addCountry(country);
                      setIsCountrySuggestionsOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    {country}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <label className="league-list__field">
            <span>Statut</span>
            <select
              aria-label="Filtrer par statut"
              onChange={(event) => setCriteria({ status: event.target.value as LeagueStatusFilter })}
              value={params.status}
            >
              <option value="ALL">Tous</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>

          <label className="league-list__field">
            <span>Tri</span>
            <select
              aria-label="Trier les ligues"
              onChange={(event) => {
                const [sortBy, sortOrder] = event.target.value.split(":");
                setCriteria({
                  sortBy: sortBy as LeagueSortField,
                  sortOrder: sortOrder as "asc" | "desc",
                });
              }}
              value={`${params.sortBy}:${params.sortOrder}`}
            >
              <option value="name:asc">Nom : A à Z</option>
              <option value="name:desc">Nom : Z à A</option>
              <option value="createdAt:asc">Date de création : croissante</option>
              <option value="createdAt:desc">Date de création : décroissante</option>
            </select>
          </label>
          <Button className="league-list__reset" onClick={resetCriteria} variant="outline">Réinitialiser</Button>
        </div>

        {query.isPending ? <p role="status">Chargement des ligues…</p> : null}
        {query.isError ? (
          <div className="league-list__state">
            <Alert>Impossible de charger les ligues. Veuillez réessayer.</Alert>
            <Button onClick={() => void query.refetch()}>Réessayer</Button>
          </div>
        ) : null}

        {query.isSuccess && query.data.data.length === 0 ? (
          <div className="league-list__state">
            <p>{isFiltered ? "Aucune ligue ne correspond à vos critères." : "Aucune ligue n’est disponible."}</p>
            {isFiltered ? <Button onClick={resetCriteria} variant="outline">Réinitialiser les critères</Button> : null}
          </div>
        ) : null}

        {query.isSuccess && query.data.data.length > 0 ? (
          <div className="league-list__table-wrapper">
            <table className="league-list__table">
              <caption className="sr-only">Liste des ligues</caption>
              <thead>
                <tr><th scope="col">Logo</th><th scope="col">Nom</th><th scope="col">Pays</th><th scope="col">Statut</th><th scope="col">Créée le</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {query.data.data.map((league) => {
                  const status = getStatus(league);
                  const actionType = status === "ACTIVE" ? "deactivate" : "activate";

                  return (
                    <tr key={league.id}>
                      <td data-label="Logo"><LeagueLogo league={league} /></td>
                      <td data-label="Nom"><Link className="league-list__name" to={`/dashboard/leagues/${league.id}`}>{league.name}</Link></td>
                      <td data-label="Pays">{league.country}</td>
                      <td data-label="Statut"><span className={`league-list__status league-list__status--${status.toLowerCase()}`}>{status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
                      <td data-label="Créée le">{formatDate(league.createdAt)}</td>
                      <td data-label="Actions">
                        {canEdit ? <Link className="lucarne-button lucarne-button--outline" to={`/dashboard/leagues/${league.id}/edit`}>Modifier</Link> : null}
                        {canDelete ? (
                          <div className="league-list__actions">
                            <Button
                              aria-label={`${actionType === "deactivate" ? "Désactiver" : "Activer"} ${league.name}`}
                              onClick={() => setPendingAction({ league, type: actionType })}
                              variant="outline"
                            >
                              {actionType === "deactivate" ? "Désactiver" : "Activer"}
                            </Button>
                            {actionType === "activate" ? (
                              <Button
                                aria-label={`Supprimer ${league.name}`}
                                onClick={() => setPendingAction({ league, type: "delete" })}
                                variant="danger"
                              >
                                Supprimer
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {query.isSuccess && totalPages > 0 ? (
          <nav className="league-list__pagination" aria-label="Pagination des ligues">
            <Button disabled={params.page === 1} onClick={() => setCriteria({ page: (params.page ?? 1) - 1, countries: params.countries })} variant="outline">Précédent</Button>
            <span>Page {params.page} sur {totalPages}</span>
            <Button disabled={params.page === totalPages} onClick={() => setCriteria({ page: (params.page ?? 1) + 1, countries: params.countries })} variant="outline">Suivant</Button>
          </nav>
        ) : null}
      </div>

      {pendingAction ? (
        <div className="league-list__dialog-backdrop">
          <div aria-labelledby="league-action-title" aria-modal="true" className="league-list__dialog" role="dialog">
            <h2 id="league-action-title">
              {pendingAction.type === "deactivate"
                ? "Désactiver la ligue ?"
                : pendingAction.type === "activate"
                  ? "Activer la ligue ?"
                  : "Supprimer définitivement la ligue ?"}
            </h2>
            <p>
              {pendingAction.type === "deactivate"
                ? `${pendingAction.league.name} deviendra inactive et restera consultable.`
                : pendingAction.type === "activate"
                  ? `${pendingAction.league.name} redeviendra active.`
                  : `${pendingAction.league.name} sera supprimée définitivement.`}
            </p>
            <div className="league-list__dialog-actions">
              <Button onClick={() => setPendingAction(null)} variant="outline">Annuler</Button>
              <Button disabled={mutation.isPending} onClick={() => void confirmAction()} variant={pendingAction.type === "delete" ? "danger" : "primary"}>
                {mutation.isPending ? "Traitement…" : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default LeagueListPage;
