import type { StaffMemberDetail } from "@lucarne/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffMemberDetailPage from "../../../../src/features/staff/pages/StaffMemberDetailPage";

const useStaffMemberDetailMock = vi.hoisted(() => vi.fn());
const useActivateStaffMemberMock = vi.hoisted(() => vi.fn());
const useDeactivateStaffMemberMock = vi.hoisted(() => vi.fn());
const useDeleteStaffMemberMock = vi.hoisted(() => vi.fn());
const getCurrentAppRoleMock = vi.hoisted(() => vi.fn());
const hasRoleMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/hooks/useStaff", () => ({
  useActivateStaffMember: useActivateStaffMemberMock,
  useDeactivateStaffMember: useDeactivateStaffMemberMock,
  useDeleteStaffMember: useDeleteStaffMemberMock,
  useStaffMemberDetail: useStaffMemberDetailMock,
}));
vi.mock("../../../../src/auth/authRole", () => ({ APP_ROLES: { ADMIN: "ADMIN", EDITOR: "EDITOR", MODERATOR: "MODERATOR" }, getCurrentAppRole: getCurrentAppRoleMock, hasRole: hasRoleMock }));

const staffMember: StaffMemberDetail = { activeTeam: null, assignments: [], createdAt: "2026-09-14T10:00:00.000Z", firstName: "Camille", id: "staff-id", isActive: true, isSelectable: false, lastName: "Durand", nationality: "France", pictureUrl: null, version: 0 };
const mutation = () => ({ error: null, isError: false, isPending: false, mutateAsync: vi.fn(), reset: vi.fn() });

describe("StaffMemberDetailPage confirmations", () => {
  beforeEach(() => { vi.clearAllMocks(); getCurrentAppRoleMock.mockReturnValue("ADMIN"); hasRoleMock.mockReturnValue(true); useStaffMemberDetailMock.mockReturnValue({ data: staffMember, isError: false, isPending: false }); useActivateStaffMemberMock.mockReturnValue(mutation()); useDeactivateStaffMemberMock.mockReturnValue(mutation()); useDeleteStaffMemberMock.mockReturnValue(mutation()); });

  it("explains that deactivation retains planned assignments and history", async () => {
    const user = userEvent.setup(); render(<MemoryRouter><StaffMemberDetailPage /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Désactiver" }));
    expect(screen.getByRole("heading", { name: "Désactiver ce membre du staff ?" })).toBeInTheDocument();
    expect(screen.getByText("L’affectation courante sera clôturée. Les affectations planifiées et l’historique seront conservés.")).toBeInTheDocument();
  });
});
