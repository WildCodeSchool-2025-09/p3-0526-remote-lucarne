import type { Team, TeamDeletionPreview } from "@lucarne/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamDetailPage from "../../../../src/features/team/pages/TeamDetailPage";

const useTeamDetailMock = vi.hoisted(() => vi.fn());
const useTeamDeletionPreviewMock = vi.hoisted(() => vi.fn());
const useTeamMutationMock = vi.hoisted(() => vi.fn());
const getCurrentAppRoleMock = vi.hoisted(() => vi.fn());
const hasRoleMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/hooks/useTeamDetail", () => ({ useTeamDetail: useTeamDetailMock, useTeamRoster: () => ({ isPending: false, isError: false, data: { date: "2026-10-05", players: [], staffMembers: [] } }) }));
vi.mock("../../../../src/features/team/hooks/useTeamMutation", () => ({ useTeamDeletionPreview: useTeamDeletionPreviewMock, useTeamMutation: useTeamMutationMock }));
vi.mock("../../../../src/auth/authRole", () => ({ APP_ROLES: { ADMIN: "ADMIN" }, getCurrentAppRole: getCurrentAppRoleMock, hasRole: hasRoleMock, TEAM_EDIT_ROLES: ["ADMIN"] }));

const team: Team = { id: "team-id", name: "Paris FC", logoUrl: null, stadium: null, isActive: true, createdAt: "2026-09-14T10:00:00.000Z" };
const preview: TeamDeletionPreview = { canDelete: false, dependencies: { participations: 1, playerAssignments: 2, staffAssignments: 1, homeMatches: 0, awayMatches: 0 } };
const mutateAsync = vi.fn();
const mutation = () => ({ error: null, isError: false, isPending: false, mutateAsync, reset: vi.fn() });

describe("TeamDetailPage deletion preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentAppRoleMock.mockReturnValue("ADMIN");
    hasRoleMock.mockReturnValue(true);
    useTeamDetailMock.mockReturnValue({ data: team, isError: false, isPending: false });
    useTeamDeletionPreviewMock.mockReturnValue({ data: preview, isError: false, isPending: false });
    useTeamMutationMock.mockReturnValue(mutation());
  });

  it("explains protected dependencies before a permanent deletion", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TeamDetailPage /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByRole("heading", { name: "Supprimer définitivement l’équipe ?" })).toBeInTheDocument();
    expect(screen.getByText("Suppression impossible : 1 participation(s), 2 affectation(s) de joueuse, 1 affectation(s) de staff. L’historique est conservé.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
