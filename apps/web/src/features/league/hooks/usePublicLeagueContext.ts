import type { PublicLeagueDetail } from "@lucarne/shared";
import { useOutletContext } from "react-router";

interface PublicLeagueContext {
  league: PublicLeagueDetail;
  seasonId: string;
}

function usePublicLeagueContext() {
  return useOutletContext<PublicLeagueContext>();
}

export { usePublicLeagueContext };
export type { PublicLeagueContext };
