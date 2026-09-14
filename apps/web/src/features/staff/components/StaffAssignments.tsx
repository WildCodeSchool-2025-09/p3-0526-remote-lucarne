import type { StaffAssignment } from "@lucarne/shared";

function StaffAssignments({ assignments }: { assignments: StaffAssignment[] }) {
  const labels = { CURRENT: "Courante", PLANNED: "Planifiée", HISTORICAL: "Historique" };
  return <section aria-label="Affectations du staff"><h2>Affectations</h2>{assignments.length === 0 ? <p>Aucune affectation.</p> : <ul>{assignments.map((assignment) => <li key={assignment.id}>{assignment.team.name} — {assignment.jobTitle} — {labels[assignment.state]} — du {assignment.joinedAt}{assignment.leftAt ? ` au ${assignment.leftAt}` : " (sans date de fin)"}</li>)}</ul>}</section>;
}

export { StaffAssignments };
