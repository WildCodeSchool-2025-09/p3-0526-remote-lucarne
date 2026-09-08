const PLAYERS_PER_TEAM = 12;

const createSeedUuid = (value: number): string =>
  `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;

const SEED_IDS = Object.freeze({
  league: "00000000-0000-4000-8000-000000000021",
  season: "00000000-0000-4000-8000-000000000022",
  teams: [
    "00000000-0000-4000-8000-000000000101",
    "00000000-0000-4000-8000-000000000102",
  ],
  staffMembers: [
    "00000000-0000-4000-8000-000000000301",
    "00000000-0000-4000-8000-000000000302",
  ],
  players: Array.from(
    { length: PLAYERS_PER_TEAM * 2 },
    (_value, index) => createSeedUuid(201 + index),
  ),
});

export { PLAYERS_PER_TEAM, SEED_IDS };
