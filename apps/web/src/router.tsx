import { createBrowserRouter } from "react-router";
import App from "./App";
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
        Component: CreateLeaguePage,
      },
      {
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);

export default router;
