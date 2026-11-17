type TeamRosterMember = {
  id: string;
  assignmentId: string;
  firstName: string;
  lastName: string;
  position: string | null;
  pictureUrl: string | null;
};
type TeamRosterPlayer = TeamRosterMember & {
  shirtNumber: number | null;
};
type TeamRoster = {
  date: string;
  players: TeamRosterPlayer[];
  staffMembers: TeamRosterMember[];
};
export type { TeamRoster, TeamRosterMember, TeamRosterPlayer };
