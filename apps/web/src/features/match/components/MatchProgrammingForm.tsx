import { matchStyles } from "../matchStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminMatch, LeagueSeasonDetail } from "@lucarne/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { updateMatch } from "../../../services/match.service";
import {
  matchProgrammingFormSchema,
  toMatchProgrammingInput,
  type MatchProgrammingValues,
} from "../../../schemas/match.schema";
import { Button, FormField, Input, Select } from "../../../ui";
import { useMatchMutation } from "../hooks/useMatches";
import MatchMutationError from "./MatchMutationError";

function MatchProgrammingForm({
  match,
  edition,
  onSaved,
  onReload,
}: {
  match: AdminMatch;
  edition: LeagueSeasonDetail;
  onSaved: () => void;
  onReload: () => void;
}) {
  const mutation = useMatchMutation((input: ReturnType<typeof toMatchProgrammingInput>) =>
    updateMatch(match.id, input),
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<MatchProgrammingValues>({
    resolver: zodResolver(matchProgrammingFormSchema),
    defaultValues: {
      version: match.version,
      matchdayId: match.matchdayId,
      homeTeamId: match.homeTeamId ?? "",
      awayTeamId: match.awayTeamId ?? "",
      matchDate: match.matchDate ?? "",
      startTime: match.startTime ?? "",
      stadium: match.stadium ?? "",
    },
  });

  useEffect(() => {
    for (const detail of mutation.error?.details ?? []) {
      const field = detail.field.replace(/^body\./, "");

      if (
        [
          "matchdayId",
          "homeTeamId",
          "awayTeamId",
          "matchDate",
          "startTime",
          "stadium",
        ].includes(field)
      )
        setError(field as keyof MatchProgrammingValues, { message: detail.message });
    }
  }, [mutation.error, setError]);

  const teams = edition.participatingTeams.filter(
    (team) =>
      team.status === "REGISTERED" ||
      team.id === match.homeTeamId ||
      team.id === match.awayTeamId,
  );

  return (
    <form
      className={matchStyles.formCard}
      noValidate
      onSubmit={(event) => {
        if (!isDirty) {
          event.preventDefault();

          return;
        }

        mutation.reset();
        void handleSubmit((values) =>
          mutation.mutate(toMatchProgrammingInput(values, dirtyFields), {
            onSuccess: onSaved,
          }),
        )(event);
      }}
    >
      <p>
        Deux équipes distinctes, une date et une heure sont nécessaires pour publier. Les
        heures sont celles de Paris. Le lieu est facultatif.
      </p>
      <fieldset className={matchStyles.fieldset} disabled={mutation.isPending}>
        <legend>Programmation</legend>
        <FormField
          error={errors.matchdayId?.message}
          htmlFor="match-day"
          label="Journée"
          required
        >
          <Select
            aria-describedby={errors.matchdayId ? "match-day-error" : undefined}
            aria-invalid={Boolean(errors.matchdayId)}
            id="match-day"
            {...register("matchdayId")}
          >
            {edition.matchdays.map((day) => (
              <option key={day.id} value={day.id}>
                Journée {day.number}
              </option>
            ))}
          </Select>
        </FormField>
        {(["homeTeamId", "awayTeamId"] as const).map((field) => (
          <FormField
            error={errors[field]?.message}
            htmlFor={`match-${field}`}
            key={field}
            label={field === "homeTeamId" ? "Équipe domicile" : "Équipe extérieure"}
            required={match.isPublished}
          >
            <Select
              aria-describedby={errors[field] ? `match-${field}-error` : undefined}
              aria-invalid={Boolean(errors[field])}
              id={`match-${field}`}
              {...register(field)}
            >
              <option value="">À renseigner</option>
              {teams.map((team) => (
                <option
                  disabled={team.status !== "REGISTERED"}
                  key={team.id}
                  value={team.id}
                >
                  {team.name}
                  {team.status !== "REGISTERED" ? " (retirée)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        ))}
        {(
          [
            { field: "matchDate", label: "Date", type: "date" },
            { field: "startTime", label: "Heure de Paris", type: "time" },
            { field: "stadium", label: "Lieu", type: "text" },
          ] as const
        ).map(({ field, label, type }) => (
          <FormField
            error={errors[field]?.message}
            htmlFor={`match-${field}`}
            key={field}
            label={label}
            required={field !== "stadium" && match.isPublished}
          >
            <Input
              aria-describedby={errors[field] ? `match-${field}-error` : undefined}
              hasError={Boolean(errors[field])}
              id={`match-${field}`}
              type={type}
              {...register(field)}
            />
          </FormField>
        ))}
      </fieldset>
      <MatchMutationError error={mutation.error} onReload={onReload} />
      <div className={matchStyles.formActions}>
        <Link
          className="lucarne-button lucarne-button--ghost"
          to={`/dashboard/matches/${match.id}`}
        >
          Annuler
        </Link>
        <Button
          disabled={
            mutation.isPending ||
            !isDirty ||
            mutation.error?.code === "RESOURCE_VERSION_CONFLICT"
          }
          type="submit"
        >
          {mutation.isPending ? "Enregistrement…" : "Enregistrer la programmation"}
        </Button>
      </div>
    </form>
  );
}

export default MatchProgrammingForm;
