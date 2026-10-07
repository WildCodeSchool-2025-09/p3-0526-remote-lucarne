import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import App from "./App";
import {
  CREATE_LEAGUE_ROLES,
  MATCH_VIEW_ROLES,
  MATCH_WRITE_ROLES,
  DASHBOARD_ROLES,
  TEAM_CREATE_ROLES,
  TEAM_EDIT_ROLES,
  PLAYER_WRITE_ROLES,
  SEASON_CREATE_ROLES,
  SEASON_MANAGE_ROLES,
  SEASON_VIEW_ROLES,
  VIEW_LEAGUE_ROLES,
} from "./auth/authRole";
import { RequireRole } from "./auth/RequireRole";
import EditLeaguePage from "./features/league/pages/EditLeaguePage";
import CreateLeaguePage from "./features/league/pages/CreateLeaguePage";
import LeagueDetailPage from "./features/league/pages/LeagueDetailPage";
import LeagueListPage from "./features/league/pages/LeagueListPage";
import DashboardRouteLayout from "./components/dashboard/DashboardRouteLayout";
import DashboardNotFoundPage from "./components/dashboard/DashboardNotFoundPage";
import DashboardRouteErrorPage from "./components/dashboard/DashboardRouteErrorPage";
import DashboardPage from "./features/dashboard/pages/DashboardPage";
import CreatePlayerPage from "./features/player/pages/CreatePlayerPage";
import EditPlayerPage from "./features/player/pages/EditPlayerPage";
import PlayerDetailPage from "./features/player/pages/PlayerDetailPage";
import PlayerListPage from "./features/player/pages/PlayerListPage";
import CreateStaffMemberPage from "./features/staff/pages/CreateStaffMemberPage";
import EditStaffMemberPage from "./features/staff/pages/EditStaffMemberPage";
import StaffMemberDetailPage from "./features/staff/pages/StaffMemberDetailPage";
import StaffMemberListPage from "./features/staff/pages/StaffMemberListPage";
import SeasonListPage from "./features/season/pages/SeasonListPage";
import SeasonDetailPage from "./features/season/pages/SeasonDetailPage";
import CreateSeasonPage from "./features/season/pages/CreateSeasonPage";
import EditSeasonPage from "./features/season/pages/EditSeasonPage";
import CreateTeamPage from "./features/team/pages/CreateTeamPage";
import EditTeamPage from "./features/team/pages/EditTeamPage";
import TeamDetailPage from "./features/team/pages/TeamDetailPage";
import TeamListPage from "./features/team/pages/TeamListPage";
import DevLoginPage from "./pages/dev/DevLoginPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import RouteErrorPage from "./pages/RouteErrorPage";
import BugReportPage from "./features/bug-report/pages/BugReportPage";
import MatchListPage from "./features/match/pages/MatchListPage";
import MatchDetailPage from "./features/match/pages/MatchDetailPage";
import CreateMatchPage from "./features/match/pages/CreateMatchPage";
import EditMatchPage from "./features/match/pages/EditMatchPage";
import PublicMatchListPage from "./features/match/pages/PublicMatchListPage";
import PublicMatchDetailPage from "./features/match/pages/PublicMatchDetailPage";

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
      { path: "matches", Component: PublicMatchListPage },
      { path: "matches/:matchPublicId", Component: PublicMatchDetailPage },
      ...(import.meta.env.DEV
        ? [
          {
            path: "dev/login",
            Component: DevLoginPage,
          },
          {
            path: "bug",
            Component: BugReportPage,
          },
        ]
        : []),
      {
        path: "dashboard",
        handle: { usesDashboardLayout: true },
        Component: DashboardRouteLayout,
        children: [{
          ErrorBoundary: DashboardRouteErrorPage,
          children: [
            {
              index: true,
              element: (
                <RequireRole allowedRoles={DASHBOARD_ROLES}>
                  <DashboardPage />
                </RequireRole>
              ),
            },
            {
              path: "leagues",
              handle: { dashboardResource: "leagues" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <LeagueListPage />
                </RequireRole>
              ),
            },
            {
              path: "matches",
              handle: { dashboardResource: "matches" },
              element: <RequireRole allowedRoles={MATCH_VIEW_ROLES}>
                <MatchListPage /></RequireRole>,
            },
            {
              path: "matches/new",
              handle: { dashboardResource: "matches" },
              element: <RequireRole allowedRoles={MATCH_WRITE_ROLES}><CreateMatchPage /></RequireRole>,
            },
            {
              path: "matches/:matchId",
              handle: { dashboardResource: "matches" },
              element: <RequireRole allowedRoles={MATCH_VIEW_ROLES}><MatchDetailPage /></RequireRole>,
            },
            {
              path: "matches/:matchId/edit",
              handle: { dashboardResource: "matches" },
              element: <RequireRole allowedRoles={MATCH_WRITE_ROLES}><EditMatchPage /></RequireRole>,
            },
            {
              path: "leagues/:leagueId",
              handle: { dashboardResource: "leagues" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <LeagueDetailPage />
                </RequireRole>
              ),
            },
            {
              path: "leagues/:leagueId/edit",
              handle: { dashboardResource: "leagues" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <EditLeaguePage />
                </RequireRole>
              ),
            },
            {
              path: "leagues/new",
              handle: { dashboardResource: "leagues" },
              element: (
                <RequireRole allowedRoles={CREATE_LEAGUE_ROLES}>
                  <CreateLeaguePage />
                </RequireRole>
              ),
            },
            {
              path: "seasons",
              handle: { dashboardResource: "seasons" },
              element: (
                <RequireRole allowedRoles={SEASON_VIEW_ROLES}>
                  <SeasonListPage />
                </RequireRole>
              ),
            },
            {
              path: "seasons/new",
              handle: { dashboardResource: "seasons" },
              element: (
                <RequireRole allowedRoles={SEASON_CREATE_ROLES}>
                  <CreateSeasonPage />
                </RequireRole>
              ),
            },
            {
              path: "seasons/:seasonId",
              handle: { dashboardResource: "seasons" },
              element: (
                <RequireRole allowedRoles={SEASON_VIEW_ROLES}>
                  <SeasonDetailPage />
                </RequireRole>
              ),
            },
            {
              path: "seasons/:seasonId/edit",
              handle: { dashboardResource: "seasons" },
              element: (
                <RequireRole allowedRoles={SEASON_MANAGE_ROLES}>
                  <EditSeasonPage />
                </RequireRole>
              ),
            },
            {
              path: "teams/new",
              handle: { dashboardResource: "teams" },
              element: (
                <RequireRole allowedRoles={TEAM_CREATE_ROLES}>
                  <CreateTeamPage />
                </RequireRole>
              ),
            },
            {
              path: "teams",
              handle: { dashboardResource: "teams" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <TeamListPage />
                </RequireRole>
              ),
            },
            {
              path: "teams/:teamId",
              handle: { dashboardResource: "teams" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <TeamDetailPage />
                </RequireRole>
              ),
            },
            {
              path: "teams/:teamId/edit",
              handle: { dashboardResource: "teams" },
              element: (
                <RequireRole allowedRoles={TEAM_EDIT_ROLES}>
                  <EditTeamPage />
                </RequireRole>
              ),
            },
            {
              path: "players",
              handle: { dashboardResource: "players" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <PlayerListPage />
                </RequireRole>
              ),
            },
            {
              path: "players/new",
              handle: { dashboardResource: "players" },
              element: (
                <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
                  <CreatePlayerPage />
                </RequireRole>
              ),
            },
            {
              path: "players/:playerId",
              handle: { dashboardResource: "players" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <PlayerDetailPage />
                </RequireRole>
              ),
            },
            {
              path: "players/:playerId/edit",
              handle: { dashboardResource: "players" },
              element: (
                <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
                  <EditPlayerPage />
                </RequireRole>
              ),
            },
            {
              path: "staff-members",
              handle: { dashboardResource: "staff" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <StaffMemberListPage />
                </RequireRole>
              ),
            },
            {
              path: "staff-members/new",
              handle: { dashboardResource: "staff" },
              element: (
                <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
                  <CreateStaffMemberPage />
                </RequireRole>
              ),
            },
            {
              path: "staff-members/:staffMemberId",
              handle: { dashboardResource: "staff" },
              element: (
                <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
                  <StaffMemberDetailPage />
                </RequireRole>
              ),
            },
            {
              path: "staff-members/:staffMemberId/edit",
              handle: { dashboardResource: "staff" },
              element: (
                <RequireRole allowedRoles={PLAYER_WRITE_ROLES}>
                  <EditStaffMemberPage />
                </RequireRole>
              ),
            },
            { path: "*", Component: DashboardNotFoundPage },
          ],
        }],
      },
      {
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);

export default router;
