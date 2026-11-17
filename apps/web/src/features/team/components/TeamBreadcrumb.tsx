import DashboardBreadcrumb from "../../../components/dashboard/DashboardBreadcrumb";

function TeamBreadcrumb({
  teamId,
  teamName,
  editing = false,
  creating = false,
}: {
  teamId?: string;
  teamName?: string;
  editing?: boolean;
  creating?: boolean;
}) {
  return (
    <DashboardBreadcrumb
      resource="teams"
      resourceId={teamId}
      resourceName={teamName}
      mode={creating ? "create" : editing ? "edit" : teamId ? "detail" : "list"}
    />
  );
}

export default TeamBreadcrumb;
