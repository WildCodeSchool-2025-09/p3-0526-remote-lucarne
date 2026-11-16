import type { Participation } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as teamService from "../../../src/services/team.service";
import * as participationService from "../../../src/services/participation.service";
import { useUpdateTeam } from "../../../src/hooks/useUpdateTeam";
import { useTeamMutation } from "../../../src/features/team/hooks/useTeamMutation";
import { useCreateParticipation } from "../../../src/features/season/hooks/useCreateParticipation";
import { useWithdrawParticipation } from "../../../src/features/season/hooks/useWithdrawParticipation";
import { leagueKeys } from "../../../src/features/league/leagueKeys";
import { teamKeys } from "../../../src/features/team/teamKeys";
import { playerKeys } from "../../../src/features/player/playerKeys";
import { staffKeys } from "../../../src/features/staff/staffKeys";
import { seasonKeys } from "../../../src/features/season/seasonKeys";

const team = { id: "team-id", name: "Team", logoUrl: null, stadium: null, isActive: true, createdAt: "2026-10-12T00:00:00Z" };
const participation: Participation = { teamId: team.id, leagueSeasonId: "edition-id", registrationAt: "2026-10-12T00:00:00Z", points: 0, rank: null, status: "REGISTERED" };

describe("Public league teams cache", () => {
  beforeEach(() => {
    vi.spyOn(teamService, "updateTeam").mockResolvedValue(team);
    vi.spyOn(participationService, "createParticipation").mockResolvedValue(participation);
    vi.spyOn(participationService, "withdrawParticipation").mockResolvedValue({ participation: { ...participation, status: "WITHDRAWN" }, scheduledMatchCount: 0 });
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["rename", "deactivate", "activate", "register", "withdraw"] as const)("invalidates all public pages and seasons after %s", async (action) => {
    const client = new QueryClient();
    const keys = [
      leagueKeys.publicTeamList("league", "season-one", { page: 1, pageSize: 20 }),
      leagueKeys.publicTeamList("league", "season-one", { page: 2, pageSize: 20 }),
      leagueKeys.publicTeamList("league", "season-two", { page: 1, pageSize: 20 }),
      [...teamKeys.detail(team.id), "public"],
      [...teamKeys.rosters(), team.id, "public", "current"],
      [...playerKeys.details(), "player-id", "public"],
      [...staffKeys.details(), "staff-id", "public"],
      [...seasonKeys.all, "public", "matchday", "day-id"],
      [...leagueKeys.all, "public", "standings", "league", "season"],
      [...leagueKeys.all, "public", "statistics", "league", "season", { page: 1, limit: 20 }],
      ["public", "search", { q: "team", page: 1, limit: 20, type: "ALL" }],
    ];
    keys.forEach((key) => client.setQueryData(key, { data: [team] }));
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => ({
      update: useUpdateTeam(team.id), change: useTeamMutation(),
      register: useCreateParticipation(participation.leagueSeasonId), withdraw: useWithdrawParticipation(),
    }), { wrapper });
    act(() => {
      if (action === "rename") result.current.update.mutate({ name: "Renamed" });
      else if (action === "register") result.current.register.mutate({ teamId: team.id });
      else if (action === "withdraw") result.current.withdraw.mutate({ leagueSeasonId: participation.leagueSeasonId, teamId: team.id });
      else result.current.change.mutate({ action, id: team.id });
    });
    await waitFor(() => keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true)));
    unmount(); client.clear();
  });
});
