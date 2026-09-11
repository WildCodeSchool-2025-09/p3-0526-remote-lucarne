import { createBrowserRouter } from "react-router";
import App from "./App";
import { CREATE_LEAGUE_ROLES, TEAM_CREATE_ROLES, VIEW_LEAGUE_ROLES } from "./auth/authRole";
import { RequireRole } from "./auth/RequireRole";
import CreateLeaguePage from "./features/league/pages/CreateLeaguePage";
import DevLoginPage from "./pages/dev/DevLoginPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import RouteErrorPage from "./pages/RouteErrorPage";
import UiDemoPage from "./pages/UiDemoPage";
import LeagueDetailPage from "./features/league/pages/LeagueDetailPage";
import LeagueListPage from "./features/league/pages/LeagueListPage";
import EditLeaguePage from "./features/league/pages/EditLeaguePage";
import CreateTeamPage from "./features/team/pages/CreateTeamPage";

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
        Component: UiDemoPage,
      },
      ...(import.meta.env.DEV
        ? [{
          path: "dev/login",
          Component: DevLoginPage,
        }]
        : []),
      {
        path: "dashboard/league",
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <LeagueListPage />
          </RequireRole>
        ),
      },
      {
        path: "dashboard/leagues",
        element: (
          <RequireRole allowedRoles={VIEW_LEAGUE_ROLES}>
            <LeagueListPage />
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
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);

export default router;
