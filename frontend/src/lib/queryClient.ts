import { QueryClient } from "@tanstack/react-query"

/** Cached instantly on nav; background refresh after stale window for eventual consistency. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})
