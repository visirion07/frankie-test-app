import { useSyncExternalStore } from "react";
import { findUser, readCookie, SESSION_COOKIE, type DemoUser } from "../shared/users";

// A deliberately simple session: a cookie with the demo user's id. The mocks
// and the token endpoint both read it, like a real app's session cookie.
const SESSION_CHANGED = "acme:session-changed";

export function currentUser(): DemoUser | undefined {
  return findUser(readCookie(document.cookie, SESSION_COOKIE));
}

export function signIn(userId: string): void {
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(userId)}; Path=/; SameSite=Lax; Max-Age=2592000`;
  window.dispatchEvent(new Event(SESSION_CHANGED));
}

export function signOut(): void {
  document.cookie = `${SESSION_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
  window.dispatchEvent(new Event(SESSION_CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener(SESSION_CHANGED, onChange);
  return () => window.removeEventListener(SESSION_CHANGED, onChange);
}

export function useCurrentUser(): DemoUser | undefined {
  return useSyncExternalStore(subscribe, currentUser);
}
