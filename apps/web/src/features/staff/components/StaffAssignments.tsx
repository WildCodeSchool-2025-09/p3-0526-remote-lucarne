import type { StaffAssignment } from "@lucarne/shared";
import { useState } from "react";
import { Button } from "../../../ui";
import { StaffAssignmentDateEditor } from "./StaffAssignmentDateEditor";

function StaffAssignments({
  assignments,
  personId = "",
  canEdit = false,
}: {
  assignments: StaffAssignment[];
  personId?: string;
  canEdit?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const labels = { CURRENT: "Courante", PLANNED: "Planifiée", HISTORICAL: "Historique" };
  return (
    <section aria-label="Affectations du staff">
      <h2>Affectations</h2>
      {assignments.length === 0 ? (
        <p>Aucune affectation.</p>
      ) : (
        <ul>
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              {assignment.team.name} — {assignment.jobTitle} — {labels[assignment.state]}{" "}
              — du {assignment.joinedAt}
              {assignment.leftAt ? ` au ${assignment.leftAt}` : " (sans date de fin)"}
              {canEdit ? (
                <Button variant="ghost" onClick={() => setEditingId(assignment.id)}>
                  Modifier les dates
                </Button>
              ) : null}
              {editingId === assignment.id ? (
                <StaffAssignmentDateEditor
                  personId={personId}
                  assignment={assignment}
                  onClose={() => setEditingId(null)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { StaffAssignments };
