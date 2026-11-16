import type { QueryClient } from "@tanstack/react-query";

// A league, team or edition change can affect several public resource DTOs.
export const invalidatePublicPortal = (client: QueryClient) => client.invalidateQueries({
  predicate: ({ queryKey }) => queryKey.includes("public"),
});
