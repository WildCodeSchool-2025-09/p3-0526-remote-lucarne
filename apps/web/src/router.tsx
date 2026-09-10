import { createBrowserRouter } from "react-router";
import App from "./App";
import { CREATE_LEAGUE_ROLES } from "./auth/authRole";
import { RequireRole } from "./auth/RequireRole";
import CreateLeaguePage from "./features/league/pages/CreateLeaguePage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import RouteErrorPage from "./pages/RouteErrorPage";
import UiDemoPage from "./pages/UiDemoPage";

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
      {
        path: "dashboard/leagues/new",
        element: (
          <RequireRole allowedRoles={CREATE_LEAGUE_ROLES}>
            <CreateLeaguePage />
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
