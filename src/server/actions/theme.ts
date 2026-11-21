"use server";

import { cookies } from "next/headers";
import { COOKIE_THEME, estTheme } from "@/server/theme";
import { signOut } from "@/server/auth";

export async function changerTheme(theme: string) {
  if (!estTheme(theme)) return;
  (await cookies()).set(COOKIE_THEME, theme, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
}

export async function deconnexion() {
  await signOut({ redirectTo: "/connexion" });
}
