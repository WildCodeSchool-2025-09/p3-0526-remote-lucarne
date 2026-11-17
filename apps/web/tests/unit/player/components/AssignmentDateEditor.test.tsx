import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerAssignmentDateEditor } from "../../../../src/features/player/components/PlayerAssignmentDateEditor";
import { StaffAssignmentDateEditor } from "../../../../src/features/staff/components/StaffAssignmentDateEditor";

const save = vi.hoisted(() => vi.fn());
vi.mock("../../../../src/hooks/usePlayer", () => ({ useUpdatePlayerAssignment: () => ({ isPending: false, mutateAsync: save }) }));
vi.mock("../../../../src/hooks/useStaff", () => ({ useUpdateStaffAssignment: () => ({ isPending: false, mutateAsync: save }) }));

const PlayerEditor = (props: { personId: string; assignment: { id: string; joinedAt: string; leftAt: string | null }; onClose: () => void }) => <PlayerAssignmentDateEditor playerId={props.personId} assignment={props.assignment} onClose={props.onClose} />;

describe.each([PlayerEditor, StaffAssignmentDateEditor])("assignment date editing", (Editor) => {
  beforeEach(() => { save.mockReset(); });
  const assignment = { id: "assignment-id", joinedAt: "2026-01-01", leftAt: "2026-12-31" };
  it("sends an explicit null when clearing the end", async () => {
    save.mockResolvedValue({});
    const close = vi.fn();
    render(<Editor personId="person-id" assignment={assignment} onClose={close} />);
    fireEvent.change(screen.getByLabelText(/Date de fin/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les dates" }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith({ id: "person-id", assignmentId: "assignment-id", input: { joinedAt: "2026-01-01", leftAt: null } });
  });
  it("retains dates and the editor after a conflict", async () => {
    save.mockRejectedValue(new Error("Cette période chevauche une autre affectation."));
    const close = vi.fn();
    render(<Editor personId="person-id" assignment={assignment} onClose={close} />);
    fireEvent.change(screen.getByLabelText(/Date de fin/), { target: { value: "2027-01-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les dates" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("chevauche");
    expect(screen.getByLabelText(/Date de fin/)).toHaveValue("2027-01-31");
    expect(close).not.toHaveBeenCalled();
  });
});
