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
    useTeamListMock.mockReturnValue({ data: { data: [{ id: "123e4567-e89b-42d3-a456-426614174000", name: "Paris FC" }] }, isPending: false, isError: false });
    render(<CreatePlayerAssignmentForm onCancel={vi.fn()} onSuccess={onSuccess} playerId="player-id" />);

    fireEvent.change(screen.getByLabelText(/Équipe/), { target: { value: "123e4567-e89b-42d3-a456-426614174000" } });
    fireEvent.change(screen.getByLabelText(/Date de début/), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText("Numéro de maillot"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      { id: "player-id", input: { teamId: "123e4567-e89b-42d3-a456-426614174000", joinedAt: "2099-01-01", shirtNumber: 8 } },
      { onSuccess },
    ));
  });

  it("requires a team and a start date", () => {
    useCreatePlayerAssignmentMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate });
    useTeamListMock.mockReturnValue({ data: { data: [] }, isPending: false, isError: false });
    render(<CreatePlayerAssignmentForm onCancel={vi.fn()} onSuccess={vi.fn()} playerId="player-id" />);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("accepts historical dates without a min and refuses identical end dates", () => {
    useCreatePlayerAssignmentMock.mockReturnValue({ error: null, isError: false, isPending: false, mutate });
    const teamId = "123e4567-e89b-42d3-a456-426614174000";
    useTeamListMock.mockReturnValue({ data: { data: [{ id: teamId, name: "Paris FC", isActive: false }] }, isPending: false, isError: false });
    render(<CreatePlayerAssignmentForm onCancel={vi.fn()} onSuccess={vi.fn()} playerId="player-id" />);
    const start = screen.getByLabelText(/Date de début/);
    expect(start).not.toHaveAttribute("min");
    fireEvent.change(screen.getByLabelText(/Équipe/), { target: { value: teamId } });
    fireEvent.change(start, { target: { value: "2025-01-01" } });
    fireEvent.change(screen.getByLabelText(/Date de fin/), { target: { value: "2025-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("postérieure");
    fireEvent.change(screen.getByLabelText(/Date de fin/), { target: { value: "2025-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(mutate).toHaveBeenCalledWith({ id: "player-id", input: { teamId, joinedAt: "2025-01-01", leftAt: "2025-12-31", shirtNumber: null } }, expect.any(Object));
  });
});
