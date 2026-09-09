interface LeagueResponse {
  id: string;
  name: string;
  country: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export type { LeagueResponse };
