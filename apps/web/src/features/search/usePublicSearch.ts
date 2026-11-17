import { useQuery } from "@tanstack/react-query";
import type { PublicSearchQuery } from "@lucarne/shared";
import { searchPublicResources } from "../../services/publicSearch.service";

export const usePublicSearch = (query: PublicSearchQuery, enabled: boolean) => useQuery({ queryKey: ["public", "search", query], queryFn: () => searchPublicResources(query), enabled: enabled && query.q.length >= 2 });
