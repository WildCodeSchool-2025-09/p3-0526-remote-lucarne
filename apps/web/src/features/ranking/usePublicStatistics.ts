import { useQuery } from "@tanstack/react-query";
import type { PublicStatisticsEditionQuery, PublicStatisticsQuery } from "@lucarne/shared";
import { getPublicLeagueStatistics, getPublicMatchEvents, getPublicPlayerStatistics, getPublicStandings, getPublicTeamStatistics } from "../../services/publicStatistics.service";
import { leagueKeys } from "../league/leagueKeys";
import { teamKeys } from "../team/teamKeys";
import { playerKeys } from "../player/playerKeys";
import { matchKeys } from "../match/matchKeys";

export const usePublicStandings = (slug: string, seasonId: string) => useQuery({ queryKey: [...leagueKeys.all, "public", "standings", slug, seasonId], queryFn: () => getPublicStandings(slug, seasonId), enabled: Boolean(slug && seasonId) });
export const usePublicLeagueStatistics = (slug: string, seasonId: string, query: PublicStatisticsQuery, enabled = true) => useQuery({ queryKey: [...leagueKeys.all, "public", "statistics", slug, seasonId, query], queryFn: () => getPublicLeagueStatistics(slug, seasonId, query), enabled: Boolean(slug && seasonId) && enabled });
export const usePublicTeamStatistics = (id: string, edition: PublicStatisticsEditionQuery) => useQuery({ queryKey: [...teamKeys.detail(id), "public", "statistics", edition], queryFn: () => getPublicTeamStatistics(id, edition), enabled: Boolean(id && edition.leagueId && edition.seasonId) });
export const usePublicPlayerStatistics = (id: string, edition: PublicStatisticsEditionQuery) => useQuery({ queryKey: [...playerKeys.detail(id), "public", "statistics", edition], queryFn: () => getPublicPlayerStatistics(id, edition), enabled: Boolean(id && edition.leagueId && edition.seasonId) });
export const usePublicMatchEvents = (id: string, enabled: boolean) => useQuery({ queryKey: [...matchKeys.publicDetail(id), "events"], queryFn: () => getPublicMatchEvents(id), enabled: enabled && Boolean(id) });
