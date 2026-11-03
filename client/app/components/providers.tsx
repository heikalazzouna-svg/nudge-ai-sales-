"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/app/components/ui/sonner";

/**
 * Root providers for the application.
 * 
 * - React Query for data fetching with optimized settings
 * - Toaster for notifications
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 30 seconds before considering it stale
            staleTime: 30 * 1000,
            // Keep unused data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus (prevents jarring updates)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (user action should trigger)
            refetchOnReconnect: false,
            // Retry failed requests once
            retry: 1,
            // Use previous data while fetching new (prevents loading flash)
            placeholderData: (prev: unknown) => prev,
          },
          mutations: {
            // Don't retry mutations (let user handle errors)
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
