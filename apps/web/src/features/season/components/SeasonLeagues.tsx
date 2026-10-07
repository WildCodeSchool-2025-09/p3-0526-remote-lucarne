import type { LeagueSeasonDetail, SeasonDetail } from "@lucarne/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import { Link } from "react-router";
import { APP_ROLES, getCurrentAppRole } from "../../../auth/authRole";
import {
  Alert,
  Button,
  ConfirmDialog,
  FormField,
  Input,
  LoadingState,
  Pagination,
  Select,
} from "../../../ui";
import { useLeagueList } from "../../league/hooks/useLeagueList";
import { useLeagueSeasonMutation } from "../../league/hooks/useLeagueSeasonMutation";
import { HttpError } from "../../../lib/httpClient";
import { assignLeagueSeasonFormSchema } from "../../../schemas/season.schema";
import type { AssignLeagueSeasonFormData } from "../../../schemas/season.schema";

interface SeasonLeaguesProps {
  season: SeasonDetail;
}

type PendingAction = { action: "remove" | "current"; edition: LeagueSeasonDetail };

function SeasonLeagues({ season }: SeasonLeaguesProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    resetField,
    setError,
  } = useForm<AssignLeagueSeasonFormData>({
    defaultValues: { leagueId: "" },
    resolver: zodResolver(assignLeagueSeasonFormSchema),
  });
  const leagueId = useWatch({ control, name: "leagueId" });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const candidates = useLeagueList({
    page,
    pageSize: 20,
    search: search || undefined,
    sortBy: "name",
    sortOrder: "asc",
  });
  const mutation = useLeagueSeasonMutation();
  const canSetCurrent = getCurrentAppRole() === APP_ROLES.ADMIN;
  const canAssign = getCurrentAppRole() === APP_ROLES.ADMIN;
  const assignedIds = new Set(season.leagueSeasons.map((edition) => edition.leagueId));
  const available =
    candidates.data?.data.filter((league) => !assignedIds.has(league.id)) ?? [];
  const assign = async (values: AssignLeagueSeasonFormData) => {
    if (!canAssign || !leagueId || assignedIds.has(leagueId)) return;

    mutation.reset();

    try {
      await mutation.mutateAsync({
        action: "assign",
        leagueId: values.leagueId,
        seasonId: season.id,
        matchdayCount: values.matchdayCount,
        matchesPerMatchday: values.matchesPerMatchday,
      });

      reset();

      setSearch("");

      setPage(1);
    } catch (error) {
      if (error instanceof HttpError) {
        for (const detail of error.details ?? []) {
          const field = detail.field.replace(/^body\./, "");

          if (field === "matchdayCount" || field === "matchesPerMatchday")
            setError(field, { type: "server", message: detail.message });
        }
      }
    }
  };
  const confirm = async () => {
    if (!pendingAction) return;

    try {
      await mutation.mutateAsync({
        action: pendingAction.action,
        leagueId: pendingAction.edition.leagueId,
        seasonId: season.id,
      });

      setPendingAction(null);
    } catch {
      /* keep confirmation open with its error */
    }
  };
  const requestAction = (action: PendingAction) => {
    mutation.reset();

    setPendingAction(action);
  };

  return (
    <section
      className={`
        grid gap-5 rounded-[var(--radius-surface)] border
        border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-7
        season-mobile:px-5 season-mobile:py-6
      `}
      aria-labelledby="season-leagues-title"
    >
      <h2 id="season-leagues-title">Ligues associées et saison courante</h2>
      {season.leagueSeasons.length === 0 ? <p>Aucune ligue associée.</p> : null}
      {season.leagueSeasons.map((edition) => {
        const blocked =
          edition.matchdays.length > 0 || edition.participatingTeams.length > 0;

        return (
          <article
            className={`
              flex items-center justify-between gap-5 border-t
              border-[var(--color-border-default)] pt-[18px] [&_h3]:m-0 [&_p]:m-0
              [&>div:first-child]:grid [&>div:first-child]:gap-1.5 season-mobile:flex-col
              season-mobile:items-stretch
            `}
            key={edition.id}
          >
            <div>
              <h3>
                <Link to={`/dashboard/leagues/${edition.leagueId}`}>
                  {edition.league.name}
                </Link>
              </h3>
              <p>{edition.isCurrent ? "Saison courante" : "Saison non courante"}</p>
              <dl>
                <div>
                  <dt>Nombre de journées</dt>
                  <dd>{edition.matchdayCount ?? "Non configuré"}</dd>
                </div>
                <div>
                  <dt>Nombre de matchs par journée</dt>
                  <dd>{edition.matchesPerMatchday ?? "Non configuré"}</dd>
                </div>
              </dl>
              {blocked ? (
                <p>
                  Retrait bloqué : {edition.matchdays.length} journée(s),{" "}
                  {edition.participatingTeams.length} participation(s) à préserver, y
                  compris les équipes retirées.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2.5 season-mobile:justify-start">
              {canSetCurrent && !edition.isCurrent ? (
                <Button
                  disabled={mutation.isPending}
                  onClick={() => requestAction({ action: "current", edition })}
                  variant="outline"
                >
                  Définir comme actuelle
                </Button>
              ) : null}
              <Button
                disabled={mutation.isPending || blocked}
                onClick={() => requestAction({ action: "remove", edition })}
                variant="danger"
              >
                Retirer la ligue
              </Button>
            </div>
          </article>
        );
      })}
      {canAssign ? (
        <form
          className={`
            grid max-w-[520px] gap-4 border-t border-[var(--color-border-default)] pt-5
            [&>h3]:m-0 [&>.lucarne-button]:justify-self-start!
          `}
          noValidate
          onSubmit={(event) => {
            mutation.reset();

            void handleSubmit(assign)(event);
          }}
        >
          <h3>Associer une ligue</h3>
          <p>
            L'association crée les journées et les emplacements de matchs du calendrier.
            Les équipes, dates et horaires seront renseignés ensuite. La présence des
            journées empêchera le retrait de cette association.
          </p>
          <FormField htmlFor="season-league-search" label="Rechercher une ligue">
            <Input
              disabled={mutation.isPending || isSubmitting}
              id="season-league-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);

                setPage(1);

                resetField("leagueId");
              }}
            />
          </FormField>
          {candidates.isPending ? (
            <LoadingState>Chargement des ligues…</LoadingState>
          ) : null}
          {candidates.isError ? (
            <>
              <Alert>Impossible de rechercher les ligues disponibles.</Alert>
              <Button onClick={() => void candidates.refetch()} variant="outline">
                Réessayer
              </Button>
            </>
          ) : null}
          <FormField
            error={errors.leagueId?.message}
            htmlFor="season-league-to-assign"
            label="Ligue"
            required
          >
            <Select
              disabled={mutation.isPending || isSubmitting}
              aria-invalid={errors.leagueId != null}
              aria-describedby={
                errors.leagueId ? "season-league-to-assign-error" : undefined
              }
              id="season-league-to-assign"
              required
              {...register("leagueId")}
            >
              <option value="">Choisir une ligue</option>
              {available.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name} — {league.country}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            error={errors.matchdayCount?.message}
            htmlFor="season-league-matchday-count"
            label="Nombre de journées"
            required
          >
            <Input
              disabled={mutation.isPending || isSubmitting}
              aria-describedby={
                errors.matchdayCount ? "season-league-matchday-count-error" : undefined
              }
              hasError={errors.matchdayCount != null}
              id="season-league-matchday-count"
              type="number"
              min={1}
              max={2147483647}
              step={1}
              required
              {...register("matchdayCount", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            error={errors.matchesPerMatchday?.message}
            htmlFor="season-league-matches-per-matchday"
            label="Nombre de matchs par journée"
            required
          >
            <Input
              disabled={mutation.isPending || isSubmitting}
              aria-describedby={
                errors.matchesPerMatchday
                  ? "season-league-matches-per-matchday-error"
                  : undefined
              }
              hasError={errors.matchesPerMatchday != null}
              id="season-league-matches-per-matchday"
              type="number"
              min={1}
              max={2147483647}
              step={1}
              required
              {...register("matchesPerMatchday", { valueAsNumber: true })}
            />
          </FormField>
          {candidates.isSuccess && available.length === 0 ? (
            <p>Aucune ligue disponible sur cette page.</p>
          ) : null}
          {candidates.data && candidates.data.pagination.totalPages > 1 ? (
            <Pagination
              label="Pagination des ligues disponibles"
              onPageChange={(nextPage) => {
                setPage(nextPage);

                resetField("leagueId");
              }}
              page={page}
              totalPages={candidates.data.pagination.totalPages}
            />
          ) : null}
          <Button
            disabled={
              !leagueId ||
              assignedIds.has(leagueId) ||
              mutation.isPending ||
              isSubmitting ||
              candidates.isPending ||
              candidates.isError
            }
            type="submit"
          >
            Associer
          </Button>
        </form>
      ) : null}
      {mutation.isError && !pendingAction ? (
        <Alert>{mutation.error.message}</Alert>
      ) : null}
      <ConfirmDialog
        actionLabel={
          pendingAction?.action === "current"
            ? "Définir comme actuelle"
            : "Retirer la ligue"
        }
        error={mutation.isError ? mutation.error.message : undefined}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirm()}
        open={pendingAction != null}
        pending={mutation.isPending}
        title={
          pendingAction?.action === "current"
            ? "Définir cette saison comme actuelle ?"
            : "Retirer cette ligue de la saison ?"
        }
        variant={pendingAction?.action === "current" ? "primary" : "danger"}
      >
        {pendingAction?.action === "current"
          ? `La saison « ${season.name} » deviendra la saison courante de ${pendingAction.edition.league.name} et remplacera son éventuelle saison courante.`
          : `L’association à ${pendingAction?.edition.league.name} sera retirée. La saison et la ligue ne seront pas supprimées.`}
      </ConfirmDialog>
    </section>
  );
}

export default SeasonLeagues;
