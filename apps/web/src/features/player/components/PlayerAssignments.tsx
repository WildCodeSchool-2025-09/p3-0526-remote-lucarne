import { playerStyles } from "../playerStyles";
import type { PlayerAssignment } from "@lucarne/shared";
import { Fragment, useState, type ReactNode } from "react";
import { formatDate } from "../../../lib/dateFormat";
import { Button, EntityLogo } from "../../../ui";
import { PlayerAssignmentDateEditor } from "./PlayerAssignmentDateEditor";

function AssignmentClubLogo({ team }: { team: PlayerAssignment["team"] }) {
  const [hasError, setHasError] = useState(false);

  return team.logoUrl && !hasError ? (
    <img
      alt={`Logo de ${team.name}`}
      className="size-11 shrink-0 rounded-lg object-contain"
      src={team.logoUrl}
      onError={() => setHasError(true)}
    />
  ) : (
    <EntityLogo logoUrl={null} name={team.name} />
  );
}

function PlayerAssignments({
  assignments,
  playerId = "",
  canEdit = false,
  children,
}: {
  assignments: PlayerAssignment[];
  playerId?: string;
  canEdit?: boolean;
  children?: ReactNode;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const labels = { CURRENT: "Courante", PLANNED: "Planifiée", HISTORICAL: "Historique" };

  return (
    <section
      className={playerStyles.detailCard}
      aria-labelledby="player-assignments-title"
    >
      <h2 id="player-assignments-title">Affectations</h2>
      {assignments.length === 0 ? (
        <p>Aucune affectation.</p>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <table
            className={`
            w-full border-collapse player-compact:block [&_th]:border-b
            [&_th]:border-[var(--color-border-default)] [&_th]:p-3 [&_th]:text-left
            [&_th]:align-middle [&_td]:border-b [&_td]:border-[var(--color-border-default)]
            [&_td]:p-3 [&_td]:text-left [&_td]:align-middle player-compact:[&_td]:block
            player-compact:[&_td]:border-0 player-compact:[&_td]:[overflow-wrap:anywhere]
          `}
          >
            <caption className="sr-only">
              Affectations de la joueuse — dates de fin incluses
            </caption>
            <thead
              className={`
              player-compact:absolute player-compact:size-px player-compact:overflow-hidden
              player-compact:[clip-path:inset(50%)]
            `}
            >
              <tr className={playerStyles.assignmentRow}>
                <th scope="col">Club</th>
                <th scope="col">Statut</th>
                <th scope="col">Date de début</th>
                <th scope="col">Date de fin (incluse)</th>
                {canEdit ? <th scope="col">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="player-compact:block">
              {assignments.map((assignment) => (
                <Fragment key={assignment.id}>
                  <tr className={playerStyles.assignmentRow}>
                    <td className={playerStyles.assignmentLabel} data-label="Club">
                      <div className="flex items-center gap-3 [overflow-wrap:anywhere] [&_.entity-logo]:shrink-0">
                        <AssignmentClubLogo
                          key={`${assignment.team.id}:${assignment.team.logoUrl ?? ""}`}
                          team={assignment.team}
                        />
                        <span>{assignment.team.name}</span>
                      </div>
                    </td>
                    <td className={playerStyles.assignmentLabel} data-label="Statut">
                      {labels[assignment.state]}
                    </td>
                    <td
                      className={playerStyles.assignmentLabel}
                      data-label="Date de début"
                    >
                      {assignment.joinedAt
                        ? formatDate(assignment.joinedAt)
                        : "Non renseignée"}
                    </td>
                    <td
                      className={playerStyles.assignmentLabel}
                      data-label="Date de fin (incluse)"
                    >
                      {assignment.leftAt
                        ? formatDate(assignment.leftAt)
                        : "Sans date de fin"}
                    </td>
                    {canEdit ? (
                      <td className={playerStyles.assignmentLabel} data-label="Actions">
                        <Button
                          variant="ghost"
                          onClick={() => setEditingId(assignment.id)}
                        >
                          Modifier les dates
                          <span className="sr-only">
                            {" "}
                            de l’affectation à {assignment.team.name} du{" "}
                            {formatDate(assignment.joinedAt)}
                          </span>
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                  {canEdit && editingId === assignment.id ? (
                    <tr className={playerStyles.assignmentRow}>
                      <td colSpan={5}>
                        <PlayerAssignmentDateEditor
                          playerId={playerId}
                          assignment={assignment}
                          onClose={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {children}
    </section>
  );
}

export { PlayerAssignments };
