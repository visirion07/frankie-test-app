// Demo accounts, shared by the browser (sign-in screen, mocks) and the
// server (token endpoint). The session is just this cookie holding a user id.

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: "free" | "pro" | "enterprise";
}

export const SESSION_COOKIE = "acme_session";

export const DEMO_USERS: DemoUser[] = [
  { id: "usr_jorge", name: "Jorge Alvarez", email: "jorge@example.com", company: "Alvarez Coffee", plan: "pro" },
  { id: "usr_priya", name: "Priya Nair", email: "priya@example.com", company: "Nair Studio", plan: "enterprise" },
  { id: "usr_sam", name: "Sam Lee", email: "sam@example.com", company: "Lee & Co", plan: "free" },
];

export function findUser(id: string | null | undefined): DemoUser | undefined {
  return DEMO_USERS.find((user) => user.id === id);
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
