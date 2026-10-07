import type {
  CreateParticipationInput,
  Participation,
  ParticipationWithdrawalPreview,
  WithdrawParticipationResponse,
} from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function createParticipation(leagueSeasonId: string, input: CreateParticipationInput): Promise<Participation> {
  return httpClient.post<Participation>(`/league-seasons/${leagueSeasonId}/participations`, { json: input });
}

async function getParticipationWithdrawalPreview(leagueSeasonId: string, teamId: string): Promise<ParticipationWithdrawalPreview> {
  return httpClient.get<ParticipationWithdrawalPreview>(`/league-seasons/${leagueSeasonId}/participations/${teamId}/withdrawal-preview`);
}

async function withdrawParticipation(leagueSeasonId: string, teamId: string): Promise<WithdrawParticipationResponse> {
  return httpClient.delete<WithdrawParticipationResponse>(`/league-seasons/${leagueSeasonId}/participations/${teamId}`);
}

export { createParticipation, getParticipationWithdrawalPreview, withdrawParticipation };
