/**
 * Signalement de commentaires — motifs proposés au membre.
 *
 * Liste courte et fermée : un motif libre complique le tri côté modération
 * sans rien apporter, le champ « précisions » suffit pour le détail.
 */

export const MOTIFS_SIGNALEMENT = [
  "Hors sujet",
  "Propos agressifs",
  "Contenu inapproprié",
  "Spam ou publicité",
  "Autre",
] as const;

export type MotifSignalement = (typeof MOTIFS_SIGNALEMENT)[number];

export function motifValide(v: unknown): v is MotifSignalement {
  return typeof v === "string" && (MOTIFS_SIGNALEMENT as readonly string[]).includes(v);
}
