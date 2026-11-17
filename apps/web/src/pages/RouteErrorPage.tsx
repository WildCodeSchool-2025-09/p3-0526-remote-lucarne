import { isRouteErrorResponse, Link, useRouteError } from "react-router";

function RouteErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message =
    isRouteErrorResponse(error) && error.statusText.length > 0
      ? error.statusText
      : "The requested page could not be loaded.";

  return (
    <main>
      <h1>{status}</h1>
      <p>{message}</p>
      <Link to="/">Return to home</Link>
    </main>
  );
}

export default RouteErrorPage;
