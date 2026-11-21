/**
 * Rapports et pilotage — mise en forme pure, testée.
 *
 * Les requêtes (src/server/requetes/admin-*.ts) ramènent des lignes brutes ;
 * ce module les transforme en tableaux CSV et en séries de graphiques. Aucun
 * accès base ici : tout se vérifie en test unitaire.
 */
import { moyenne, nps } from "./notation";

/* ------------------------------------------------------------------ */
/* Nombres et dates                                                    */
/* ------------------------------------------------------------------ */

/** Arrondi à `decimales` chiffres (0,1 par défaut). */
export function arrondir(valeur: number, decimales = 1): number {
  const f = 10 ** decimales;
  return Math.round(valeur * f) / f;
}

/** Secondes → heures, arrondies au dixième. */
export function heuresDepuisSecondes(secondes: number | null | undefined): number {
  if (!secondes || !Number.isFinite(secondes)) return 0;
  return arrondir(secondes / 3600, 1);
}

/** Part 0–1 des inscrits allés au bout ; nulle sans inscrit. */
export function tauxCompletion(inscrits: number, terminees: number): number | null {
  if (inscrits <= 0) return null;
  return Math.min(1, Math.max(0, terminees / inscrits));
}

/** « 12,5 » à la française ; « — » si la valeur manque. */
export function formaterNombre(valeur: number | null | undefined, decimales = 1): string {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return "—";
  return valeur.toLocaleString("fr-FR", { maximumFractionDigits: decimales });
}

/** 0,734 → « 73 % ». */
export function formaterPourcentage(part: number | null | undefined): string {
  if (part === null || part === undefined || !Number.isFinite(part)) return "—";
  return `${Math.round(part * 100)} %`;
}

/** Date ISO courte (AAAA-MM-JJ), lisible par un tableur. */
export function dateIso(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Valeur numérique pour le CSV : vide si absente, point décimal sinon. */
export function nombreCsv(valeur: number | null | undefined, decimales = 2): string | number {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return "";
  return arrondir(valeur, decimales);
}

/* ------------------------------------------------------------------ */
/* Séries mensuelles                                                    */
/* ------------------------------------------------------------------ */

export type Mois = { cle: string; libelle: string; libelleLong: string };

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
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

/** Les `n` derniers mois (le mois courant inclus), du plus ancien au plus récent. Clé AAAA-MM (UTC). */
export function derniersMois(n: number, maintenant: Date = new Date()): Mois[] {
  const mois: Mois[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1));
    const m = d.getUTCMonth();
    mois.push({
      cle: `${d.getUTCFullYear()}-${String(m + 1).padStart(2, "0")}`,
      libelle: MOIS_COURTS[m],
      libelleLong: `${MOIS_LONGS[m]} ${d.getUTCFullYear()}`,
    });
  }
  return mois;
}

/** Complète une série { AAAA-MM: n } sur une fenêtre de mois (0 pour les mois creux). */
export function serieMensuelle(
  comptes: { mois: string; n: number }[],
  fenetre: Mois[]
): { cle: string; libelle: string; libelleLong: string; valeur: number }[] {
  const index = new Map(comptes.map((c) => [c.mois, c.n]));
  return fenetre.map((m) => ({ ...m, valeur: index.get(m.cle) ?? 0 }));
}

/* ------------------------------------------------------------------ */
/* Satisfaction                                                         */
/* ------------------------------------------------------------------ */

export type EnqueteBrute = { formationId: string; noteContenu: number; recommandation: number };
export type Satisfaction = { reponses: number; satisfaction: number | null; nps: number | null };

/** Satisfaction moyenne (note de contenu /5) et NPS par formation. */
export function satisfactionParFormation(enquetes: EnqueteBrute[]): Map<string, Satisfaction> {
  const groupes = new Map<string, EnqueteBrute[]>();
  for (const e of enquetes) {
    const g = groupes.get(e.formationId);
    if (g) g.push(e);
    else groupes.set(e.formationId, [e]);
  }
  const resultat = new Map<string, Satisfaction>();
  for (const [id, liste] of groupes) {
    resultat.set(id, {
      reponses: liste.length,
      satisfaction: moyenne(liste.map((e) => e.noteContenu)),
      nps: nps(liste.map((e) => e.recommandation)),
    });
  }
  return resultat;
}

/* ------------------------------------------------------------------ */
/* Carte de chaleur                                                     */
/* ------------------------------------------------------------------ */

/**
 * Intensité 0–1 d'une case de la carte de chaleur (niveau 0–99).
 * L'échelle sature à 80 : au-delà, tout est « confirmé » et la nuance
 * n'apporte plus rien ; en dessous de 10, la case reste presque neutre.
 */
export function intensiteChaleur(niveau: number | null | undefined): number {
  if (niveau === null || niveau === undefined || !Number.isFinite(niveau)) return 0;
  return Math.min(1, Math.max(0, (niveau - 10) / 70));
}

/** Indexe des lignes (ligne, colonne, valeur) en table à double entrée. */
export function tableCroisee<T extends { ligne: string; colonne: string; valeur: number }>(
  cellules: T[]
): Map<string, Map<string, number>> {
  const table = new Map<string, Map<string, number>>();
  for (const c of cellules) {
    let l = table.get(c.ligne);
    if (!l) table.set(c.ligne, (l = new Map()));
    l.set(c.colonne, c.valeur);
  }
  return table;
}

/* ------------------------------------------------------------------ */
/* Exports CSV                                                          */
/* ------------------------------------------------------------------ */

export const TYPES_RAPPORT = ["membres", "formations", "competences", "historique", "certificats"] as const;
export type TypeRapport = (typeof TYPES_RAPPORT)[number];

export function estTypeRapport(v: string): v is TypeRapport {
  return (TYPES_RAPPORT as readonly string[]).includes(v);
}

export const DESCRIPTIONS_RAPPORTS: Record<TypeRapport, { titre: string; description: string; icone: string }> = {
  membres: {
    titre: "Membres",
    description:
      "Un membre par ligne : organisation, rôles, rattachement, XP et niveau, heures vues, formations terminées, certificats, dernier accès.",
    icone: "Users",
  },
  formations: {
    titre: "Formations",
    description:
      "Une formation par ligne : inscrits, terminées, taux de complétion, note moyenne, satisfaction à chaud et NPS.",
    icone: "BookOpen",
  },
  competences: {
    titre: "Compétences",
    description:
      "Format long : un couple membre × compétence par ligne, avec le niveau initial, le niveau actuel et la progression.",
    icone: "Hexagon",
  },
  historique: {
    titre: "Historique des niveaux",
    description:
      "Chaque mesure datée (auto-évaluation, formation, consolidation, externe) avec sa variation : de quoi retracer les courbes.",
    icone: "TrendingUp",
  },
  certificats: {
    titre: "Certificats",
    description: "Numéro, membre, parcours, date d'émission et statut (valide ou révoqué, avec le motif).",
    icone: "ScrollText",
  },
};

export function nomFichierRapport(type: TypeRapport, date: Date = new Date()): string {
  return `cursus-${type}-${dateIso(date)}.csv`;
}

export type Tabulaire = { entetes: string[]; lignes: (string | number)[][] };

export type LigneRapportMembre = {
  prenom: string;
  nom: string;
  email: string;
  je: string | null;
  roles: string[];
  rattachement: string;
  actif: boolean;
  xp: number;
  niveau: number;
  secondesVues: number;
  formationsTerminees: number;
  certificats: number;
  creeLe: Date | string;
  dernierAcces: Date | string | null;
};

export function tabulerMembres(lignes: LigneRapportMembre[], libelleRole: (r: string) => string = (r) => r): Tabulaire {
  return {
    entetes: [
      "Prénom",
      "Nom",
      "E-mail",
      "Organisation",
      "Rôles",
      "Rattachement",
      "Actif",
      "XP",
      "Niveau",
      "Heures vues",
      "Formations terminées",
      "Certificats",
      "Inscrit le",
      "Dernier accès",
    ],
    lignes: lignes.map((l) => [
      l.prenom,
      l.nom,
      l.email,
      l.je ?? "",
      l.roles.map(libelleRole).join(" | "),
      LIBELLES_RATTACHEMENT[l.rattachement] ?? l.rattachement,
      l.actif ? "oui" : "non",
      l.xp,
      l.niveau,
      heuresDepuisSecondes(l.secondesVues),
      l.formationsTerminees,
      l.certificats,
      dateIso(l.creeLe),
      dateIso(l.dernierAcces),
    ]),
  };
}

export const LIBELLES_RATTACHEMENT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  VALIDE: "Validé",
  REFUSE: "Refusé",
};

export const LIBELLES_STATUT_CONTENU: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_VALIDATION: "En validation",
  PUBLIE: "Publié",
  REFUSE: "Refusé",
  ARCHIVE: "Archivé",
};

export type LigneRapportFormation = {
  titre: string;
  domaine: string;
  statut: string;
  auteur: string;
  dureeSec: number;
  inscrits: number;
  terminees: number;
  noteMoyenne: number | null;
  notes: number;
};

export function tabulerFormations(
  lignes: (LigneRapportFormation & { id: string })[],
  satisfaction: Map<string, Satisfaction>
): Tabulaire {
  return {
    entetes: [
      "Formation",
      "Domaine",
      "Statut",
      "Auteur",
      "Durée (min)",
      "Inscrits",
      "Terminées",
      "Taux de complétion (%)",
      "Note moyenne (/5)",
      "Nombre de notes",
      "Satisfaction à chaud (/5)",
      "NPS",
      "Réponses aux enquêtes",
    ],
    lignes: lignes.map((l) => {
      const s = satisfaction.get(l.id);
      const taux = tauxCompletion(l.inscrits, l.terminees);
      return [
        l.titre,
        l.domaine,
        LIBELLES_STATUT_CONTENU[l.statut] ?? l.statut,
        l.auteur,
        Math.round(l.dureeSec / 60),
        l.inscrits,
        l.terminees,
        taux === null ? "" : Math.round(taux * 100),
        nombreCsv(l.noteMoyenne),
        l.notes,
        nombreCsv(s?.satisfaction ?? null),
        s?.nps ?? "",
        s?.reponses ?? 0,
      ];
    }),
  };
}

export type LigneRapportCompetence = {
  membre: string;
  email: string;
  je: string | null;
  domaine: string;
  competence: string;
  adaptee: boolean;
  niveauInitial: number;
  niveau: number;
  majLe: Date | string;
};

export function tabulerCompetences(lignes: LigneRapportCompetence[]): Tabulaire {
  return {
    entetes: [
      "Membre",
      "E-mail",
      "Organisation",
      "Domaine",
      "Compétence",
      "Référentiel",
      "Niveau initial",
      "Niveau actuel",
      "Progression",
      "Mis à jour le",
    ],
    lignes: lignes.map((l) => [
      l.membre,
      l.email,
      l.je ?? "",
      l.domaine,
      l.competence,
      l.adaptee ? "adapté par l'organisation" : "Plateforme",
      nombreCsv(l.niveauInitial, 1),
      nombreCsv(l.niveau, 1),
      nombreCsv(l.niveau - l.niveauInitial, 1),
      dateIso(l.majLe),
    ]),
  };
}

export const LIBELLES_SOURCE_NIVEAU: Record<string, string> = {
  AUTOEVAL: "Auto-évaluation",
  FORMATION: "Formation Cursus",
  CONSOLIDATION: "Évaluation à froid",
  EXTERNE: "Formation externe",
};

export type LigneRapportHistorique = {
  membre: string;
  email: string;
  je: string | null;
  domaine: string;
  competence: string;
  date: Date | string;
  niveau: number;
  variation: number;
  source: string;
  libelle: string | null;
};

export function tabulerHistorique(lignes: LigneRapportHistorique[]): Tabulaire {
  return {
    entetes: [
      "Membre",
      "E-mail",
      "Organisation",
      "Domaine",
      "Compétence",
      "Date",
      "Niveau",
      "Variation",
      "Source",
      "Détail",
    ],
    lignes: lignes.map((l) => [
      l.membre,
      l.email,
      l.je ?? "",
      l.domaine,
      l.competence,
      dateIso(l.date),
      nombreCsv(l.niveau, 1),
      nombreCsv(l.variation, 1),
      LIBELLES_SOURCE_NIVEAU[l.source] ?? l.source,
      l.libelle ?? "",
    ]),
  };
}

export type LigneRapportCertificat = {
  numero: string;
  membre: string;
  email: string;
  je: string | null;
  parcours: string;
  emisLe: Date | string;
  revoqueLe: Date | string | null;
  motifRevocation: string | null;
  consultations: number;
};

export function statutCertificat(revoqueLe: Date | string | null | undefined): "Valide" | "Révoqué" {
  return revoqueLe ? "Révoqué" : "Valide";
}

export function tabulerCertificats(lignes: LigneRapportCertificat[]): Tabulaire {
  return {
    entetes: [
      "Numéro",
      "Membre",
      "E-mail",
      "Organisation",
      "Parcours",
      "Émis le",
      "Statut",
      "Révoqué le",
      "Motif de révocation",
      "Consultations",
    ],
    lignes: lignes.map((l) => [
      l.numero,
      l.membre,
      l.email,
      l.je ?? "",
      l.parcours,
      dateIso(l.emisLe),
      statutCertificat(l.revoqueLe),
      dateIso(l.revoqueLe),
      l.motifRevocation ?? "",
      l.consultations,
    ]),
  };
}

/* ------------------------------------------------------------------ */
/* Paramètres : conversions d'affichage                                 */
/* ------------------------------------------------------------------ */

/** Les trois poids du niveau observé doivent laisser au moins une mesure. */
export function poidsMesuresValides(p: { quiz: number; formateur: number; reevaluation: number }): boolean {
  return p.quiz + p.formateur + p.reevaluation > 0;
}

/** Part 0–1 de chaque poids, pour expliquer la pondération réelle. */
export function partsPoids(p: { quiz: number; formateur: number; reevaluation: number }): {
  quiz: number;
  formateur: number;
  reevaluation: number;
} {
  const somme = p.quiz + p.formateur + p.reevaluation;
  if (somme <= 0) return { quiz: 0, formateur: 0, reevaluation: 0 };
  return { quiz: p.quiz / somme, formateur: p.formateur / somme, reevaluation: p.reevaluation / somme };
}
