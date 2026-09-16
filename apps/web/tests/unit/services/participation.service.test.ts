import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "../../../src/lib/httpClient";
import { createParticipation, getParticipationWithdrawalPreview, withdrawParticipation } from "../../../src/services/participation.service";

describe("participation service", () => {
  afterEach(() => vi.restoreAllMocks());

  it("registers a team in a season", async () => {
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({});

    await createParticipation("season-id", { teamId: "team-id" });

    expect(post).toHaveBeenCalledWith("/seasons/season-id/participations", { json: { teamId: "team-id" } });
  });

  it("loads the withdrawal preview", async () => {
    const get = vi.spyOn(httpClient, "get").mockResolvedValue({ teamId: "team-id", seasonId: "season-id", scheduledMatchCount: 2 });

    await getParticipationWithdrawalPreview("season-id", "team-id");

    expect(get).toHaveBeenCalledWith("/seasons/season-id/participations/team-id/withdrawal-preview");
  });

  it("withdraws a participation", async () => {
    const remove = vi.spyOn(httpClient, "delete").mockResolvedValue({});

    await withdrawParticipation("season-id", "team-id");

    expect(remove).toHaveBeenCalledWith("/seasons/season-id/participations/team-id");
  });
});
