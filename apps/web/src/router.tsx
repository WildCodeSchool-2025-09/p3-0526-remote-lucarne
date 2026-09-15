import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import App from "./App";
import {
  CREATE_LEAGUE_ROLES,
  TEAM_CREATE_ROLES,
  TEAM_EDIT_ROLES,
  PLAYER_WRITE_ROLES,
  VIEW_LEAGUE_ROLES,
} from "./auth/authRole";
import { RequireRole } from "./auth/RequireRole";
import EditLeaguePage from "./features/league/pages/EditLeaguePage";
import CreateLeaguePage from "./features/league/pages/CreateLeaguePage";
import LeagueDetailPage from "./features/league/pages/LeagueDetailPage";
import LeagueListPage from "./features/league/pages/LeagueListPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import CreatePlayerPage from "./features/player/pages/CreatePlayerPage";
import EditPlayerPage from "./features/player/pages/EditPlayerPage";
import PlayerDetailPage from "./features/player/pages/PlayerDetailPage";
import PlayerListPage from "./features/player/pages/PlayerListPage";
import CreateStaffMemberPage from "./features/staff/pages/CreateStaffMemberPage";
import EditStaffMemberPage from "./features/staff/pages/EditStaffMemberPage";
import StaffMemberDetailPage from "./features/staff/pages/StaffMemberDetailPage";
import StaffMemberListPage from "./features/staff/pages/StaffMemberListPage";
import CreateTeamPage from "./features/team/pages/CreateTeamPage";
import EditTeamPage from "./features/team/pages/EditTeamPage";
import TeamDetailPage from "./features/team/pages/TeamDetailPage";
import TeamListPage from "./features/team/pages/TeamListPage";
import DevLoginPage from "./pages/dev/DevLoginPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import RouteErrorPage from "./pages/RouteErrorPage";

const UiDemoPage = lazy(() => import("./pages/UiDemoPage"));
const loadingPage = <p role="status">Chargement…</p>;

const router = createBrowserRouter([
  {
    Component: App,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: "ui-demo",
        element: <Suspense fallback={loadingPage}><UiDemoPage /></Suspense>,
      },
      ...(import.meta.env.DEV
        ? [
          {
            path: "dev/login",
            Component: DevLoginPage,
          },
        ]
        : []),
      {
        path: "dashboard/leagues",
        handle: { usesDashboardListLayout: true },
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <DashboardLayout activeItem="leagues">
              <LeagueListPage />
            </DashboardLayout>
          </RequireRole>
        ),
      },
      {
        path: "dashboard/leagues/:leagueId",
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <LeagueDetailPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/leagues/:leagueId/edit",
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <EditLeaguePage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/leagues/new",
        element: (
          <RequireRole allowedRoles={CREATE_LEAGUE_ROLES}>
            <CreateLeaguePage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/teams/new",
        element: (
          <RequireRole allowedRoles={TEAM_CREATE_ROLES}>
            <CreateTeamPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/teams",
        handle: { usesDashboardListLayout: true },
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <DashboardLayout activeItem="teams">
              <TeamListPage />
            </DashboardLayout>
          </RequireRole>
        ),
      },
      {
        path: "dashboard/teams/:teamId",
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <TeamDetailPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/teams/:teamId/edit",
        element: (
          <RequireRole allowedRoles={TEAM_EDIT_ROLES}>
            <EditTeamPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/players",
        handle: { usesDashboardListLayout: true },
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <DashboardLayout activeItem="players">
              <PlayerListPage />
            </DashboardLayout>
          </RequireRole>
        ),
      },
      {
        path: "dashboard/players/new",
        element: (
          <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
            <CreatePlayerPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/players/:playerId",
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <PlayerDetailPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/players/:playerId/edit",
        element: (
          <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
            <EditPlayerPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/staff-members",
        handle: { usesDashboardListLayout: true },
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <DashboardLayout activeItem="staff">
              <StaffMemberListPage />
            </DashboardLayout>
          </RequireRole>
        ),
      },
      {
        path: "dashboard/staff-members/new",
        element: (
          <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
            <CreateStaffMemberPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/staff-members/:staffMemberId",
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <StaffMemberDetailPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/staff-members/:staffMemberId/edit",
        element: (
          <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
            <EditStaffMemberPage />
          </RequireRole>
        ),
      },
      {
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);

export default router;
