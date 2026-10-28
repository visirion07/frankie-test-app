// Literal env reads, so Vite inlines them. An unset key leaves that agent off.
export const productKey = import.meta.env.VITE_FRANKIE_KEY || undefined;
export const supportKey = import.meta.env.VITE_FRANKIE_KEY_SUPPORT || undefined;
export const docsKey = import.meta.env.VITE_FRANKIE_KEY_DOCS || undefined;

export async function getUserToken(): Promise<string | undefined> {
  const res = await fetch("/api/frankie/token", { method: "POST" });
  if (res.status === 401) return undefined; // nobody is signed in
  if (!res.ok) throw new Error("Frankie token endpoint returned " + res.status);
  return (await res.json()).token;
}
