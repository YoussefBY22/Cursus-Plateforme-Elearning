/**
 * Expérience et niveaux — logique pure, testée.
 *
 * Chaque gain d'XP est un événement unique `(type, référence)` en base : on
 * ne gagne qu'une fois les points d'une formation, d'un quiz, d'une journée.
 *
 * Courbe : XP cumulée pour atteindre le niveau L = 100 × (L − 1)^1,5.
 *   niveau 2 → 100 XP, 5 → 800, 10 → 2 700, 20 → 8 282, 30 → 15 617.
 * Les premiers niveaux tombent vite (motivation), les suivants demandent un
 * vrai parcours.
 */

export const BAREME_XP = {
  FORMATION_TERMINEE: 100,
  /** Bonus par tranche de 10 minutes de vidéo, plafonné. */
  FORMATION_PAR_10_MIN: 10,
  FORMATION_BONUS_MAX: 200,
  QUIZ_INTEGRE: 10,
  QUIZ_FINAL: 30,
  QUIZ_FINAL_EXCELLENCE: 20,
  ENQUETE_CHAUD: 15,
  ENQUETE_FROID: 25,
  PARCOURS_TERMINE: 300,
  AUTO_EVALUATION: 20,
  PROFIL_COMPLET: 50,
  EMAIL_VERIFIE: 20,
  /** Temps actif : 5 XP par quart d'heure, 40 XP par jour au plus. */
  TEMPS_ACTIF_QUART_HEURE: 5,
  TEMPS_ACTIF_MAX_JOUR: 40,
  COMMENTAIRE: 2,
} as const;

export function xpPourNiveau(niveau: number): number {
  if (niveau <= 1) return 0;
  return Math.round(100 * Math.pow(niveau - 1, 1.5));
}

export function niveauDepuisXp(xp: number): number {
  let niveau = 1;
  while (xpPourNiveau(niveau + 1) <= xp && niveau < 200) niveau++;
  return niveau;
}

export type EtatNiveau = {
  niveau: number;
  xp: number;
  xpNiveau: number;
  xpSuivant: number;
  /** 0–1 dans le niveau courant. */
  avancement: number;
  titre: string;
};

/** Titres de rang, dans le vocabulaire des organisations. */
export const RANGS = [
  { depuis: 1, titre: "Recrue" },
  { depuis: 3, titre: "Junior" },
  { depuis: 6, titre: "Consultant" },
  { depuis: 10, titre: "Consultant senior" },
  { depuis: 15, titre: "Chef de projet" },
  { depuis: 20, titre: "Manager" },
  { depuis: 30, titre: "Directeur" },
  { depuis: 40, titre: "Associé" },
  { depuis: 55, titre: "Légende organisation" },
];

export function titreDuNiveau(niveau: number): string {
  let titre = RANGS[0].titre;
  for (const r of RANGS) if (niveau >= r.depuis) titre = r.titre;
  return titre;
}

export function etatNiveau(xp: number): EtatNiveau {
  const niveau = niveauDepuisXp(xp);
  const xpNiveau = xpPourNiveau(niveau);
  const xpSuivant = xpPourNiveau(niveau + 1);
  return {
    niveau,
    xp,
    xpNiveau,
    xpSuivant,
    avancement: Math.min(1, (xp - xpNiveau) / Math.max(1, xpSuivant - xpNiveau)),
    titre: titreDuNiveau(niveau),
  };
}

/** XP d'une formation terminée selon sa durée. */
export function xpFormation(dureeSec: number): number {
  const bonus = Math.min(
    BAREME_XP.FORMATION_BONUS_MAX,
    Math.floor(dureeSec / 600) * BAREME_XP.FORMATION_PAR_10_MIN
  );
  return BAREME_XP.FORMATION_TERMINEE + bonus;
}

/** XP de temps actif pour une journée donnée (secondes cumulées ce jour-là). */
export function xpTempsActif(secondesDuJour: number): number {
  const quarts = Math.floor(secondesDuJour / 900);
  return Math.min(BAREME_XP.TEMPS_ACTIF_MAX_JOUR, quarts * BAREME_XP.TEMPS_ACTIF_QUART_HEURE);
}

/** Série de jours consécutifs d'activité se terminant aujourd'hui ou hier. */
export function serieJours(jours: Date[], aujourdHui: Date = new Date()): number {
  const cle = (d: Date) => d.toISOString().slice(0, 10);
  const ensemble = new Set(jours.map(cle));
  const curseur = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth(), aujourdHui.getUTCDate()));
  // Une série reste vivante tant qu'on n'a pas manqué hier.
  if (!ensemble.has(cle(curseur))) curseur.setUTCDate(curseur.getUTCDate() - 1);
  let n = 0;
  while (ensemble.has(cle(curseur))) {
    n++;
    curseur.setUTCDate(curseur.getUTCDate() - 1);
  }
  return n;
}
