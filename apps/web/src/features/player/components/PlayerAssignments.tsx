import type { PlayerAssignment } from "@lucarne/shared";

function PlayerAssignments({ assignments }: { assignments: PlayerAssignment[] }) {
  const labels = { CURRENT: "Courante", PLANNED: "Planifiée", HISTORICAL: "Historique" };
  return <section aria-label="Affectations du joueur">
    <h2>Affectations</h2>
    {assignments.length === 0 ? <p>Aucune affectation.</p> : <ul>
      {assignments.map((assignment) => <li key={assignment.id}>
        {assignment.team.name} — {labels[assignment.state]} — du {assignment.joinedAt}
        {assignment.leftAt ? ` au ${assignment.leftAt}` : " (sans date de fin)"}
      </li>)}
    </ul>}
  </section>;
}

export { PlayerAssignments };
