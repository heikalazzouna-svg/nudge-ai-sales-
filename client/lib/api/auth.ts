/**
 * Clerk Authentication Helper
 * 
 * Provides utility functions to get the current user's Clerk ID
 * for API authentication.
 */

import { useAuth, useUser } from "@clerk/nextjs";

// Store the clerk instance globally for async access
let clerkInstance: { user?: { id: string } } | null = null;

/**
 * Set the Clerk instance for global access
 */
export function setClerkInstance(clerk: { user?: { id: string } } | null) {
  clerkInstance = clerk;
}

/**
 * Get the current Clerk user ID for API requests.
 * This should be called from client components.
 * 
 * Note: Returns immediately. Callers should use React Query's `enabled` 
 * option to wait for authentication before making requests.
 */
export async function getClerkToken(): Promise<string | null> {
  // Try to get from stored instance first
  if (clerkInstance?.user?.id) {
    return clerkInstance.user.id;
  }
  
  // Try to access Clerk from window
  if (typeof window !== "undefined") {
    const windowClerk = (window as unknown as { Clerk?: { user?: { id: string } } }).Clerk;
    if (windowClerk?.user?.id) {
      return windowClerk.user.id;
    }
  }
  
  return null;
}

/**
 * Hook to get Clerk user ID for API calls.
 * Use this in React components.
 */
export function useClerkId(): string | null {
  const { userId } = useAuth();
  
  // Store the user ID for async access
  if (userId && typeof window !== "undefined") {
    const clerk = (window as unknown as { Clerk?: { user?: { id: string } } }).Clerk;
    if (clerk) {
      setClerkInstance(clerk);
    }
  }
  
  return userId ?? null;
}

/**
 * Hook to get full user info for API calls and display.
 */
export function useCurrentUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { userId } = useAuth();

  return {
    userId,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    name: user?.fullName ?? user?.firstName ?? null,
    imageUrl: user?.imageUrl ?? null,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
  };
}
