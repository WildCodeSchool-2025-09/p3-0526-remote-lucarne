import type {
  CreateParticipationInput,
  Participation,
  ParticipationWithdrawalPreview,
  WithdrawParticipationResponse,
} from "@lucarne/shared";
import { httpClient } from "../lib/httpClient";

async function createParticipation(seasonId: string, input: CreateParticipationInput): Promise<Participation> {
  return httpClient.post<Participation>(`/seasons/${seasonId}/participations`, { json: input });
}

async function getParticipationWithdrawalPreview(seasonId: string, teamId: string): Promise<ParticipationWithdrawalPreview> {
  return httpClient.get<ParticipationWithdrawalPreview>(`/seasons/${seasonId}/participations/${teamId}/withdrawal-preview`);
}

async function withdrawParticipation(seasonId: string, teamId: string): Promise<WithdrawParticipationResponse> {
  return httpClient.delete<WithdrawParticipationResponse>(`/seasons/${seasonId}/participations/${teamId}`);
}

export { createParticipation, getParticipationWithdrawalPreview, withdrawParticipation };
