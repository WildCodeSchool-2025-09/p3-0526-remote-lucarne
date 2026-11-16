import prisma from "../../database/prisma";
import { assignmentDate } from "../../src/utils/assignmentPeriod";
import { createSeasonForLeague } from "./season";

export async function createPublicSportsFixture() {
  const league = await prisma.league.create({ data: { name: "Élite féminine", country: "France", isActive: true } });
  const season = await createSeasonForLeague(league.id, "Élite 2026-2027");
  await prisma.leagueSeason.update({ where: { id: season.leagueSeasonId }, data: { isCurrent: true } });
  const teams = await prisma.team.createManyAndReturn({ data: ["Élite", "Élite Racing", "Club Élite", "SuperÉliteClub"].map((name) => ({ name, stadium: "Stade des Lumières" })) });
  await prisma.participation.createMany({ data: teams.map((team) => ({ teamId: team.id, leagueSeasonId: season.leagueSeasonId })) });
  const players = await prisma.player.createManyAndReturn({ data: [
    { firstName: "Éléonore", lastName: "Martin", nationality: "France", position: "Attaquante" },
    { firstName: "Louise", lastName: "Dupont", nationality: "Belgique", position: "Milieu" },
  ] });
  await prisma.teamPlayer.createMany({ data: players.map((player, index) => ({ teamId: teams[index].id, playerId: player.id, joinedAt: assignmentDate(), shirtNumber: index + 7 })) });
  const days = await prisma.matchday.createManyAndReturn({ data: [1, 2, 3, 4].map((number) => ({ number, leagueSeasonId: season.leagueSeasonId })) });
  const matches = [];
  for (const [index, homeScore, awayScore] of [[0, 2, 0], [1, 1, 1], [2, 0, 1]] as const) {
    matches.push(await prisma.gameMatch.create({ data: { matchdayId: days[index].id, homeTeamId: teams[0].id, awayTeamId: teams[1].id,
      matchDate: new Date(`2026-10-${String(index + 10)}`), startTime: new Date("1970-01-01T18:00:00Z"), homeScore, awayScore, status: "COMPLETED", isPublished: true,
    } }));
  }
  await prisma.matchEvent.createMany({ data: [
    { matchId: matches[0].id, playerId: players[0].id, minute: 0 },
    { matchId: matches[0].id, playerId: players[0].id, minute: 25 },
    { matchId: matches[2].id, playerId: players[1].id, minute: 67 },
  ] });
  return { league, season, teams, players, days, matches };
}
