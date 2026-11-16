import { Link } from "react-router";
import { publicNavigation } from "./publicRoutes";

interface PublicBreadcrumbProps {
  items: { label: string; to?: string }[];
}

function PublicBreadcrumb({ items }: PublicBreadcrumbProps) {
  return <nav aria-label="Fil d’Ariane" className="public-breadcrumb">
    <ol>
      <li><Link to={publicNavigation.home}>Accueil</Link></li>
      {items.map((item, index) => <li key={`${item.label}-${index}`}>
        {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
      </li>)}
    </ol>
  </nav>;
}

export default PublicBreadcrumb;
