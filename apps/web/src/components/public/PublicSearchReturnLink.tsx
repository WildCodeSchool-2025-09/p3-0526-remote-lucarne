import { Link, useSearchParams } from "react-router";
import { publicSearchReturnPath } from "../../features/search/publicSearchNavigation";

export default function PublicSearchReturnLink() {
  const [search] = useSearchParams();
  const destination = publicSearchReturnPath(search.get("searchReturnTo"));
  return destination ? <div className="public-search-return"><Link to={destination}>← Retour aux résultats de recherche</Link></div> : null;
}
