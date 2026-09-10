interface CreateLeagueInput {
  name: string;
  country: string;
  logoUrl?: string;
  isActive?: boolean;
}

interface League {
  id: string;
  name: string;
  country: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export type { CreateLeagueInput, League };
