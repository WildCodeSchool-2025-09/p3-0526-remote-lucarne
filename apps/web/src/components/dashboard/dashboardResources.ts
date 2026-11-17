export const dashboardResources = {
  leagues: { label: "Ligues", singular: "Ligue", path: "/dashboard/leagues" },
  seasons: { label: "Saisons", singular: "Saison", path: "/dashboard/seasons" },
  teams: { label: "Équipes", singular: "Équipe", path: "/dashboard/teams" },
  players: { label: "Joueuses", singular: "Joueuse", path: "/dashboard/players" },
  staff: {
    label: "Staff",
    singular: "Membre du staff",
    path: "/dashboard/staff-members",
  },
  matches: { label: "Matchs", singular: "Match", path: "/dashboard/matches" },
} as const;

export type DashboardResource = keyof typeof dashboardResources;
