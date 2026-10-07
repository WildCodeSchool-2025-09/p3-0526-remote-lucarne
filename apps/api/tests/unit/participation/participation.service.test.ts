import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../../src/generated/prisma/client";
import { createOrRestoreParticipation, getParticipationWithdrawalPreview, withdrawParticipation } from "../../../src/features/participation/participation.repository";
import { createParticipationService, getParticipationWithdrawalPreviewService, withdrawParticipationService } from "../../../src/features/participation/participation.service";

vi.mock("../../../src/features/participation/participation.repository", () => ({
  createOrRestoreParticipation: vi.fn(),
  getParticipationWithdrawalPreview: vi.fn(),
  withdrawParticipation: vi.fn(),
}));

const create = vi.mocked(createOrRestoreParticipation);
const preview = vi.mocked(getParticipationWithdrawalPreview);
const withdraw = vi.mocked(withdrawParticipation);
const participation = {
  teamId: "team-id",
  leagueSeasonId: "season-id",
  registrationAt: new Date("2026-08-01T00:00:00.000Z"),
  points: 0,
  rank: null,
  status: "REGISTERED",
};

describe("participation services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue(participation);
    preview.mockResolvedValue({ participation, scheduledMatchCount: 2 });
    withdraw.mockResolvedValue({ participation: { ...participation, status: "WITHDRAWN" }, scheduledMatchCount: 2 });
  });

  it("creates a participation with the selected season and team", async () => {
    await expect(createParticipationService("season-id", { teamId: "team-id" })).resolves.toBe(participation);
    expect(create).toHaveBeenCalledWith("season-id", "team-id");
  });

  it("exposes the withdrawal preview", async () => {
    await expect(getParticipationWithdrawalPreviewService("season-id", "team-id")).resolves.toEqual({ participation, scheduledMatchCount: 2 });
    expect(preview).toHaveBeenCalledWith("season-id", "team-id");
  });

  it("withdraws a participation and returns the scheduled match count", async () => {
    await expect(withdrawParticipationService("season-id", "team-id")).resolves.toMatchObject({ scheduledMatchCount: 2 });
    expect(withdraw).toHaveBeenCalledWith("season-id", "team-id");
  });

  it("maps serialization conflicts to a business error", async () => {
    withdraw.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "7" }));

    await expect(withdrawParticipationService("season-id", "team-id")).rejects.toMatchObject({
      statusCode: 409,
      code: "PARTICIPATION_CONFLICT",
    });
  });

  it("maps registration serialization conflicts to the same business error", async () => {
    create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "7" }));
    await expect(createParticipationService("season-id", { teamId: "team-id" })).rejects.toMatchObject({ statusCode: 409, code: "PARTICIPATION_CONFLICT" });
  });
});
