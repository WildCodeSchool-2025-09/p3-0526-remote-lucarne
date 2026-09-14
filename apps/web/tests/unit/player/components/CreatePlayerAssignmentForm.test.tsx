import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatePlayerAssignmentForm } from "../../../../src/features/player/components/CreatePlayerAssignmentForm";

const mutate = vi.fn();
const useCreatePlayerAssignmentMock = vi.hoisted(() => vi.fn());
const useTeamListMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/hooks/usePlayer", () => ({ useCreatePlayerAssignment: useCreatePlayerAssignmentMock }));
vi.mock("../../../../src/hooks/useTeamList", () => ({ useTeamList: useTeamListMock }));

describe("CreatePlayerAssignmentForm", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("submits a future assignment for an active team", async () => {
    const onSuccess = vi.fn();
    useCreatePlayerAssignmentMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate });
    useTeamListMock.mockReturnValue({ data: { data: [{ id: "team-id", name: "Paris FC" }] }, isPending: false, isError: false });
    render(<CreatePlayerAssignmentForm onCancel={vi.fn()} onSuccess={onSuccess} playerId="player-id" />);

    fireEvent.change(screen.getByLabelText(/Équipe/), { target: { value: "team-id" } });
    fireEvent.change(screen.getByLabelText(/Date de début/), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText("Numéro de maillot"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Planifier" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      { id: "player-id", input: { teamId: "team-id", joinedAt: "2099-01-01", shirtNumber: 8 } },
      { onSuccess },
    ));
  });

  it("requires a team and a start date", () => {
    useCreatePlayerAssignmentMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate });
    useTeamListMock.mockReturnValue({ data: { data: [] }, isPending: false, isError: false });
    render(<CreatePlayerAssignmentForm onCancel={vi.fn()} onSuccess={vi.fn()} playerId="player-id" />);

    fireEvent.click(screen.getByRole("button", { name: "Planifier" }));

    expect(screen.getByText("L’équipe et la date de début sont obligatoires.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
