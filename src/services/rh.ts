/**
 * Espace RH d'une organisation — logique pure, testée (aucun accès base).
 *
 * Les requêtes (`server/requetes/rh.ts`) ramènent des lignes brutes ; ce
 * module calcule la matrice membres × domaines, l'origine des compétences du
 * référentiel adapté, l'état des participations aux formations externes et
 * la mise en forme des exports CSV.
 */
import { versCsv } from "@/lib/csv";
import { niveauxParDomaine, palier, progression } from "./competences";
import { arrondir } from "./rapports";

/* ------------------------------------------------------------------ */
/* Matrice membres × domaines                                          */
/* ------------------------------------------------------------------ */

export type NiveauMembre = {
  utilisateurId: string;
  competenceId: string;
  domaineId: string;
  niveau: number;
  niveauInitial: number;
};

export type CelluleMatrice = { niveau: number; mesurees: number; palier: string; libelle: string };

/**
 * Niveau 0–99 de chaque membre sur chaque domaine (moyenne des compétences
 * mesurées, comme le radar). Une case absente = domaine jamais mesuré.
 */
export function matriceMembresDomaines(niveaux: NiveauMembre[]): Map<string, Map<string, CelluleMatrice>> {
  const parMembre = new Map<string, NiveauMembre[]>();
  for (const n of niveaux) {
    const liste = parMembre.get(n.utilisateurId) ?? [];
    liste.push(n);
    parMembre.set(n.utilisateurId, liste);
  }
  const resultat = new Map<string, Map<string, CelluleMatrice>>();
  for (const [membre, liste] of parMembre) {
    const domaines = niveauxParDomaine(liste);
    const ligne = new Map<string, CelluleMatrice>();
    for (const [domaineId, { niveau, mesurees }] of Object.entries(domaines)) {
      const p = palier(niveau);
      ligne.set(domaineId, { niveau, mesurees, palier: p.code, libelle: p.libelle });
    }
    resultat.set(membre, ligne);
  }
  return resultat;
}

export type ProgressionDomaine = {
  domaineId: string;
  /** Moyenne des niveaux actuels (0–99). */
  niveauMoyen: number;
  /** Moyenne de (niveau actuel − niveau initial), en points. */
  progressionMoyenne: number;
  membres: number;
  mesures: number;
};

/** Pour chaque domaine : niveau moyen et progression moyenne depuis l'auto-évaluation initiale. */
export function progressionParDomaine(niveaux: NiveauMembre[]): Map<string, ProgressionDomaine> {
  const acc = new Map<string, { niveau: number; prog: number; n: number; membres: Set<string> }>();
  for (const x of niveaux) {
    const a = acc.get(x.domaineId) ?? { niveau: 0, prog: 0, n: 0, membres: new Set<string>() };
    a.niveau += x.niveau;
    a.prog += progression(x.niveauInitial, x.niveau);
    a.n += 1;
    a.membres.add(x.utilisateurId);
    acc.set(x.domaineId, a);
  }
  const res = new Map<string, ProgressionDomaine>();
  for (const [domaineId, a] of acc) {
    res.set(domaineId, {
      domaineId,
      niveauMoyen: Math.round(a.niveau / a.n),
      progressionMoyenne: arrondir(a.prog / a.n, 1),
      membres: a.membres.size,
      mesures: a.n,
    });
  }
  return res;
}

/** Progression moyenne (points) sur toutes les compétences mesurées ; null sans mesure. */
export function progressionMoyenneGlobale(niveaux: Pick<NiveauMembre, "niveau" | "niveauInitial">[]): number | null {
  if (!niveaux.length) return null;
  const somme = niveaux.reduce((s, n) => s + (n.niveau - n.niveauInitial), 0);
  return arrondir(somme / niveaux.length, 1);
}

/** Classes Tailwind (jetons du thème) d'une case selon le palier. */
export function classesPalier(code: string): string {
  switch (code) {
    case "EXPERT":
      return "bg-or text-nuit";
    case "CONFIRME":
      return "bg-success-soft text-success";
    case "OPERATIONNEL":
      return "bg-turquoise/15 text-turquoise";
    case "INITIE":
      return "bg-warning-soft text-warning";
    case "DECOUVERTE":
      return "bg-muted text-foreground";
    default:
      return "border border-dashed border-border text-muted-foreground";
  }
}

/** Paliers dans l'ordre, pour la légende de la matrice. */
export const PALIERS_LEGENDE = [
  { code: "DECOUVERTE", libelle: "Découverte", seuil: "1–29" },
  { code: "INITIE", libelle: "Initié", seuil: "30–49" },
  { code: "OPERATIONNEL", libelle: "Opérationnel", seuil: "50–69" },
  { code: "CONFIRME", libelle: "Confirmé", seuil: "70–84" },
  { code: "EXPERT", libelle: "Expert", seuil: "85+" },
] as const;

/* ------------------------------------------------------------------ */
/* Référentiel adapté                                                  */
/* ------------------------------------------------------------------ */

export type OrigineCompetence = "COMMUN" | "REPRISE" | "ADAPTEE" | "PROPRE";

const normaliser = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Origine d'une ligne du référentiel effectif d'une organisation :
 * - COMMUN : compétence commune (domaine non adapté) ;
 * - REPRISE : copie propre à l'organisation, dont le nom est celui de la source ;
 * - ADAPTEE : copie propre à l'organisation, renommée ;
 * - PROPRE : ajoutée par l'organisation, sans source.
 */
export function origineCompetence(
  c: { jeId: string | null; sourceId: string | null; nom: string },
  nomSource: string | null | undefined
): OrigineCompetence {
  if (!c.jeId) return "COMMUN";
  if (!c.sourceId) return "PROPRE";
  if (nomSource && normaliser(nomSource) === normaliser(c.nom)) return "REPRISE";
  return "ADAPTEE";
}

export const LIBELLES_ORIGINE: Record<OrigineCompetence, string> = {
  COMMUN: "Plateforme",
  REPRISE: "Reprise de la plateforme",
  ADAPTEE: "Adaptée",
  PROPRE: "Propre à l'organisation",
};

/** Partie de code en majuscules sans accents : « Négociation tarifaire » → « NEGOCIATION_TARIFAIRE ». */
export function segmentCode(texte: string, max = 40): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max)
    .replace(/_+$/g, "");
}

/** Code `<SIGLE>_<SLUG>` d'une compétence propre à l'organisation, unique parmi `existants`. */
export function codeCompetenceJe(sigle: string, nom: string, existants: Iterable<string>): string {
  const pris = new Set(existants);
  const base = `${segmentCode(sigle, 16) || "ORG"}_${segmentCode(nom, 40) || "COMPETENCE"}`;
  let code = base;
  for (let i = 2; pris.has(code); i++) code = `${base}_${i}`;
  return code;
}

/* ------------------------------------------------------------------ */
/* Formations externes                                                 */
/* ------------------------------------------------------------------ */

export type EtatAutoEval = "NON_DEMANDEE" | "DEMANDEE" | "EN_COURS" | "TERMINEE";

/** État d'une auto-évaluation (initiale ou finale) d'un participant. */
export function etatAutoEvaluation(a: {
  autoEvalId: string | null;
  termineeLe: Date | string | null;
  demandee: boolean;
}): EtatAutoEval {
  if (a.autoEvalId && a.termineeLe) return "TERMINEE";
  if (a.autoEvalId) return "EN_COURS";
  return a.demandee ? "DEMANDEE" : "NON_DEMANDEE";
}

export const LIBELLES_ETAT_AUTO_EVAL: Record<EtatAutoEval, string> = {
  NON_DEMANDEE: "Non demandée",
  DEMANDEE: "Demandée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
};

export type ParticipationResume = {
  initiale: EtatAutoEval;
  finale: EtatAutoEval;
  /** { competenceId: 1..10 } */
  evaluationFormateur: Record<string, number>;
  scoreTest: number | null;
};

/** Nombre de compétences visées notées par le formateur pour ce participant. */
export function evaluationsSaisies(evaluation: Record<string, number>, competences: string[]): number {
  return competences.filter((c) => {
    const v = evaluation[c];
    return typeof v === "number" && v >= 1 && v <= 10;
  }).length;
}

/** Le participant a-t-il au moins une mesure exploitable par le calcul ? */
export function aUneMesure(p: ParticipationResume, competences: string[]): boolean {
  return p.scoreTest !== null || p.finale === "TERMINEE" || evaluationsSaisies(p.evaluationFormateur, competences) > 0;
}

export type BilanCloture = {
  /** Refus : aucune mesure du tout. */
  possible: boolean;
  sansMesure: number;
  sansDeuxAutoEvals: number;
  evaluationsIncompletes: number;
  avertissements: string[];
};

/** Ce qu'il faut savoir avant de clôturer une formation externe. */
export function bilanCloture(participations: ParticipationResume[], competences: string[]): BilanCloture {
  const sansMesure = participations.filter((p) => !aUneMesure(p, competences)).length;
  const sansDeuxAutoEvals = participations.filter((p) => p.initiale !== "TERMINEE" || p.finale !== "TERMINEE").length;
  const evaluationsIncompletes = participations.filter(
    (p) => evaluationsSaisies(p.evaluationFormateur, competences) < competences.length
  ).length;
  const possible = participations.length > 0 && competences.length > 0 && sansMesure < participations.length;
  const avertissements: string[] = [];
  if (sansDeuxAutoEvals > 0) {
    avertissements.push(
      `${sansDeuxAutoEvals} participant${sansDeuxAutoEvals > 1 ? "s n'ont" : " n'a"} pas terminé ses deux auto-évaluations : leur niveau de départ sera leur niveau actuel (ou 0), sans réévaluation finale.`
    );
  }
  if (evaluationsIncompletes > 0) {
    avertissements.push(
      `${evaluationsIncompletes} participant${evaluationsIncompletes > 1 ? "s ont" : " a"} une évaluation du formateur incomplète.`
    );
  }
  if (sansMesure > 0 && possible) {
    avertissements.push(
      `${sansMesure} participant${sansMesure > 1 ? "s n'ont" : " n'a"} aucune mesure : leur niveau ne bougera pas.`
    );
  }
  return { possible, sansMesure, sansDeuxAutoEvals, evaluationsIncompletes, avertissements };
}

/**
 * Nettoie la grille d'évaluation saisie : ne garde que les participants et
 * compétences de la formation, des notes entières 1–10 et un score 0–100.
 */
export function nettoyerEvaluations(
  saisie: Record<string, { notes: Record<string, number | null>; scoreTest: number | null }>,
  participants: string[],
  competences: string[]
): Record<string, { notes: Record<string, number>; scoreTest: number | null }> {
  const autorisesP = new Set(participants);
  const autorisesC = new Set(competences);
  const res: Record<string, { notes: Record<string, number>; scoreTest: number | null }> = {};
  for (const [pid, v] of Object.entries(saisie)) {
    if (!autorisesP.has(pid)) continue;
    const notes: Record<string, number> = {};
    for (const [cid, n] of Object.entries(v.notes)) {
      if (!autorisesC.has(cid) || n === null || !Number.isFinite(n)) continue;
      notes[cid] = Math.round(Math.min(10, Math.max(1, n)));
    }
    const s = v.scoreTest;
    res[pid] = {
      notes,
      scoreTest: s === null || !Number.isFinite(s) ? null : arrondir(Math.min(100, Math.max(0, s)), 1),
    };
  }
  return res;
}

/** Niveau après application immédiate du gain (borné 0–99). */
export function niveauApres(niveauAvant: number, gainApplique: number): number {
  return arrondir(Math.min(99, Math.max(0, niveauAvant + gainApplique)), 1);
}

/* ------------------------------------------------------------------ */
/* Exports CSV                                                          */
/* ------------------------------------------------------------------ */

export const TYPES_EXPORT_RH = ["membres", "niveaux", "historique", "formations-externes", "formations", "tout"] as const;
export type TypeExportRh = (typeof TYPES_EXPORT_RH)[number];

export function estTypeExportRh(v: string): v is TypeExportRh {
  return (TYPES_EXPORT_RH as readonly string[]).includes(v);
}

export const EXPORTS_RH: Record<TypeExportRh, { titre: string; description: string }> = {
  membres: {
    titre: "Membres",
    description: "La liste des membres de l'organisation avec leur poste, leur département, leur XP et leur activité : de quoi reconstituer l'annuaire interne.",
  },
  niveaux: {
    titre: "Niveaux de compétences",
    description: "Le niveau initial et actuel de chaque membre sur chaque compétence mesurée, pour suivre la progression hors plateforme.",
  },
  historique: {
    titre: "Historique des niveaux",
    description: "Chaque changement de niveau daté, avec sa source : de quoi redessiner les courbes de progression dans un tableur.",
  },
  "formations-externes": {
    titre: "Formations externes",
    description: "Toutes les mesures des formations internes à l'organisation (auto-évaluations, évaluation du formateur, test, gains) : la preuve du calcul.",
  },
  formations: {
    titre: "Formations Cursus",
    description: "Les formations Cursus terminées par vos membres, avec les dates, le score au quiz final et la note donnée.",
  },
  tout: {
    titre: "Tout (archive)",
    description: "Un seul fichier qui reprend tous les exports ci-dessus, section par section : la sauvegarde complète de l'organisation.",
  },
};

/** Nom de fichier : `aurora-niveaux-2026-10-07.csv`. */
export function nomFichierExportRh(type: TypeExportRh, slugJe: string, date: Date = new Date()): string {
  const slug = slugJe.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "je";
  return `${slug}-${type === "tout" ? "archive" : type}-${date.toISOString().slice(0, 10)}.csv`;
}

export type TableCsv = { entetes: string[]; lignes: (string | number | null | undefined)[][] };

/**
 * Un seul CSV à sections : un titre de section sur sa ligne, puis l'en-tête
 * et les lignes, une ligne vide entre deux sections. Excel l'ouvre tel quel.
 */
export function csvMultiSections(sections: { titre: string; table: TableCsv }[]): string {
  const blocs = sections.map(({ titre, table }) => {
    const corps = versCsv(table.entetes, table.lignes).replace(/^﻿/, "");
    return `${versCsv([`# ${titre}`], []).replace(/^﻿/, "")}\r\n${corps}`;
  });
  return "﻿" + blocs.join("\r\n\r\n");
}

/** Valeur d'auto-évaluation lisible : 1–10, « Je ne connais pas », « Temps écoulé » ou vide. */
export function valeurAutoEvalCsv(r: { valeur: number | null; inconnu: boolean; expire: boolean } | undefined): string | number {
  if (!r) return "";
  if (r.valeur !== null) return r.valeur;
  if (r.inconnu) return "Je ne connais pas";
  if (r.expire) return "Temps écoulé";
  return "";
}

/** Date et heure lisibles par un tableur (AAAA-MM-JJ HH:MM, UTC) ; vide si absente. */
export function dateHeureCsv(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16).replace("T", " ");
}

/** Ton de pastille d'un état d'auto-évaluation. */
export const TON_ETAT_AUTO_EVAL: Record<EtatAutoEval, "neutre" | "alerte" | "primaire" | "succes"> = {
  NON_DEMANDEE: "neutre",
  DEMANDEE: "alerte",
  EN_COURS: "primaire",
  TERMINEE: "succes",
};

/**
 * Lien de l'espace RH qui garde l'organisation consultée par un super admin
 * (`?je=<id>`) ; sans `je`, le lien est inchangé.
 */
export function avecJe(href: string, je: string | null | undefined): string {
  if (!je) return href;
  const [chemin, ancre] = href.split("#");
  const sep = chemin.includes("?") ? "&" : "?";
  return `${chemin}${sep}je=${encodeURIComponent(je)}${ancre !== undefined ? `#${ancre}` : ""}`;
}
