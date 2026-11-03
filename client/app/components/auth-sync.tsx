"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setClerkIdCookie, removeClerkIdCookie } from "@/lib/cookie";

export function AuthSync() {
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      if (userId) {
        setClerkIdCookie(userId);
      } else {
        removeClerkIdCookie();
      }
    }
  }, [userId, isLoaded]);

  return null;
}
