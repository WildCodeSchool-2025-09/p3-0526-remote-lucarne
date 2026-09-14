import type { LeagueStatus } from "@lucarne/shared";
import { StatusBadge } from "../../../ui";

interface LeagueStatusBadgeProps {
  status: LeagueStatus;
}

function LeagueStatusBadge({ status }: LeagueStatusBadgeProps) {
  return <StatusBadge variant={status === "ACTIVE" ? "active" : "inactive"}>{status === "ACTIVE" ? "Active" : "Inactive"}</StatusBadge>;
}

export default LeagueStatusBadge;
