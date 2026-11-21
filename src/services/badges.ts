/**
 * Badges — critères de déblocage, logique pure et testée.
 *
 * Le super admin et le responsable pédagogique composent les badges dans l'interface
 * (nom, couleur, forme, matière, effet, seuil). Ils choisissent le critère
 * dans une liste **alimentée par la base** (table `CritereBadge`, semée
 * depuis `CRITERES` ci-dessous). Le calcul de chaque critère, lui, vit ici :
 * un critère sans calcul ne doit pas pouvoir apparaître dans la liste.
 */

export type StatistiquesMembre = {
  heuresPlateforme: number;
  heuresVisionnage: number;
  formationsTerminees: number;
  formationsVisionnees: number;
  quizReussis: number;
  quizParfaits: number;
  parcoursTermines: number;
  certificats: number;
  profilComplet: boolean;
  emailVerifie: boolean;
  autoEvaluations: number;
  domainesEvalues: number;
  niveau: number;
  meilleureCompetence: number;
  noteGenerale: number;
  commentaires: number;
  likesRecus: number;
  notesDonnees: number;
  enquetesFroid: number;
  serieJours: number;
  domainesFormes: number;
  /** Formations terminées par domaine (id → nombre). */
  formationsParDomaine: Record<string, number>;
  /** Parcours terminés (ids). */
  parcoursTerminesIds: string[];
  formationsPubliees: number;
  progressionMax: number;
};

export const STATISTIQUES_VIDES: StatistiquesMembre = {
  heuresPlateforme: 0,
  heuresVisionnage: 0,
  formationsTerminees: 0,
  formationsVisionnees: 0,
  quizReussis: 0,
  quizParfaits: 0,
  parcoursTermines: 0,
  certificats: 0,
  profilComplet: false,
  emailVerifie: false,
  autoEvaluations: 0,
  domainesEvalues: 0,
  niveau: 1,
  meilleureCompetence: 0,
  noteGenerale: 0,
  commentaires: 0,
  likesRecus: 0,
  notesDonnees: 0,
  enquetesFroid: 0,
  serieJours: 0,
  domainesFormes: 0,
  formationsParDomaine: {},
  parcoursTerminesIds: [],
  formationsPubliees: 0,
  progressionMax: 0,
};

export type DefinitionCritere = {
  code: string;
  libelle: string;
  description: string;
  unite: string;
  parametre: "AUCUN" | "DOMAINE" | "PARCOURS";
  valeur: (s: StatistiquesMembre, parametre?: string | null) => number;
};

const bool = (b: boolean) => (b ? 1 : 0);

export const CRITERES: DefinitionCritere[] = [
  { code: "HEURES_PLATEFORME", libelle: "Heures passées sur la plateforme", description: "Temps actif cumulé (onglet visible, activité réelle).", unite: "h", parametre: "AUCUN", valeur: (s) => s.heuresPlateforme },
  { code: "HEURES_VISIONNAGE", libelle: "Heures de vidéo réellement regardées", description: "Segments uniques non sautés, toutes formations confondues.", unite: "h", parametre: "AUCUN", valeur: (s) => s.heuresVisionnage },
  { code: "FORMATIONS_TERMINEES", libelle: "Formations terminées", description: "Visionnage, quiz et enquête de satisfaction complétés.", unite: "formations", parametre: "AUCUN", valeur: (s) => s.formationsTerminees },
  { code: "FORMATIONS_VISIONNEES", libelle: "Vidéos vues jusqu'au seuil", description: "Formations dont le seuil de visionnage est atteint.", unite: "vidéos", parametre: "AUCUN", valeur: (s) => s.formationsVisionnees },
  { code: "QUIZ_REUSSIS", libelle: "Quiz réussis", description: "Quiz intégrés et finaux réussis.", unite: "quiz", parametre: "AUCUN", valeur: (s) => s.quizReussis },
  { code: "QUIZ_PARFAITS", libelle: "Quiz finaux parfaits", description: "Quiz finaux réussis à 100 % du premier coup.", unite: "quiz", parametre: "AUCUN", valeur: (s) => s.quizParfaits },
  { code: "PARCOURS_TERMINES", libelle: "Parcours certifiants terminés", description: "Toute la chaîne d'un parcours réalisée.", unite: "parcours", parametre: "AUCUN", valeur: (s) => s.parcoursTermines },
  { code: "PARCOURS_SPECIFIQUE", libelle: "Parcours précis terminé", description: "Un parcours certifiant donné, choisi dans la liste.", unite: "", parametre: "PARCOURS", valeur: (s, p) => bool(!!p && s.parcoursTerminesIds.includes(p)) },
  { code: "CERTIFICATS", libelle: "Certificats obtenus", description: "Certificats émis et non révoqués.", unite: "certificats", parametre: "AUCUN", valeur: (s) => s.certificats },
  { code: "PROFIL_COMPLET", libelle: "Profil complété", description: "Photo, poste, bio et LinkedIn renseignés.", unite: "", parametre: "AUCUN", valeur: (s) => bool(s.profilComplet) },
  { code: "EMAIL_VERIFIE", libelle: "E-mail vérifié", description: "Adresse e-mail confirmée par lien.", unite: "", parametre: "AUCUN", valeur: (s) => bool(s.emailVerifie) },
  { code: "AUTO_EVALUATIONS", libelle: "Auto-évaluations réalisées", description: "Formulaires de niveau complétés jusqu'au bout.", unite: "auto-évaluations", parametre: "AUCUN", valeur: (s) => s.autoEvaluations },
  { code: "DOMAINES_EVALUES", libelle: "Domaines auto-évalués", description: "Nombre de domaines distincts mesurés.", unite: "domaines", parametre: "AUCUN", valeur: (s) => s.domainesEvalues },
  { code: "NIVEAU_ATTEINT", libelle: "Niveau d'expérience atteint", description: "Niveau calculé à partir de l'XP.", unite: "niveau", parametre: "AUCUN", valeur: (s) => s.niveau },
  { code: "COMPETENCE_NIVEAU", libelle: "Une compétence au niveau", description: "Meilleure compétence (0–99) au moins égale au seuil.", unite: "/99", parametre: "AUCUN", valeur: (s) => s.meilleureCompetence },
  { code: "NOTE_GENERALE", libelle: "Note générale (OVR)", description: "Note générale du radar au moins égale au seuil.", unite: "/99", parametre: "AUCUN", valeur: (s) => s.noteGenerale },
  { code: "PROGRESSION", libelle: "Progression sur une compétence", description: "Points gagnés depuis l'auto-évaluation initiale.", unite: "points", parametre: "AUCUN", valeur: (s) => s.progressionMax },
  { code: "COMMENTAIRES", libelle: "Commentaires publiés", description: "Participation aux discussions des formations.", unite: "commentaires", parametre: "AUCUN", valeur: (s) => s.commentaires },
  { code: "LIKES_RECUS", libelle: "J'aime reçus", description: "J'aime reçus sur ses commentaires.", unite: "j'aime", parametre: "AUCUN", valeur: (s) => s.likesRecus },
  { code: "NOTES_DONNEES", libelle: "Formations notées", description: "Notes en étoiles attribuées.", unite: "notes", parametre: "AUCUN", valeur: (s) => s.notesDonnees },
  { code: "ENQUETES_FROID", libelle: "Évaluations à froid", description: "Évaluations différées complétées.", unite: "évaluations", parametre: "AUCUN", valeur: (s) => s.enquetesFroid },
  { code: "SERIE_JOURS", libelle: "Jours d'affilée", description: "Série de jours consécutifs d'activité.", unite: "jours", parametre: "AUCUN", valeur: (s) => s.serieJours },
  { code: "DOMAINES_FORMES", libelle: "Domaines explorés", description: "Formations terminées dans des domaines distincts.", unite: "domaines", parametre: "AUCUN", valeur: (s) => s.domainesFormes },
  { code: "FORMATIONS_DOMAINE", libelle: "Formations dans un domaine", description: "Formations terminées dans le domaine choisi.", unite: "formations", parametre: "DOMAINE", valeur: (s, p) => (p ? (s.formationsParDomaine[p] ?? 0) : 0) },
  { code: "FORMATIONS_PUBLIEES", libelle: "Formations publiées (formateur)", description: "Formations créées et publiées.", unite: "formations", parametre: "AUCUN", valeur: (s) => s.formationsPubliees },
];

export const CRITERES_PAR_CODE = new Map(CRITERES.map((c) => [c.code, c]));

export type RegleBadge = {
  id: string;
  critereCode: string;
  seuil: number;
  parametre?: string | null;
  actif: boolean;
};

export function valeurCritere(regle: Pick<RegleBadge, "critereCode" | "parametre">, s: StatistiquesMembre): number {
  const def = CRITERES_PAR_CODE.get(regle.critereCode);
  return def ? def.valeur(s, regle.parametre) : 0;
}

export function badgeDebloque(regle: RegleBadge, s: StatistiquesMembre): boolean {
  if (!regle.actif) return false;
  return valeurCritere(regle, s) >= regle.seuil - 1e-9;
}

/** Badges nouvellement mérités (ceux déjà obtenus exclus). */
export function badgesAAttribuer(
  regles: RegleBadge[],
  s: StatistiquesMembre,
  dejaObtenus: Set<string>
): string[] {
  return regles.filter((r) => !dejaObtenus.has(r.id) && badgeDebloque(r, s)).map((r) => r.id);
}

/** Avancement 0–1 vers un badge, pour les barres de la collection. */
export function avancementBadge(regle: RegleBadge, s: StatistiquesMembre): number {
  if (regle.seuil <= 0) return 1;
  return Math.min(1, valeurCritere(regle, s) / regle.seuil);
}

/* ------------------------------------------------------------------ */
/* Apparence                                                           */
/* ------------------------------------------------------------------ */

export const FORMES = ["ROND", "CARRE", "HEXAGONE", "BOUCLIER", "ETOILE", "DIAMANT"] as const;
export const MATIERES = ["BRONZE", "ARGENT", "OR", "PLATINE", "DIAMANT"] as const;
export const RARETES = ["COMMUN", "RARE", "EPIQUE", "LEGENDAIRE", "MYTHIQUE"] as const;
export const EFFETS = ["AUCUN", "BRILLANCE", "FLAMME", "ELECTRICITE", "NATURE", "GIVRE", "COSMOS"] as const;

export type Forme = (typeof FORMES)[number];
export type Matiere = (typeof MATIERES)[number];
export type Rarete = (typeof RARETES)[number];
export type Effet = (typeof EFFETS)[number];

export const LIBELLES = {
  forme: { ROND: "Rond", CARRE: "Carré", HEXAGONE: "Hexagone", BOUCLIER: "Bouclier", ETOILE: "Étoile", DIAMANT: "Losange" },
  matiere: { BRONZE: "Bronze", ARGENT: "Argent", OR: "Or", PLATINE: "Platine", DIAMANT: "Diamant" },
  rarete: { COMMUN: "Commun", RARE: "Rare", EPIQUE: "Épique", LEGENDAIRE: "Légendaire", MYTHIQUE: "Mythique" },
  effet: { AUCUN: "Aucun", BRILLANCE: "Brillance", FLAMME: "Flamme", ELECTRICITE: "Électricité", NATURE: "Nature", GIVRE: "Givre", COSMOS: "Cosmos" },
} as const;

/** Effet suggéré par défaut pour une rareté — l'éditeur le propose. */
export function effetSuggere(rarete: Rarete): Effet {
  return ({ COMMUN: "AUCUN", RARE: "BRILLANCE", EPIQUE: "ELECTRICITE", LEGENDAIRE: "FLAMME", MYTHIQUE: "COSMOS" } as const)[rarete];
}
