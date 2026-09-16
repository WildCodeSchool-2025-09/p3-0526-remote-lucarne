import type { SeasonDetail } from "@lucarne/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SeasonParticipations from "../../../../src/features/season/components/SeasonParticipations";

const useTeamListMock = vi.hoisted(() => vi.fn());
const useCreateParticipationMock = vi.hoisted(() => vi.fn());
const usePreviewMock = vi.hoisted(() => vi.fn());
const useWithdrawMock = vi.hoisted(() => vi.fn());
const getCurrentAppRoleMock = vi.hoisted(() => vi.fn());
const hasRoleMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/hooks/useTeamList", () => ({ useTeamList: useTeamListMock }));
vi.mock("../../../../src/features/season/hooks/useCreateParticipation", () => ({ useCreateParticipation: useCreateParticipationMock }));
vi.mock("../../../../src/features/season/hooks/useParticipationWithdrawalPreview", () => ({ useParticipationWithdrawalPreview: usePreviewMock }));
vi.mock("../../../../src/features/season/hooks/useWithdrawParticipation", () => ({ useWithdrawParticipation: useWithdrawMock }));
vi.mock("../../../../src/auth/authRole", () => ({
  APP_ROLES: { ADMIN: "ADMIN", MODERATOR: "MODERATOR", EDITOR: "EDITOR" },
  getCurrentAppRole: getCurrentAppRoleMock,
  hasRole: hasRoleMock,
}));

const season: SeasonDetail = {
  id: "season-id",
  leagueId: "league-id",
  name: "2030-2031",
  startDate: "2030-08-01",
  endDate: "2031-06-30",
  status: "INACTIVE",
  version: 0,
  createdAt: "2030-01-01T00:00:00.000Z",
  league: { id: "league-id", name: "Ligue 1", country: "France" },
  participatingTeams: [{
    id: "registered-team",
    name: "Paris FC",
    logoUrl: null,
    status: "REGISTERED",
    registrationAt: "2030-08-01T00:00:00.000Z",
    points: 0,
    rank: null,
    scheduledMatchCount: 2,
  }],
  matchdays: [],
};

describe("SeasonParticipations", () => {
  const createMutateAsync = vi.fn().mockResolvedValue({});
  const previewMutateAsync = vi.fn().mockResolvedValue({ teamId: "registered-team", seasonId: "season-id", scheduledMatchCount: 2 });
  const withdrawMutateAsync = vi.fn().mockResolvedValue({ participation: { ...season.participatingTeams[0], status: "WITHDRAWN" }, scheduledMatchCount: 2 });

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentAppRoleMock.mockReturnValue("EDITOR");
    hasRoleMock.mockReturnValue(true);
    useTeamListMock.mockReturnValue({ data: { data: [{ id: "new-team", name: "Lyon FC" }], pagination: {} }, isPending: false });
    useCreateParticipationMock.mockReturnValue({ isPending: false, mutateAsync: createMutateAsync });
    usePreviewMock.mockReturnValue({ data: { teamId: "registered-team", seasonId: "season-id", scheduledMatchCount: 2 }, isPending: false, mutateAsync: previewMutateAsync });
    useWithdrawMock.mockReturnValue({ isPending: false, mutateAsync: withdrawMutateAsync });
  });

  it("registers an available active team", async () => {
    const user = userEvent.setup();
    render(<SeasonParticipations season={season} />);

    await user.selectOptions(screen.getByLabelText("Inscrire une équipe"), "new-team");
    await user.click(screen.getByRole("button", { name: "Inscrire" }));

    expect(createMutateAsync).toHaveBeenCalledWith({ teamId: "new-team" });
  });

  it("loads a preview before confirming withdrawal", async () => {
    const user = userEvent.setup();
    render(<SeasonParticipations season={season} />);

    await user.click(screen.getByRole("button", { name: "Retirer" }));

    expect(previewMutateAsync).toHaveBeenCalledWith({ seasonId: "season-id", teamId: "registered-team" });
    expect(screen.getByRole("heading", { name: "Retirer cette équipe de la saison ?" })).toBeInTheDocument();
    expect(screen.getByText(/2 match\(s\) planifié\(s\) seront conservé\(s\)/)).toBeInTheDocument();
  });
});
