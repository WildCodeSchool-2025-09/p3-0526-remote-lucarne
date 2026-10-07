import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamDetailPage from "../../../../src/features/team/pages/TeamDetailPage";
import EditTeamPage from "../../../../src/features/team/pages/EditTeamPage";
import CreateTeamPage from "../../../../src/features/team/pages/CreateTeamPage";

const detail = vi.hoisted(() => vi.fn());
vi.mock("../../../../src/hooks/useTeamDetail", () => ({ useTeamDetail: detail }));
vi.mock("../../../../src/features/team/components/TeamRoster", () => ({ default: () => null }));
vi.mock("../../../../src/features/team/hooks/useTeamMutation", () => ({ useTeamMutation: () => ({ isPending: false }), useTeamDeletionPreview: () => ({}) }));
vi.mock("../../../../src/features/team/components/UpdateTeamForm", () => ({ UpdateTeamForm: ({ onCancel }: { onCancel: () => void }) => <button onClick={onCancel}>Annuler</button> }));
vi.mock("../../../../src/features/team/components/CreateTeamForm", () => ({ CreateTeamForm: () => null }));
vi.mock("../../../../src/auth/authRole", () => ({ APP_ROLES: { ADMIN: "ADMIN" }, getCurrentAppRole: () => "ADMIN", hasRole: () => true, TEAM_EDIT_ROLES: ["ADMIN"] }));

const team = { id: "team-id", name: "Paris FC", stadium: null, isActive: true };
const routes = [
  { path: "/dashboard/teams", element: <p>Liste des équipes</p> },
  { path: "/dashboard/teams/new", element: <CreateTeamPage /> },
  { path: "/dashboard/teams/:teamId", element: <TeamDetailPage /> },
  { path: "/dashboard/teams/:teamId/edit", element: <EditTeamPage /> },
  { path: "/unrelated", element: <p>Autre page</p> },
];
describe("explicit team navigation", () => {
  beforeEach(() => detail.mockReturnValue({ data: team, isPending: false, isError: false }));
  it.each([true, false])("returns from detail to the list with direct access=%s", async (direct) => {
    const router = createMemoryRouter(routes, { initialEntries: direct ? ["/dashboard/teams/team-id"] : ["/unrelated", "/dashboard/teams/team-id"], initialIndex: direct ? 0 : 1 });
    render(<RouterProvider router={router} />);
    await userEvent.click(screen.getByRole("button", { name: /Retour à la liste/ }));
    expect(router.state.location.pathname).toBe("/dashboard/teams");
  });
  it("cancels editing to detail and exposes list-detail-edit breadcrumbs", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/dashboard/teams/team-id/edit"] });
    render(<RouterProvider router={router} />);
    const breadcrumb = within(screen.getByRole("navigation", { name: "Fil d’Ariane" }));
    expect(breadcrumb.getByRole("link", { name: "Équipes" })).toHaveAttribute("href", "/dashboard/teams");
    expect(breadcrumb.getByRole("link", { name: "Paris FC" })).toHaveAttribute("href", "/dashboard/teams/team-id");
    expect(breadcrumb.getByText("Modifier")).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(router.state.location.pathname).toBe("/dashboard/teams/team-id");
  });
  it("returns from creation to the list without browser history", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/dashboard/teams/new"] });
    render(<RouterProvider router={router} />);
    await userEvent.click(screen.getByRole("button", { name: /Retour/ }));
    expect(router.state.location.pathname).toBe("/dashboard/teams");
  });
  it("keeps an explicit list destination when loading fails", () => {
    detail.mockReturnValue({ isError: true, isPending: false, refetch: vi.fn() });
    const router = createMemoryRouter(routes, { initialEntries: ["/dashboard/teams/team-id"] });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("link", { name: "Retour à la liste" })).toHaveAttribute("href", "/dashboard/teams");
  });
});
