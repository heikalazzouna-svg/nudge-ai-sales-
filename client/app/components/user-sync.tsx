"use client";

import { useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { userApi } from "@/lib/api/client";

/**
 * UserSync Component
 * 
 * Automatically syncs the Clerk user to the backend database.
 * Called once when the user signs in to ensure they have a record in our DB.
 */
export function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { userId } = useAuth();
  const syncAttempted = useRef(false);

  useEffect(() => {
    async function syncUser() {
      // Only sync once per session
      if (syncAttempted.current) return;
      if (!isLoaded || !isSignedIn || !user || !userId) return;

      syncAttempted.current = true;

      try {
        // Try to get existing user first
        await userApi.get(userId);
        console.log("✅ User already exists in backend");
      } catch (error: unknown) {
        // If user doesn't exist (404), create them
        const apiError = error as { statusCode?: number };
        if (apiError.statusCode === 404) {
          try {
            await userApi.create({
              id: userId,
              email: user.primaryEmailAddress?.emailAddress || "",
              name: user.fullName || user.firstName || "User",
            });
            console.log("✅ User created in backend");
          } catch (createError) {
            console.error("Failed to create user in backend:", createError);
            // Reset so we can retry
            syncAttempted.current = false;
          }
        } else {
          console.error("Failed to check user:", error);
          // Reset so we can retry
          syncAttempted.current = false;
        }
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, user, userId]);

  // This component doesn't render anything
  return null;
}
