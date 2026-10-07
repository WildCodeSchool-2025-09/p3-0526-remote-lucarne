import { MutationCache, QueryClient } from "@tanstack/react-query";
import { assertSessionRevision, getSessionRevision } from "./sessionRevision";

const mutationSessions = new WeakMap<object, number>();

const mutationCache = new MutationCache({
  onMutate: (_variables, mutation) => {
    mutationSessions.set(mutation, getSessionRevision());
  },
  onSuccess: (_data, _variables, _context, mutation) => {
    assertSessionRevision(mutationSessions.get(mutation) ?? getSessionRevision());
  },
  onSettled: (_data, error, _variables, _context, mutation) => {
    // An invalidation in a hook's onSuccess can outlive the session too.
    // Reject before per-call success callbacks; do not throw on the error path.
    if (error == null) assertSessionRevision(mutationSessions.get(mutation) ?? getSessionRevision());
  },
});

const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default queryClient;
