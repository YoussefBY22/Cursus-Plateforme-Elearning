/**
 * Vocabulaire du catalogue — pur et isomorphe.
 *
 * Ces libellés servent au rendu serveur ET aux filtres côté navigateur : ils
 * vivent donc ici, et non dans `server/requetes`, dont l'import entraînerait
 * le pilote PostgreSQL dans le paquet client.
 */

export const NIVEAUX = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
} as const;

export type CodeNiveau = keyof typeof NIVEAUX;

export const TRIS = {
  pertinence: "Les plus pertinentes",
  recentes: "Les plus récentes",
  populaires: "Les plus suivies",
  notees: "Les mieux notées",
  courtes: "Les plus courtes",
} as const;

export type CodeTri = keyof typeof TRIS;

export const DUREES = {
  eclair: { libelle: "Moins de 10 min", min: 0, max: 600 },
  courte: { libelle: "10 à 30 min", min: 600, max: 1800 },
  longue: { libelle: "Plus de 30 min", min: 1800, max: 1 << 30 },
} as const;

export type CodeDuree = keyof typeof DUREES;

export const ETATS_AVANCEMENT = {
  nouvelles: "Pas encore commencées",
  encours: "En cours",
  terminees: "Terminées",
} as const;

export type CodeEtat = keyof typeof ETATS_AVANCEMENT;

/** Valide une valeur d'URL contre une table de libellés. */
export function cleValide<T extends string>(v: string | undefined, table: Record<string, unknown>): T | undefined {
  return v && v in table ? (v as T) : undefined;
}
