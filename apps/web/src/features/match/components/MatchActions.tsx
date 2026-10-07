import { matchStyles } from "../matchStyles";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  matchPublicationSchema,
  matchStatusSchema,
  type AdminMatch,
} from "@lucarne/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import type { z } from "zod";
import {
  deleteMatch,
  publishMatch,
  updateMatchResult,
  updateMatchStatus,
} from "../../../services/match.service";
import { matchResultFormSchema } from "../../../schemas/match.schema";
import { Button, ConfirmDialog, FormField, Input, Select } from "../../../ui";
import { useMatchMutation } from "../hooks/useMatches";
import { matchStatusLabels } from "../matchPresentation";
import MatchMutationError from "./MatchMutationError";

function MatchActions({ match, onReload }: { match: AdminMatch; onReload: () => void }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState(match.status);
  const [scoreVersion, setScoreVersion] = useState(match.version);
  const publish = useMatchMutation(() =>
    publishMatch(match.id, { version: match.version }),
  );
  const statusMutation = useMatchMutation(() =>
    updateMatchStatus(match.id, { version: match.version, status }),
  );
  const resultMutation = useMatchMutation(
    (values: z.output<typeof matchResultFormSchema>) =>
      updateMatchResult(match.id, { ...values, version: scoreVersion }),
  );
  const deletion = useMatchMutation(() =>
    deleteMatch(match.id, { version: match.version }),
  );
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof matchResultFormSchema>,
    undefined,
    z.output<typeof matchResultFormSchema>
  >({
    resolver: zodResolver(matchResultFormSchema),
    defaultValues: {
      homeScore: match.result.homeScore?.toString() ?? "",
      awayScore: match.result.awayScore?.toString() ?? "",
    },
  });
  const pending =
    publish.isPending ||
    statusMutation.isPending ||
    resultMutation.isPending ||
    deletion.isPending;
  const complete = matchPublicationSchema.safeParse({
    matchdayId: match.matchdayId,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    matchDate: match.matchDate,
    startTime: match.startTime,
    stadium: match.stadium,
  }).success;
  const finishBlocked =
    status === "COMPLETED" &&
    (match.result.homeScore === null || match.result.awayScore === null);

  return (
    <div className="mt-6 grid gap-6 [&_.lucarne-button]:mt-3!">
      {!match.isPublished ? (
        <section className={matchStyles.detailCard}>
          <h2>Publication</h2>
          <p>
            {complete
              ? "Le match est prêt à être publié."
              : "Renseignez deux équipes, une date et une heure avant de publier."}
          </p>
          <Button
            disabled={
              pending || !complete || publish.error?.code === "RESOURCE_VERSION_CONFLICT"
            }
            onClick={() => {
              publish.reset();
              publish.mutate(undefined, {
                onSuccess: (updated) => setScoreVersion(updated.version),
              });
            }}
          >
            Publier le match
          </Button>
          <MatchMutationError error={publish.error} onReload={onReload} />
        </section>
      ) : (
        <>
          <section className={matchStyles.detailCard}>
            <h2>État du match</h2>
            <FormField htmlFor="match-status" label="État">
              <Select
                disabled={pending}
                id="match-status"
                onChange={(event) =>
                  setStatus(matchStatusSchema.parse(event.target.value))
                }
                value={status}
              >
                {Object.entries(matchStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            {finishBlocked ? (
              <p>Renseignez les deux scores pour terminer le match.</p>
            ) : null}
            <Button
              disabled={
                pending ||
                finishBlocked ||
                status === match.status ||
                statusMutation.error?.code === "RESOURCE_VERSION_CONFLICT"
              }
              onClick={() => {
                statusMutation.reset();
                statusMutation.mutate(undefined, {
                  onSuccess: (updated) => setScoreVersion(updated.version),
                });
              }}
            >
              Enregistrer l’état
            </Button>
            <MatchMutationError error={statusMutation.error} onReload={onReload} />
          </section>
          <section className={matchStyles.detailCard}>
            <h2>Résultat</h2>
            <form
              noValidate
              onSubmit={(event) => {
                resultMutation.reset();
                void handleSubmit((values) =>
                  resultMutation.mutate(values, {
                    onSuccess: (updated) => {
                      reset({
                        homeScore: updated.result.homeScore?.toString() ?? "",
                        awayScore: updated.result.awayScore?.toString() ?? "",
                      });
                      setScoreVersion(updated.version);
                    },
                  }),
                )(event);
              }}
            >
              <fieldset className={matchStyles.fieldset} disabled={pending}>
                <legend>Scores corrigibles, même après la fin</legend>
                {(["homeScore", "awayScore"] as const).map((field) => (
                  <FormField
                    error={errors[field]?.message}
                    htmlFor={`match-${field}`}
                    key={field}
                    label={field === "homeScore" ? "Score domicile" : "Score extérieur"}
                    required
                  >
                    <Input
                      aria-describedby={
                        errors[field] ? `match-${field}-error` : undefined
                      }
                      hasError={Boolean(errors[field])}
                      id={`match-${field}`}
                      inputMode="numeric"
                      min={0}
                      step={1}
                      type="number"
                      {...register(field)}
                    />
                  </FormField>
                ))}
              </fieldset>
              <Button
                disabled={
                  pending || resultMutation.error?.code === "RESOURCE_VERSION_CONFLICT"
                }
                type="submit"
              >
                Enregistrer les scores
              </Button>
              <MatchMutationError error={resultMutation.error} onReload={onReload} />
            </form>
          </section>
        </>
      )}
      <section className={matchStyles.detailCard}>
        <h2>Suppression</h2>
        <p>
          Le match disparaîtra des calendriers et ses équipes seront libérées pour cette
          journée. Ses résultats et événements seront conservés.
        </p>
        <Button
          disabled={pending}
          onClick={() => {
            deletion.reset();
            setConfirmDelete(true);
          }}
          variant="danger"
        >
          Supprimer le match
        </Button>
        <MatchMutationError
          error={deletion.error}
          onReload={() => {
            setConfirmDelete(false);
            onReload();
          }}
        />
        <ConfirmDialog
          actionLabel={
            deletion.error?.code === "RESOURCE_VERSION_CONFLICT"
              ? "Recharger les données"
              : "Supprimer"
          }
          error={deletion.error?.message}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            if (deletion.error?.code === "RESOURCE_VERSION_CONFLICT") {
              setConfirmDelete(false);
              onReload();
            } else
              deletion.mutate(undefined, {
                onSuccess: () => void navigate("/dashboard/matches"),
              });
          }}
          open={confirmDelete}
          pending={deletion.isPending}
          title="Supprimer ce match ?"
          variant="danger"
        >
          Le match ne sera plus visible. Cette suppression est également possible pour un
          match fini.
        </ConfirmDialog>
      </section>
    </div>
  );
}

export default MatchActions;
