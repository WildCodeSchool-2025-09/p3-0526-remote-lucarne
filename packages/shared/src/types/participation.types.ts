type ParticipationStatus = "REGISTERED" | "WITHDRAWN";

type Participation = {
  teamId: string;
  seasonId: string;
  registrationAt: string;
  points: number;
  rank: number | null;
  status: ParticipationStatus;
};

type CreateParticipationInput = {
  teamId: string;
};

type ParticipationWithdrawalPreview = {
  teamId: string;
  seasonId: string;
  scheduledMatchCount: number;
};

type WithdrawParticipationResponse = {
  participation: Participation;
  scheduledMatchCount: number;
};

export type {
  CreateParticipationInput,
  Participation,
  ParticipationStatus,
  ParticipationWithdrawalPreview,
  WithdrawParticipationResponse,
};
