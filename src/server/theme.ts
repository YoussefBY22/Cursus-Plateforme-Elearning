import { cookies } from "next/headers";

export const THEMES = ["clair", "sombre", "systeme"] as const;
export type Theme = (typeof THEMES)[number];
export const COOKIE_THEME = "cursus-theme";

export function estTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}

/**
 * Thème résolu côté serveur : l'attribut `data-theme` est posé dès le premier
 * octet de HTML, donc pas de flash clair → sombre au chargement.
 */
export async function resoudreTheme(): Promise<Theme> {
  const choix = (await cookies()).get(COOKIE_THEME)?.value;
  return estTheme(choix) ? choix : "systeme";
}
