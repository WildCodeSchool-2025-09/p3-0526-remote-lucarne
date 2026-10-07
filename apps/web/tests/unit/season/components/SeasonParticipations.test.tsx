import type { LeagueSeasonDetail } from "@lucarne/shared";
import { render, screen, within } from "@testing-library/react";
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

const season: LeagueSeasonDetail = {
  id: "season-id",
  leagueId: "league-id",
  seasonId: "global-season-id",
  isCurrent: false,
  matchdayCount: null,
  matchesPerMatchday: null,
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
  const previewMutateAsync = vi.fn().mockResolvedValue({ teamId: "registered-team", leagueSeasonId: "season-id", scheduledMatchCount: 2 });
  const withdrawMutateAsync = vi.fn().mockResolvedValue({ participation: { ...season.participatingTeams[0], status: "WITHDRAWN" }, scheduledMatchCount: 2 });

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentAppRoleMock.mockReturnValue("EDITOR");
    hasRoleMock.mockReturnValue(true);
    useTeamListMock.mockReturnValue({ data: { data: [{ id: "new-team", name: "Lyon FC" }], pagination: {} }, isPending: false });
    useCreateParticipationMock.mockReturnValue({ isPending: false, mutateAsync: createMutateAsync });
    usePreviewMock.mockReturnValue({ data: { teamId: "registered-team", leagueSeasonId: "season-id", scheduledMatchCount: 2 }, isPending: false, mutateAsync: previewMutateAsync });
    useWithdrawMock.mockReturnValue({ isPending: false, mutateAsync: withdrawMutateAsync });
  });

  it("registers an available active team", async () => {
    const user = userEvent.setup();
    render(<SeasonParticipations season={season} seasonName="2030-2031" />);

    await user.selectOptions(screen.getByLabelText("Inscrire une équipe"), "new-team");
    await user.click(screen.getByRole("button", { name: "Inscrire" }));

    expect(createMutateAsync).toHaveBeenCalledWith({ teamId: "new-team" });
  });

  it("loads a preview before confirming withdrawal", async () => {
    const user = userEvent.setup();
    render(<SeasonParticipations season={season} seasonName="2030-2031" />);

    await user.click(screen.getByRole("button", { name: "Retirer" }));

    expect(previewMutateAsync).toHaveBeenCalledWith({ leagueSeasonId: "season-id", teamId: "registered-team" });
    expect(screen.getByRole("heading", { name: "Retirer cette équipe de la saison ?" })).toBeInTheDocument();
    expect(screen.getByText(/2 match\(s\) planifié\(s\) seront conservé\(s\)/)).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("La participation de « Paris FC » à la ligue « Ligue 1 » pour la saison « 2030-2031 » sera retirée.");
    expect(dialog).toHaveTextContent("L’équipe reste dans le répertoire.");
    expect(dialog).toHaveTextContent("Ses matchs, leurs résultats et l’historique de participation seront conservés.");
    expect(withdrawMutateAsync).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Retirer l’équipe" }));
    expect(withdrawMutateAsync).toHaveBeenCalledWith({ leagueSeasonId: "season-id", teamId: "registered-team" });
  });

  it("allows cancelling without withdrawing the participation", async () => {
    const user = userEvent.setup();
    render(<SeasonParticipations season={season} seasonName="2030-2031" />);
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(withdrawMutateAsync).not.toHaveBeenCalled();
  });

  it("keeps the context and confirmation visible after a withdrawal refusal", async () => {
    withdrawMutateAsync.mockRejectedValueOnce(new Error("Retrait refusé."));
    const user = userEvent.setup();
    render(<SeasonParticipations season={season} seasonName="2030-2031" />);
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retirer l’équipe" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Retrait refusé.");
    expect(dialog).toHaveTextContent("Ligue 1");
    expect(dialog).toHaveTextContent("2030-2031");
  });

  it("does not offer confirmation when the preview cannot be loaded", async () => {
    previewMutateAsync.mockRejectedValueOnce(new Error("Prévisualisation indisponible."));
    const user = userEvent.setup();
    render(<SeasonParticipations season={season} seasonName="2030-2031" />);
    await user.click(screen.getByRole("button", { name: "Retirer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Prévisualisation indisponible.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(withdrawMutateAsync).not.toHaveBeenCalled();
  });
});
