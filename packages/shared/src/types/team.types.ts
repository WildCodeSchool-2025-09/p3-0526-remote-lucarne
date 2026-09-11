type Team = {
  id: string;
  name: string;
  logoUrl: string | null;
  stadium: string | null;
  isActive: boolean;
  createdAt: string;
};

type CreateTeamInput = {
  name: string;
  logoUrl?: string | null;
  stadium?: string | null;
};

export type { CreateTeamInput, Team };
