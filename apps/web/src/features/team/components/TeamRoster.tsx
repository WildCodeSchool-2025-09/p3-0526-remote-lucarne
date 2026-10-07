import type { TeamRosterMember, TeamRosterPlayer } from "@lucarne/shared";
import { useState } from "react";
import { Link } from "react-router";
import { useTeamRoster } from "../../../hooks/useTeamDetail";
import { Alert, Button, EntityAvatar } from "../../../ui";
import { teamStyles } from "../teamStyles";

type RosterTableProps = { title: string } & (
  | { members: TeamRosterPlayer[]; resource: "players" }
  | { members: TeamRosterMember[]; resource: "staff-members" }
);

function RosterTable({
  members,
  title,
  resource,
}: RosterTableProps) {
  const [sortBy, setSortBy] = useState<"name" | "position">("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const changeSort = (field: typeof sortBy) => {
    setSortBy(field);
    setDirection(field === sortBy && direction === "asc" ? "desc" : "asc");
  };
  const compare = (a: string, b: string) =>
    a.localeCompare(b, "fr", { sensitivity: "base" });
  const sorted = [...members].sort((a, b) => {
    const name = compare(a.lastName, b.lastName) || compare(a.firstName, b.firstName);
    const primary =
      sortBy === "name" ? name : compare(a.position ?? "", b.position ?? "") || name;
    return (direction === "asc" ? primary : -primary) || compare(a.id, b.id);
  });
  return (
    <section className={`${teamStyles.detailCard} min-w-0`} aria-label={title}>
      <h2 className="m-0">{title}</h2>
      {members.length === 0 ? (
        <p>
          {resource === "players"
            ? "Aucune joueuse dans cette équipe à cette date."
            : "Aucun membre du staff dans cette équipe à cette date."}
        </p>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <table className={teamStyles.rosterTable}>
            <caption className="sr-only">
              {title} — tri par {sortBy === "name" ? "nom" : "poste"}, ordre{" "}
              {direction === "asc" ? "croissant" : "décroissant"}
            </caption>
            <thead className="team-compact:block">
              <tr className="team-compact:grid team-compact:grid-cols-2">
                {(["name", "position"] as const).map((field) => (
                  <th
                    key={field}
                    scope="col"
                    aria-sort={
                      sortBy === field
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <Button
                      className="px-0!"
                      variant="ghost"
                      onClick={() => changeSort(field)}
                    >
                      {field === "name" ? "Nom" : "Poste"}
                      {sortBy === field ? (direction === "asc" ? " ↑" : " ↓") : ""}
                    </Button>
                  </th>
                ))}
                {resource === "players" ? (
                  <th scope="col" className="team-compact:hidden">Numéro</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="team-compact:block">
              {sorted.map((member) => (
                <tr className={teamStyles.rosterRow} key={member.assignmentId}>
                  <td className={teamStyles.rosterLabel} data-label="Nom">
                    <div className="flex items-center gap-3 [&_.entity-logo]:shrink-0 [&_.entity-logo]:object-cover">
                      <EntityAvatar
                        imageUrl={member.pictureUrl}
                        name={`${member.lastName} ${member.firstName}`}
                      />
                      <Link
                        className={teamStyles.nameLink}
                        to={`/dashboard/${resource}/${member.id}`}
                      >
                        {member.lastName} {member.firstName}
                      </Link>
                    </div>
                  </td>
                  <td className={teamStyles.rosterLabel} data-label="Poste">
                    {member.position ?? "Non renseigné"}
                  </td>
                  {resource === "players" ? (
                    <td className={teamStyles.rosterLabel} data-label="Numéro">
                      {"shirtNumber" in member ? member.shirtNumber ?? "Non renseigné" : "Non renseigné"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TeamRoster({ teamId }: { teamId: string }) {
  const query = useTeamRoster(teamId);
  if (query.isPending) return <p role="status">Chargement de l’effectif…</p>;
  if (query.isError)
    return (
      <div>
        <Alert variant="danger">Impossible de charger l’effectif.</Alert>
        <Button onClick={() => void query.refetch()}>Réessayer l’effectif</Button>
      </div>
    );
  if (!query.data) return null;
  return (
    <div className="grid min-w-0 gap-6">
      <p className={`m-0 ${teamStyles.description}`}>Effectif au {query.data.date}</p>
      <RosterTable members={query.data.players} title="Effectif" resource="players" />
      <RosterTable
        members={query.data.staffMembers}
        title="Staff"
        resource="staff-members"
      />
    </div>
  );
}
export { RosterTable };
export default TeamRoster;
