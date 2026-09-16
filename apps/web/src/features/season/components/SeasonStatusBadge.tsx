import type { SeasonStatus } from "@lucarne/shared";
import { StatusBadge } from "../../../ui";

function SeasonStatusBadge({ status }: { status: SeasonStatus }) {
  return <StatusBadge variant={status === "CURRENT" ? "active" : "inactive"}>{status === "CURRENT" ? "Courante" : "Inactive"}</StatusBadge>;
}

export default SeasonStatusBadge;
