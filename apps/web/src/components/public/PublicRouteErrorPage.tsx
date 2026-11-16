import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { publicNavigation } from "./publicRoutes";
import { publicStyles } from "./publicStyles";

function PublicRouteErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;

  return (
    <section className={publicStyles.page} aria-labelledby="public-error-title">
      <h1 id="public-error-title">{status === 404 ? "Page introuvable" : "Impossible de charger cette page"}</h1>
      <p>Vous pouvez revenir à l’accueil pour poursuivre votre navigation.</p>
      <Link className="lucarne-button lucarne-button--outline" to={publicNavigation.home}>Retour à l’accueil</Link>
    </section>
  );
}

export default PublicRouteErrorPage;
