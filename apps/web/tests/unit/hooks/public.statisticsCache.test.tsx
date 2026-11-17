import type { PlayerDetail } from "@lucarne/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useMatchMutation } from "../../../src/features/match/hooks/useMatches";
import { useUpdatePlayer } from "../../../src/hooks/usePlayer";
import * as players from "../../../src/services/player.service";

const player: PlayerDetail = { id: "player-id", firstName: "Alex", lastName: "Martin", nationality: null, position: null, pictureUrl: null, birthday: null,
  createdAt: "2026-01-01T00:00:00Z", version: 1, isActive: true, isSelectable: true, activeTeam: null, assignments: [],
};

it.each(["match correction", "player update"])("invalidates dependent public statistics and search after a successful %s", async (action) => {
  vi.spyOn(players, "updatePlayer").mockResolvedValue(player);
  const client = new QueryClient();
  const keys = [
    ["league", "public", "standings", "elite", "season-id"],
    ["league", "public", "statistics", "elite", "season-id", { page: 1, limit: 20 }],
    ["player", "detail", player.id, "public", "statistics", { leagueId: "league-id", seasonId: "season-id" }],
    ["public", "search", { q: "alex", page: 1, limit: 20, type: "ALL" }],
    ["match", "public", "detail", "match-id", "events"],
  ];
  for (const key of keys) client.setQueryData(key, { marker: "public DTO" });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => ({ match: useMatchMutation<void, void>(() => Promise.resolve()), player: useUpdatePlayer() }), { wrapper });
  await act(async () => {
    if (action === "match correction") await result.current.match.mutateAsync();
    else await result.current.player.mutateAsync({ id: player.id, input: { version: 0, firstName: "Alex" } });
  });
  for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(client.getQueryData(keys[2])).toEqual({ marker: "public DTO" });
  unmount(); client.clear(); vi.restoreAllMocks();
});
