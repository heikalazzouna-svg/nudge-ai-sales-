/**
 * Cookie management for Clerk ID
 * 
 * We store the Clerk ID in a cookie to allow the API client to access it
 * synchronously, avoiding auth blocking on every request.
 */

const CLERK_COOKIE_NAME = "nudge_clerk_id";

export function setClerkIdCookie(userId: string) {
  // Set cookie to expire in 7 days
  const d = new Date();
  d.setTime(d.getTime() + (7 * 24 * 60 * 60 * 1000));
  const expires = "expires=" + d.toUTCString();
  document.cookie = `${CLERK_COOKIE_NAME}=${userId};${expires};path=/;SameSite=Strict`;
}

export function getClerkIdCookie(): string | null {
  if (typeof document === "undefined") return null;
  
  const name = CLERK_COOKIE_NAME + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

export function removeClerkIdCookie() {
  document.cookie = `${CLERK_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
