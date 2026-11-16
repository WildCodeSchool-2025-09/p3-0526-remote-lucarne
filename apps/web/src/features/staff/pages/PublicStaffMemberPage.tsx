import { Link, useParams } from "react-router";
import PublicPersonProfile from "../../../components/public/PublicPersonProfile";
import PublicResourceState from "../../../components/public/PublicResourceState";
import { publicNavigation } from "../../../components/public/publicRoutes";
import { usePublicStaffMember } from "../usePublicStaffMember";

export default function PublicStaffMemberPage() {
  const { staffMemberId = "" } = useParams();
  const query = usePublicStaffMember(staffMemberId);
  return <section className="public-resource-page public-page-stack"><PublicResourceState query={query} label="Membre du staff" />
    {query.data ? <PublicPersonProfile person={query.data} /> : <Link to={publicNavigation.teams}>← Retour aux équipes</Link>}
  </section>;
}
