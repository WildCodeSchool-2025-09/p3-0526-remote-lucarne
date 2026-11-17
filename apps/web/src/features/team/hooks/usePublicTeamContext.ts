import { useOutletContext } from "react-router";
import type { PublicTeamDetail } from "@lucarne/shared";

export const usePublicTeamContext = () => useOutletContext<PublicTeamDetail>();
