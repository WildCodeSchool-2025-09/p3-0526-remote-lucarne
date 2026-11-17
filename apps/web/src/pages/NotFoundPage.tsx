import { Link } from "react-router";
import { publicNavigation } from "../components/public/publicRoutes";
import { publicStyles } from "../components/public/publicStyles";

function NotFoundPage() {
  return (
    <section className={publicStyles.page}>
      <h1>Page introuvable</h1>
      <Link className="lucarne-button lucarne-button--outline" to={publicNavigation.home}>Retour à l’accueil</Link>
    </section>
  );
}

export default NotFoundPage;
