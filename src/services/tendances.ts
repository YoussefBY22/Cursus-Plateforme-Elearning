/**
 * Tendances et suivi des organisations — logique pure, testée.
 *
 * Le pilotage répond à « combien » ; le suivi répond à « est-ce que ça va ».
 * Ce module fournit la seconde réponse :
 *
 *  - comparer une période à la précédente, et nommer le sens du mouvement ;
 *  - repérer les **pics** d'activité, c'est-à-dire les jours qui sortent
 *    vraiment de l'ordinaire et non les simples bosses du hasard ;
 *  - dire à quelles heures et quels jours les membres se forment ;
 *  - mesurer où les apprenants **décrochent** dans une vidéo ;
 *  - qualifier l'**état de santé** d'une organisation en une étiquette défendable.
 *
 * Aucun accès base : tout se vérifie en test unitaire.
 */
import type { Segment } from "./visionnage";
import { fusionnerSegments } from "./visionnage";

/* ------------------------------------------------------------------ */
/* Comparaison de périodes                                             */
/* ------------------------------------------------------------------ */

export type SensVariation = "hausse" | "baisse" | "stable";

export type Variation = {
  actuel: number;
  precedent: number;
  /** Différence brute, signée. */
  ecart: number;
  /** Variation relative (0,25 = +25 %) ; nulle si la période précédente est vide. */
  part: number | null;
  sens: SensVariation;
};

/**
 * Compare deux périodes de même durée.
 *
 * Partir de zéro n'est pas « +∞ % » : quand la période précédente est vide,
 * la part reste nulle et seul l'écart brut parle. En dessous de `seuilStable`
 * de variation relative, on refuse de crier à la tendance.
 */
export function comparerPeriodes(actuel: number, precedent: number, seuilStable = 0.05): Variation {
  const ecart = actuel - precedent;
  const part = precedent > 0 ? ecart / precedent : null;
  let sens: SensVariation = "stable";
  if (part === null) {
    sens = actuel > 0 ? "hausse" : "stable";
  } else if (Math.abs(part) >= seuilStable) {
    sens = part > 0 ? "hausse" : "baisse";
  }
  return { actuel, precedent, ecart, part, sens };
}

/** « +12 % », « −8 % », « = » ; « +3 » quand il n'y a pas de base de comparaison. */
export function formaterVariation(v: Variation): string {
  if (v.part === null) return v.ecart > 0 ? `+${v.ecart.toLocaleString("fr-FR")}` : "—";
  if (v.sens === "stable") return "=";
  const pourcent = Math.round(Math.abs(v.part) * 100);
  return `${v.part > 0 ? "+" : "−"}${pourcent} %`;
}

/* ------------------------------------------------------------------ */
/* Séries journalières                                                 */
/* ------------------------------------------------------------------ */

export type Jour = {
  /** AAAA-MM-JJ (UTC). */
  cle: string;
  /** « lun. 12 » */
  libelle: string;
  /** « lundi 12 octobre 2026 » */
  libelleLong: string;
  /** 0 = lundi … 6 = dimanche. */
  jourSemaine: number;
};

const JOURS_COURTS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
export const JOURS_LONGS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MOIS_LONGS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Lundi = 0, pour lire une semaine de gauche à droite comme un calendrier. */
function lundiZero(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

export function cleJour(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

/** Les `n` derniers jours (aujourd'hui inclus), du plus ancien au plus récent. */
export function derniersJours(n: number, maintenant: Date = new Date()): Jour[] {
  const base = Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate());
  const jours: Jour[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base - i * 86_400_000);
    const js = lundiZero(d);
    jours.push({
      cle: cleJour(d),
      libelle: `${JOURS_COURTS[js]} ${d.getUTCDate()}`,
      libelleLong: `${JOURS_LONGS[js]} ${d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      jourSemaine: js,
    });
  }
  return jours;
}

export type PointJour = Jour & { valeur: number };

/** Complète une série { AAAA-MM-JJ: n } sur une fenêtre (0 pour les jours creux). */
export function serieJournaliere(comptes: { jour: string; n: number }[], fenetre: Jour[]): PointJour[] {
  const index = new Map(comptes.map((c) => [c.jour, c.n]));
  return fenetre.map((j) => ({ ...j, valeur: index.get(j.cle) ?? 0 }));
}

/* ------------------------------------------------------------------ */
/* Pics                                                                */
/* ------------------------------------------------------------------ */

export function ecartType(valeurs: number[]): number {
  if (valeurs.length < 2) return 0;
  const m = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
  const variance = valeurs.reduce((s, v) => s + (v - m) ** 2, 0) / valeurs.length;
  return Math.sqrt(variance);
}

export type Pic = { cle: string; libelleLong: string; valeur: number; ecartsTypes: number };

/**
 * Les jours qui sortent de l'ordinaire : au-dessus de la moyenne de plus de
 * `k` écarts-types.
 *
 * Une série plate n'a pas de pic (écart-type nul) : on ne va pas désigner un
 * vainqueur entre des jours identiques. Les jours à zéro sont exclus, un
 * creux n'est pas un pic. Résultat trié du plus marqué au moins marqué.
 */
export function detecterPics(serie: PointJour[], k = 1.5): Pic[] {
  if (serie.length < 3) return [];
  const valeurs = serie.map((p) => p.valeur);
  const moyenne = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
  const sigma = ecartType(valeurs);
  if (sigma <= 0) return [];
  return serie
    .filter((p) => p.valeur > 0 && p.valeur >= moyenne + k * sigma)
    .map((p) => ({
      cle: p.cle,
      libelleLong: p.libelleLong,
      valeur: p.valeur,
      ecartsTypes: (p.valeur - moyenne) / sigma,
    }))
    .sort((a, b) => b.ecartsTypes - a.ecartsTypes);
}

/** Moyenne par jour de la semaine : quand la plateforme se forme-t-elle ? */
export function profilJourSemaine(serie: PointJour[]): { jourSemaine: number; libelle: string; moyenne: number }[] {
  const sommes = new Array(7).fill(0) as number[];
  const compte = new Array(7).fill(0) as number[];
  for (const p of serie) {
    sommes[p.jourSemaine] += p.valeur;
    compte[p.jourSemaine] += 1;
  }
  return JOURS_LONGS.map((libelle, i) => ({
    jourSemaine: i,
    libelle,
    moyenne: compte[i] > 0 ? sommes[i] / compte[i] : 0,
  }));
}

/**
 * Répartition par heure (0–23, UTC) d'une liste d'horodatages.
 *
 * Sert à répondre « à quelle heure nos membres se forment-ils ? » à partir
 * des relevés du lecteur et des tentatives de quiz.
 */
export function profilHoraire(dates: (Date | string | null | undefined)[]): { heure: number; n: number }[] {
  const compte = new Array(24).fill(0) as number[];
  for (const d of dates) {
    if (!d) continue;
    const date = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) continue;
    compte[date.getUTCHours()] += 1;
  }
  return compte.map((n, heure) => ({ heure, n }));
}

/* ------------------------------------------------------------------ */
/* Décrochage dans une vidéo                                           */
/* ------------------------------------------------------------------ */

export type TrancheAudience = {
  /** Index de la tranche, 0 à `tranches - 1`. */
  index: number;
  /** Bornes en secondes. */
  debutSec: number;
  finSec: number;
  /** Nombre d'apprenants ayant regardé au moins une partie de la tranche. */
  apprenants: number;
  /** Part des apprenants ayant démarré la formation. */
  part: number;
};

/**
 * Courbe d'audience d'une vidéo, découpée en tranches égales.
 *
 * Pour chaque tranche, la part des apprenants qui l'ont réellement regardée.
 * La courbe descend naturellement ; ce qui intéresse le formateur, c'est
 * l'endroit où elle **tombe d'un coup** (voir `chuteLaPlusForte`).
 */
export function courbeAudience(
  segmentsParApprenant: Segment[][],
  dureeSec: number,
  tranches = 20
): TrancheAudience[] {
  const total = segmentsParApprenant.length;
  const pas = dureeSec > 0 ? dureeSec / tranches : 0;
  if (pas <= 0) return [];

  const fusionnes = segmentsParApprenant.map((s) => fusionnerSegments(s));
  const courbe: TrancheAudience[] = [];
  for (let i = 0; i < tranches; i++) {
    const debutSec = i * pas;
    const finSec = (i + 1) * pas;
    const apprenants = fusionnes.filter((segs) => segs.some(([a, b]) => b > debutSec && a < finSec)).length;
    courbe.push({
      index: i,
      debutSec,
      finSec,
      apprenants,
      part: total > 0 ? apprenants / total : 0,
    });
  }
  return courbe;
}

export type Chute = { index: number; debutSec: number; perte: number };

/**
 * La tranche où l'audience chute le plus fort, en points de pourcentage.
 *
 * Nulle si personne ne décroche franchement (`perteMin` par défaut : 10 points).
 */
export function chuteLaPlusForte(courbe: TrancheAudience[], perteMin = 0.1): Chute | null {
  let pire: Chute | null = null;
  for (let i = 1; i < courbe.length; i++) {
    const perte = courbe[i - 1].part - courbe[i].part;
    if (perte >= perteMin && (!pire || perte > pire.perte)) {
      pire = { index: i, debutSec: courbe[i].debutSec, perte };
    }
  }
  return pire;
}

/** « 7 min 05 » — repère lisible pour pointer un moment de la vidéo. */
export function formaterMinutage(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  const minutes = Math.floor(s / 60);
  return `${minutes} min ${String(s % 60).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Santé d'une organisation                                       */
/* ------------------------------------------------------------------ */

export const ETATS_JE = ["ACTIVE", "RALENTIE", "EN_DECROCHAGE", "SANS_ACTIVITE"] as const;
export type EtatJE = (typeof ETATS_JE)[number];

export const LIBELLES_ETAT_JE: Record<EtatJE, { libelle: string; ton: "succes" | "alerte" | "danger" | "neutre" }> = {
  ACTIVE: { libelle: "Active", ton: "succes" },
  RALENTIE: { libelle: "Ralentie", ton: "alerte" },
  EN_DECROCHAGE: { libelle: "En décrochage", ton: "danger" },
  SANS_ACTIVITE: { libelle: "Jamais démarrée", ton: "neutre" },
};

export type MesureJE = {
  /** Membres rattachés et validés. */
  membres: number;
  /** Membres ayant eu une activité sur la période. */
  membresActifs: number;
  /** Jours écoulés depuis la dernière activité ; `null` si aucune, jamais. */
  joursDepuisActivite: number | null;
};

/**
 * Étiquette l'état d'une organisation, pour que le chargé de suivi sache où aller.
 *
 * Le critère dur est le silence : au-delà de 30 jours sans la moindre
 * activité, l'organisation décroche, quel que soit son passé. En deçà, c'est la part
 * de membres actifs qui tranche — une organisation de vingt personnes dont deux se
 * forment n'est pas une organisation active.
 */
export function etatJe(m: MesureJE, maintenant = { silenceGrave: 30, silenceAlerte: 14, partActive: 0.3 }): EtatJE {
  if (m.joursDepuisActivite === null) return "SANS_ACTIVITE";
  if (m.joursDepuisActivite >= maintenant.silenceGrave) return "EN_DECROCHAGE";
  const part = m.membres > 0 ? m.membresActifs / m.membres : 0;
  if (m.joursDepuisActivite >= maintenant.silenceAlerte || part < maintenant.partActive) return "RALENTIE";
  return "ACTIVE";
}

/* ------------------------------------------------------------------ */
/* Progressions en cours                                               */
/* ------------------------------------------------------------------ */

/** Jours entiers écoulés entre deux dates (0 si la date est à venir). */
export function joursDepuis(date: Date | string | null | undefined, maintenant: Date = new Date()): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((maintenant.getTime() - d.getTime()) / 86_400_000));
}

/**
 * Une formation commencée et laissée de côté depuis `seuilJours`.
 *
 * On ne parle d'abandon que pour les formations réellement entamées : une
 * progression ouverte il y a une heure et déjà silencieuse n'est pas un
 * abandon, c'est une pause.
 */
export function estEnPanne(
  p: { statut: string; derniereSyncLe: Date | string | null },
  seuilJours = 14,
  maintenant: Date = new Date()
): boolean {
  if (p.statut === "TERMINEE") return false;
  const jours = joursDepuis(p.derniereSyncLe, maintenant);
  return jours !== null && jours >= seuilJours;
}

/* ------------------------------------------------------------------ */
/* Demandes de formation                                               */
/* ------------------------------------------------------------------ */

/**
 * Score de classement d'une demande de formation.
 *
 * Les votes font l'essentiel, mais une demande ancienne ne doit pas camper
 * éternellement en tête : le score décroît doucement avec l'âge
 * (demi-vie de 60 jours). Une demande portée par plusieurs organisations compte plus
 * qu'une demande interne à une seule : c'est le signal d'un besoin commun.
 */
export function scoreDemande(
  d: { votes: number; jes: number; creeLe: Date | string },
  maintenant: Date = new Date()
): number {
  const jours = joursDepuis(d.creeLe, maintenant) ?? 0;
  const fraicheur = 0.5 ** (jours / 60);
  const portee = 1 + Math.log2(Math.max(1, d.jes));
  return (d.votes + 1) * portee * fraicheur;
}
