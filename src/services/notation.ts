/**
 * Notation en étoiles (1 à 5 par pas de 0,25) et indicateurs de satisfaction.
 * Logique pure, testée.
 */

export const PAS_NOTE = 0.25;
export const NOTE_MIN = 1;
export const NOTE_MAX = 5;

/** Arrondit au quart supérieur le plus proche, borné à [1 ; 5]. */
export function arrondirNote(brute: number): number {
  if (!Number.isFinite(brute)) return NOTE_MIN;
  const quart = Math.ceil(brute / PAS_NOTE - 1e-9) * PAS_NOTE;
  return Math.min(NOTE_MAX, Math.max(NOTE_MIN, quart));
}

/**
 * Note correspondant à la position du pointeur sur la rangée d'étoiles.
 * `fraction` = position horizontale 0–1 sur toute la rangée.
 */
export function noteDepuisPosition(fraction: number, nbEtoiles = 5): number {
  return arrondirNote(Math.min(1, Math.max(0, fraction)) * nbEtoiles);
}

/** Remplissage 0–1 de l'étoile d'indice `i` (0-indexé) pour une note. */
export function remplissageEtoile(note: number, i: number): number {
  return Math.min(1, Math.max(0, note - i));
}

export function formaterNote(note: number | null | undefined): string {
  if (note === null || note === undefined) return "—";
  return note.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function moyenne(valeurs: number[]): number | null {
  if (!valeurs.length) return null;
  return valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
}

/** Net Promoter Score à partir de notes 0–10. */
export function nps(recommandations: number[]): number | null {
  if (!recommandations.length) return null;
  const promoteurs = recommandations.filter((r) => r >= 9).length;
  const detracteurs = recommandations.filter((r) => r <= 6).length;
  return Math.round(((promoteurs - detracteurs) / recommandations.length) * 100);
}

/** Taux de satisfaction : part des notes ≥ 4/5. */
export function tauxSatisfaction(notes: number[]): number | null {
  if (!notes.length) return null;
  return notes.filter((n) => n >= 4).length / notes.length;
}

/** Répartition par étoile entière (1 à 5) pour l'histogramme. */
export function repartition(notes: number[]): number[] {
  const r = [0, 0, 0, 0, 0];
  for (const n of notes) r[Math.min(4, Math.max(0, Math.round(n) - 1))]++;
  return r;
}
