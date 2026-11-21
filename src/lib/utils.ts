import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** « Élise Ben Salah » → « ÉB ». */
export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

/** Titre → slug d'URL, sans accents. */
export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function nomComplet(u: { prenom: string; nom: string }): string {
  return `${u.prenom} ${u.nom}`.trim();
}

export function formaterDate(d: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", options ?? { day: "numeric", month: "long", year: "numeric" });
}

export function formaterDateCourte(d: Date | string | null | undefined): string {
  return formaterDate(d, { day: "2-digit", month: "short" });
}

/** « il y a 3 min », « il y a 2 j » — pour les notifications et commentaires. */
export function depuis(d: Date | string, maintenant: Date = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.round((maintenant.getTime() - date.getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 30) return `il y a ${j} j`;
  return formaterDate(date);
}

export function pluriel(n: number, singulier: string, plurielForme?: string): string {
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? (plurielForme ?? `${singulier}s`) : singulier}`;
}
