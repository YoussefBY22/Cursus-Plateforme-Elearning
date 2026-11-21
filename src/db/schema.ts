/**
 * Schéma Cursus — PostgreSQL via Drizzle ORM.
 *
 * Conventions :
 *  - identifiants texte aléatoires (`nouvelId`) : stables, non devinables, sûrs
 *    à exposer à un système tiers (pas d'entier séquentiel qui trahit les volumes) ;
 *  - noms en français, comme le domaine et le code ;
 *  - données de forme variable (canevas, options de question, segments vus)
 *    en `jsonb` → interrogeable et indexable ;
 *  - rien ne se supprime vraiment pour ce qui fait foi (certificats révoqués,
 *    formations archivées, commentaires masqués).
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nouvelId } from "../lib/ids";
import type { Canevas } from "../services/canevas/canevas";

const id = () => text("id").primaryKey().$defaultFn(nouvelId);
const horodatage = (nom: string) => timestamp(nom, { withTimezone: true, mode: "date" });
const creeLe = () => horodatage("cree_le").notNull().defaultNow();
const majLe = () =>
  horodatage("maj_le")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Énumérations                                                        */
/* ------------------------------------------------------------------ */

export const statutRattachement = pgEnum("statut_rattachement", ["EN_ATTENTE", "VALIDE", "REFUSE"]);
export const statutContenu = pgEnum("statut_contenu", [
  "BROUILLON",
  "EN_VALIDATION",
  "PUBLIE",
  "REFUSE",
  "ARCHIVE",
]);
export const niveauFormation = pgEnum("niveau_formation", ["DEBUTANT", "INTERMEDIAIRE", "AVANCE"]);
export const typeQuiz = pgEnum("type_quiz", ["INTEGRE", "FINAL"]);
export const typeQuestion = pgEnum("type_question", ["CHOIX_UNIQUE", "CHOIX_MULTIPLE", "VRAI_FAUX"]);
export const statutProgression = pgEnum("statut_progression", ["EN_COURS", "ENQUETE_REQUISE", "TERMINEE"]);
export const typeEnquete = pgEnum("type_enquete", ["CHAUD", "FROID"]);
export const statutSignalement = pgEnum("statut_signalement", ["OUVERT", "MASQUE", "REJETE"]);
export const contexteAutoEvaluation = pgEnum("contexte_auto_evaluation", ["INITIALE", "FINALE", "LIBRE"]);
export const statutDemande = pgEnum("statut_demande", ["OUVERTE", "PLANIFIEE", "SATISFAITE", "REFUSEE"]);

/* ------------------------------------------------------------------ */
/* Organisation et comptes                                             */
/* ------------------------------------------------------------------ */

export const juniorEntreprises = pgTable("junior_entreprise", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nom: text("nom").notNull(),
  sigle: text("sigle"),
  ville: text("ville"),
  ecole: text("ecole"),
  couleur: text("couleur").notNull().default("#0f1226"),
  logoUrl: text("logo_url"),
  active: boolean("active").notNull().default(true),
  /** Chargé de suivi de la plateforme qui suit cette organisation (facultatif). */
  chargeSuiviId: text("charge_suivi_id"),
  creeLe: creeLe(),
});

export type Reseaux = { instagram?: string; facebook?: string; github?: string; site?: string; x?: string };

export const utilisateurs = pgTable(
  "utilisateur",
  {
    id: id(),
    email: text("email").notNull().unique(),
    motDePasseHash: text("mot_de_passe_hash"),
    googleId: text("google_id").unique(),
    prenom: text("prenom").notNull(),
    nom: text("nom").notNull(),
    photoUrl: text("photo_url"),
    /** Rôles cumulables : MEMBRE, FORMATEUR, RESP_RH, RESP_PEDAGO, SUPER_ADMIN. */
    roles: text("roles").array().notNull().default(sql`ARRAY['MEMBRE']::text[]`),
    actif: boolean("actif").notNull().default(true),
    emailVerifieLe: horodatage("email_verifie_le"),
    jeId: text("je_id").references(() => juniorEntreprises.id),
    rattachement: statutRattachement("rattachement").notNull().default("EN_ATTENTE"),
    poste: text("poste"),
    departement: text("departement"),
    bio: text("bio"),
    linkedin: text("linkedin"),
    reseaux: jsonb("reseaux").$type<Reseaux>().notNull().default({}),
    /** Numéro international, pour le bouton WhatsApp des formateurs. */
    whatsapp: text("whatsapp"),
    visibleAnnuaire: boolean("visible_annuaire").notNull().default(true),
    masquerStats: boolean("masquer_stats").notNull().default(false),
    xp: integer("xp").notNull().default(0),
    /** Temps actif cumulé (secondes), alimenté par battements de l'onglet visible. */
    tempsActifSec: integer("temps_actif_sec").notNull().default(0),
    dernierBattement: horodatage("dernier_battement"),
    dernierAcces: horodatage("dernier_acces"),
    creeLe: creeLe(),
    majLe: majLe(),
  },
  (t) => [index("utilisateur_je_idx").on(t.jeId)]
);

/** Frise chronologique « parcours » des profils (formateurs surtout). */
export const etapesHistoriqueJE = pgTable(
  "etape_historique_je",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    annee: integer("annee").notNull(),
    anneeFin: integer("annee_fin"),
    poste: text("poste").notNull(),
    organisation: text("organisation").notNull(),
    description: text("description"),
  },
  (t) => [index("historique_je_utilisateur_idx").on(t.utilisateurId)]
);

export const jetonsVerification = pgTable("jeton_verification", {
  id: id(),
  utilisateurId: text("utilisateur_id")
    .notNull()
    .references(() => utilisateurs.id, { onDelete: "cascade" }),
  /** SHA-256 du jeton envoyé par e-mail : la base ne contient jamais le jeton. */
  empreinte: text("empreinte").notNull().unique(),
  type: text("type").notNull().default("EMAIL"),
  expireLe: horodatage("expire_le").notNull(),
  utiliseLe: horodatage("utilise_le"),
  creeLe: creeLe(),
});

/* ------------------------------------------------------------------ */
/* Référentiel de compétences                                          */
/* ------------------------------------------------------------------ */

/** Domaine = département d'une organisation = catégorie de formation = axe du radar. */
export const domaines = pgTable("domaine", {
  id: id(),
  code: text("code").notNull().unique(),
  nom: text("nom").notNull(),
  description: text("description"),
  couleur: text("couleur").notNull(),
  icone: text("icone").notNull().default("Sparkles"),
  ordre: integer("ordre").notNull().default(0),
});

/**
 * Compétence du référentiel. `jeId` nul = référentiel commun ;
 * renseigné = version adaptée par une organisation (`sourceId` pointe alors vers la
 * compétence commune d'origine, ce qui garde les mesures comparables).
 */
export const competences = pgTable(
  "competence",
  {
    id: id(),
    code: text("code").notNull(),
    nom: text("nom").notNull(),
    description: text("description"),
    /** Question posée à l'auto-évaluation (sinon dérivée du nom). */
    question: text("question"),
    pistes: text("pistes"),
    domaineId: text("domaine_id")
      .notNull()
      .references(() => domaines.id),
    jeId: text("je_id").references(() => juniorEntreprises.id),
    sourceId: text("source_id"),
    ordre: integer("ordre").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    unique("competence_code_je_uq").on(t.code, t.jeId).nullsNotDistinct(),
    index("competence_domaine_idx").on(t.domaineId),
  ]
);

export const autoEvaluations = pgTable(
  "auto_evaluation",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    domaineId: text("domaine_id")
      .notNull()
      .references(() => domaines.id),
    contexte: contexteAutoEvaluation("contexte").notNull().default("INITIALE"),
    formationId: text("formation_id"),
    participationExterneId: text("participation_externe_id"),
    secondesParQuestion: integer("secondes_par_question").notNull().default(10),
    demarreeLe: horodatage("demarree_le").notNull().defaultNow(),
    termineeLe: horodatage("terminee_le"),
  },
  (t) => [index("auto_eval_utilisateur_domaine_idx").on(t.utilisateurId, t.domaineId)]
);

export const reponsesAutoEvaluation = pgTable(
  "reponse_auto_evaluation",
  {
    id: id(),
    autoEvaluationId: text("auto_evaluation_id")
      .notNull()
      .references(() => autoEvaluations.id, { onDelete: "cascade" }),
    competenceId: text("competence_id")
      .notNull()
      .references(() => competences.id),
    /** 1 à 10 ; nul = « Je ne connais pas » ou temps écoulé. */
    valeur: integer("valeur"),
    inconnu: boolean("inconnu").notNull().default(false),
    expire: boolean("expire").notNull().default(false),
    dureeMs: integer("duree_ms").notNull().default(0),
  },
  (t) => [uniqueIndex("reponse_auto_eval_uq").on(t.autoEvaluationId, t.competenceId)]
);

/** Niveau courant d'un membre sur une compétence (0–99, échelle « FIFA »). */
export const niveauxCompetence = pgTable(
  "niveau_competence",
  {
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    competenceId: text("competence_id")
      .notNull()
      .references(() => competences.id),
    niveau: doublePrecision("niveau").notNull(),
    /** Niveau de la seule auto-évaluation initiale, gardé pour mesurer la progression. */
    niveauInitial: doublePrecision("niveau_initial").notNull(),
    majLe: majLe(),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.competenceId] })]
);

export const historiqueNiveaux = pgTable(
  "historique_niveau",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    competenceId: text("competence_id")
      .notNull()
      .references(() => competences.id),
    niveau: doublePrecision("niveau").notNull(),
    variation: doublePrecision("variation").notNull().default(0),
    /** AUTOEVAL | FORMATION | CONSOLIDATION | EXTERNE */
    source: text("source").notNull(),
    refId: text("ref_id"),
    libelle: text("libelle"),
    creeLe: creeLe(),
  },
  (t) => [index("historique_niveau_idx").on(t.utilisateurId, t.competenceId, t.creeLe)]
);

export type DetailGain = {
  quiz: number | null;
  formateur: number | null;
  reevaluation: number | null;
  reevaluationPlafonnee: boolean;
  poids: { quiz: number; formateur: number; reevaluation: number };
  sansMesureObjective: boolean;
};

/**
 * Gain calculé pour une formation (Cursus ou externe) et une compétence.
 * Une part reste provisoire jusqu'à l'évaluation à froid (voir DECISIONS.md).
 */
export const gainsFormation = pgTable(
  "gain_formation",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    competenceId: text("competence_id")
      .notNull()
      .references(() => competences.id),
    formationId: text("formation_id"),
    formationExterneId: text("formation_externe_id"),
    niveauAvant: doublePrecision("niveau_avant").notNull(),
    niveauObserve: doublePrecision("niveau_observe").notNull(),
    gainTotal: doublePrecision("gain_total").notNull(),
    gainApplique: doublePrecision("gain_applique").notNull(),
    gainEnAttente: doublePrecision("gain_en_attente").notNull(),
    detail: jsonb("detail").$type<DetailGain>().notNull(),
    consolideLe: horodatage("consolide_le"),
    creeLe: creeLe(),
  },
  (t) => [
    uniqueIndex("gain_formation_uq").on(t.utilisateurId, t.competenceId, t.formationId),
    uniqueIndex("gain_externe_uq").on(t.utilisateurId, t.competenceId, t.formationExterneId),
  ]
);

/* ------------------------------------------------------------------ */
/* Contenus                                                            */
/* ------------------------------------------------------------------ */

export const formations = pgTable(
  "formation",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    titre: text("titre").notNull(),
    resume: text("resume").notNull(),
    description: text("description").notNull(),
    objectifs: text("objectifs").array().notNull().default(sql`ARRAY[]::text[]`),
    domaineId: text("domaine_id")
      .notNull()
      .references(() => domaines.id),
    niveau: niveauFormation("niveau").notNull().default("DEBUTANT"),
    imageUrl: text("image_url"),
    /** YOUTUBE | MP4 (voir src/components/video/fournisseurs) */
    fournisseurVideo: text("fournisseur_video").notNull().default("YOUTUBE"),
    referenceVideo: text("reference_video").notNull(),
    dureeSec: integer("duree_sec").notNull(),
    auteurId: text("auteur_id")
      .notNull()
      .references(() => utilisateurs.id),
    formateurId: text("formateur_id").references(() => utilisateurs.id),
    statut: statutContenu("statut").notNull().default("BROUILLON"),
    /** Faux pour les capsules courtes créées dans un parcours : hors catalogue. */
    visibleCatalogue: boolean("visible_catalogue").notNull().default(true),
    motifRefus: text("motif_refus"),
    soumisLe: horodatage("soumis_le"),
    publieLe: horodatage("publie_le"),
    valideParId: text("valide_par_id"),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    creeLe: creeLe(),
    majLe: majLe(),
  },
  (t) => [index("formation_statut_domaine_idx").on(t.statut, t.domaineId)]
);

export const formationsCompetences = pgTable(
  "formation_competence",
  {
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id, { onDelete: "cascade" }),
    competenceId: text("competence_id")
      .notNull()
      .references(() => competences.id),
    /** Importance relative de la compétence dans la formation (1 à 3). */
    poids: integer("poids").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.formationId, t.competenceId] })]
);

export const pointsQuiz = pgTable(
  "point_quiz",
  {
    id: id(),
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id, { onDelete: "cascade" }),
    type: typeQuiz("type").notNull().default("INTEGRE"),
    /** Seconde de déclenchement ; nulle pour le quiz final. */
    tempsSec: integer("temps_sec"),
    titre: text("titre").notNull(),
  },
  (t) => [index("point_quiz_formation_idx").on(t.formationId)]
);

export type OptionQuestionDb = { id: string; texte: string; correcte: boolean };

export const questions = pgTable("question", {
  id: id(),
  pointQuizId: text("point_quiz_id")
    .notNull()
    .references(() => pointsQuiz.id, { onDelete: "cascade" }),
  type: typeQuestion("type").notNull().default("CHOIX_UNIQUE"),
  enonce: text("enonce").notNull(),
  options: jsonb("options").$type<OptionQuestionDb[]>().notNull(),
  explication: text("explication"),
  competenceId: text("competence_id").references(() => competences.id),
  ordre: integer("ordre").notNull().default(0),
});

export const progressions = pgTable(
  "progression",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id),
    positionSec: doublePrecision("position_sec").notNull().default(0),
    /** Intervalles réellement regardés, fusionnés : [[début, fin], …] */
    segments: jsonb("segments").$type<[number, number][]>().notNull().default([]),
    secondesVues: doublePrecision("secondes_vues").notNull().default(0),
    sauts: integer("sauts").notNull().default(0),
    /** Point de quiz ouvert au moment de la pause : on y revient à la reprise. */
    quizEnCoursId: text("quiz_en_cours_id"),
    seuilAtteint: boolean("seuil_atteint").notNull().default(false),
    statut: statutProgression("statut").notNull().default("EN_COURS"),
    demarreeLe: horodatage("demarree_le").notNull().defaultNow(),
    derniereSyncLe: horodatage("derniere_sync_le").notNull().defaultNow(),
    termineeLe: horodatage("terminee_le"),
    relanceFroidLe: horodatage("relance_froid_le"),
  },
  (t) => [uniqueIndex("progression_uq").on(t.utilisateurId, t.formationId)]
);

export const tentativesQuiz = pgTable(
  "tentative_quiz",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    pointQuizId: text("point_quiz_id")
      .notNull()
      .references(() => pointsQuiz.id, { onDelete: "cascade" }),
    /** { [questionId]: string[] } */
    reponses: jsonb("reponses").$type<Record<string, string[]>>().notNull(),
    score: doublePrecision("score").notNull(),
    reussi: boolean("reussi").notNull(),
    numero: integer("numero").notNull().default(1),
    creeLe: creeLe(),
  },
  (t) => [index("tentative_quiz_idx").on(t.utilisateurId, t.pointQuizId)]
);

export const enquetes = pgTable(
  "enquete",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id),
    type: typeEnquete("type").notNull(),
    noteContenu: integer("note_contenu").notNull(),
    noteFormateur: integer("note_formateur").notNull(),
    /** 0–10, base du NPS. */
    recommandation: integer("recommandation").notNull(),
    /** À chaud : clarté ; à froid : mise en pratique (1–5). */
    noteSpecifique: integer("note_specifique").notNull(),
    /** Réévaluation finale à chaud : { [competenceId]: 1..10 | null } */
    reevaluation: jsonb("reevaluation").$type<Record<string, number | null>>().notNull().default({}),
    commentaire: text("commentaire"),
    creeLe: creeLe(),
  },
  (t) => [uniqueIndex("enquete_uq").on(t.utilisateurId, t.formationId, t.type)]
);

export const notations = pgTable(
  "notation",
  {
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id, { onDelete: "cascade" }),
    /** 1 à 5 par pas de 0,25. */
    note: doublePrecision("note").notNull(),
    majLe: majLe(),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.formationId] })]
);

export const commentaires = pgTable(
  "commentaire",
  {
    id: id(),
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id, { onDelete: "cascade" }),
    auteurId: text("auteur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    texte: text("texte").notNull(),
    masque: boolean("masque").notNull().default(false),
    creeLe: creeLe(),
  },
  (t) => [index("commentaire_formation_idx").on(t.formationId, t.creeLe)]
);

export const likesCommentaire = pgTable(
  "like_commentaire",
  {
    commentaireId: text("commentaire_id")
      .notNull()
      .references(() => commentaires.id, { onDelete: "cascade" }),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    creeLe: creeLe(),
  },
  (t) => [primaryKey({ columns: [t.commentaireId, t.utilisateurId] })]
);

export const signalements = pgTable(
  "signalement",
  {
    id: id(),
    commentaireId: text("commentaire_id")
      .notNull()
      .references(() => commentaires.id, { onDelete: "cascade" }),
    auteurId: text("auteur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    motif: text("motif").notNull(),
    details: text("details"),
    statut: statutSignalement("statut").notNull().default("OUVERT"),
    traiteParId: text("traite_par_id").references(() => utilisateurs.id),
    traiteLe: horodatage("traite_le"),
    creeLe: creeLe(),
  },
  (t) => [uniqueIndex("signalement_uq").on(t.commentaireId, t.auteurId)]
);

/* ------------------------------------------------------------------ */
/* Parcours certifiants                                                */
/* ------------------------------------------------------------------ */

export const parcours = pgTable("parcours", {
  id: id(),
  slug: text("slug").notNull().unique(),
  titre: text("titre").notNull(),
  sousTitre: text("sous_titre"),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  domaineId: text("domaine_id")
    .notNull()
    .references(() => domaines.id),
  auteurId: text("auteur_id")
    .notNull()
    .references(() => utilisateurs.id),
  statut: statutContenu("statut").notNull().default("BROUILLON"),
  motifRefus: text("motif_refus"),
  soumisLe: horodatage("soumis_le"),
  publieLe: horodatage("publie_le"),
  valideParId: text("valide_par_id"),
  modeleCertificatId: text("modele_certificat_id").references(() => modelesCertificat.id),
  /** Texte du certificat, peut contenir {{apprenant}}, {{parcours}}… */
  intituleCertificat: text("intitule_certificat"),
  creeLe: creeLe(),
  majLe: majLe(),
});

export const etapesParcours = pgTable(
  "etape_parcours",
  {
    id: id(),
    parcoursId: text("parcours_id")
      .notNull()
      .references(() => parcours.id, { onDelete: "cascade" }),
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id),
    ordre: integer("ordre").notNull(),
    titre: text("titre"),
  },
  (t) => [uniqueIndex("etape_parcours_uq").on(t.parcoursId, t.ordre)]
);

export const inscriptionsParcours = pgTable(
  "inscription_parcours",
  {
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    parcoursId: text("parcours_id")
      .notNull()
      .references(() => parcours.id, { onDelete: "cascade" }),
    demarreLe: horodatage("demarre_le").notNull().defaultNow(),
    termineLe: horodatage("termine_le"),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.parcoursId] })]
);

/* ------------------------------------------------------------------ */
/* Certificats                                                         */
/* ------------------------------------------------------------------ */

export const modelesCertificat = pgTable("modele_certificat", {
  id: id(),
  nom: text("nom").notNull(),
  domaineId: text("domaine_id").references(() => domaines.id),
  /** Couleur de bordure propre à la thématique (« marketing bleu, RSE vert »). */
  couleurTheme: text("couleur_theme").notNull().default("#4f46e5"),
  /** Canevas de l'éditeur (blocs en mm, voir src/services/canevas). */
  canevas: jsonb("canevas").$type<Canevas>().notNull(),
  parDefaut: boolean("par_defaut").notNull().default(false),
  /** Fichiers déposés pour ce modèle (logos, signatures), identifiants du stockage. */
  images: jsonb("images").$type<{ fichierId: string; nom: string; type: "png" | "jpeg" }[]>().notNull().default([]),
  archive: boolean("archive").notNull().default(false),
  creeLe: creeLe(),
  majLe: majLe(),
});

export type DonneesCertificat = {
  apprenant: string;
  parcours: string;
  domaine: string;
  je: string;
  dateObtention: string;
  heures: string;
  numero: string;
  intitule: string;
  signataire1: string;
  signataire2: string;
};

export const certificats = pgTable(
  "certificat",
  {
    id: id(),
    /** Numéro lisible, imprimé : CUR-2026-000042. */
    numero: text("numero").notNull().unique(),
    /** Jeton de vérification (256 bits, base64url) porté par le QR code. */
    jeton: text("jeton").notNull().unique(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id),
    parcoursId: text("parcours_id")
      .notNull()
      .references(() => parcours.id),
    modeleId: text("modele_id")
      .notNull()
      .references(() => modelesCertificat.id),
    /** Instantané figé à l'émission : un renommage ultérieur ne réécrit pas l'histoire. */
    donnees: jsonb("donnees").$type<DonneesCertificat>().notNull(),
    canevas: jsonb("canevas").$type<Canevas>().notNull(),
    couleurTheme: text("couleur_theme").notNull(),
    emisLe: horodatage("emis_le").notNull().defaultNow(),
    revoqueLe: horodatage("revoque_le"),
    motifRevocation: text("motif_revocation"),
    revoqueParId: text("revoque_par_id"),
    consultations: integer("consultations").notNull().default(0),
  },
  (t) => [uniqueIndex("certificat_uq").on(t.utilisateurId, t.parcoursId)]
);

/* ------------------------------------------------------------------ */
/* Gamification                                                        */
/* ------------------------------------------------------------------ */

/**
 * Liste des critères de déblocage proposée dans l'éditeur de badges.
 * Le calcul de chaque code vit dans src/services/badges.ts.
 */
export const criteresBadge = pgTable("critere_badge", {
  code: text("code").primaryKey(),
  libelle: text("libelle").notNull(),
  description: text("description").notNull(),
  unite: text("unite").notNull(),
  /** DOMAINE | PARCOURS | AUCUN — paramètre complémentaire attendu. */
  parametre: text("parametre").notNull().default("AUCUN"),
  ordre: integer("ordre").notNull().default(0),
});

export const badges = pgTable("badge", {
  id: id(),
  code: text("code").notNull().unique(),
  nom: text("nom").notNull(),
  description: text("description").notNull(),
  couleur: text("couleur").notNull(),
  /** ROND | CARRE | HEXAGONE | BOUCLIER | ETOILE | DIAMANT */
  forme: text("forme").notNull().default("ROND"),
  /** BRONZE | ARGENT | OR | PLATINE | DIAMANT */
  matiere: text("matiere").notNull().default("BRONZE"),
  /** COMMUN | RARE | EPIQUE | LEGENDAIRE | MYTHIQUE */
  rarete: text("rarete").notNull().default("COMMUN"),
  /** AUCUN | BRILLANCE | FLAMME | ELECTRICITE | NATURE | GIVRE | COSMOS */
  effet: text("effet").notNull().default("AUCUN"),
  icone: text("icone").notNull().default("Award"),
  critereCode: text("critere_code")
    .notNull()
    .references(() => criteresBadge.code),
  seuil: doublePrecision("seuil").notNull().default(1),
  /** Identifiant de domaine ou de parcours si le critère l'exige. */
  parametre: text("parametre"),
  xpBonus: integer("xp_bonus").notNull().default(0),
  secret: boolean("secret").notNull().default(false),
  actif: boolean("actif").notNull().default(true),
  ordre: integer("ordre").notNull().default(0),
  creeLe: creeLe(),
});

export const badgesObtenus = pgTable(
  "badge_obtenu",
  {
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    obtenuLe: horodatage("obtenu_le").notNull().defaultNow(),
    /** La célébration a-t-elle été montrée ? */
    celebre: boolean("celebre").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.badgeId] })]
);

/**
 * Chaque gain d'XP est un événement unique (type + référence) : impossible
 * de gagner deux fois les points d'un même quiz ou d'une même formation.
 */
export const evenementsXp = pgTable(
  "evenement_xp",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    refId: text("ref_id").notNull(),
    points: integer("points").notNull(),
    libelle: text("libelle").notNull(),
    creeLe: creeLe(),
  },
  (t) => [uniqueIndex("evenement_xp_uq").on(t.utilisateurId, t.type, t.refId)]
);

/** Un jour d'activité par membre : séries, heatmap, badges de régularité. */
export const activitesJour = pgTable(
  "activite_jour",
  {
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    jour: date("jour", { mode: "string" }).notNull(),
    secondes: integer("secondes").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.jour] })]
);

export const notifications = pgTable(
  "notification",
  {
    id: id(),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    titre: text("titre").notNull(),
    message: text("message").notNull(),
    lien: text("lien"),
    donnees: jsonb("donnees").$type<Record<string, unknown>>().notNull().default({}),
    lue: boolean("lue").notNull().default(false),
    cleIdempotence: text("cle_idempotence").unique(),
    creeLe: creeLe(),
  },
  (t) => [index("notification_idx").on(t.utilisateurId, t.lue, t.creeLe)]
);

/* ------------------------------------------------------------------ */
/* Formations externes (saisies par le responsable RH d'une organisation)        */
/* ------------------------------------------------------------------ */

export const formationsExternes = pgTable("formation_externe", {
  id: id(),
  jeId: text("je_id")
    .notNull()
    .references(() => juniorEntreprises.id),
  domaineId: text("domaine_id")
    .notNull()
    .references(() => domaines.id),
  titre: text("titre").notNull(),
  description: text("description"),
  formateurInterne: text("formateur_interne").notNull(),
  date: horodatage("date").notNull(),
  dureeHeures: doublePrecision("duree_heures").notNull().default(2),
  creeParId: text("cree_par_id").notNull(),
  /** OUVERTE (mesures en cours) | CLOTUREE (gains calculés) */
  statut: text("statut").notNull().default("OUVERTE"),
  creeLe: creeLe(),
});

export const formationsExternesCompetences = pgTable(
  "formation_externe_competence",
  {
    formationExterneId: text("formation_externe_id")
      .notNull()
      .references(() => formationsExternes.id, { onDelete: "cascade" }),
    competenceId: text("competence_id")
      .notNull()
      .references(() => competences.id),
  },
  (t) => [primaryKey({ columns: [t.formationExterneId, t.competenceId] })]
);

export const participationsExternes = pgTable(
  "participation_externe",
  {
    id: id(),
    formationExterneId: text("formation_externe_id")
      .notNull()
      .references(() => formationsExternes.id, { onDelete: "cascade" }),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    /** Évaluation du membre par le formateur interne : { [competenceId]: 1..10 } */
    evaluationFormateur: jsonb("evaluation_formateur").$type<Record<string, number>>().notNull().default({}),
    /** Score d'un éventuel test interne (0–100), facultatif. */
    scoreTest: doublePrecision("score_test"),
    autoEvalInitialeId: text("auto_eval_initiale_id"),
    autoEvalFinaleId: text("auto_eval_finale_id"),
    calculeLe: horodatage("calcule_le"),
  },
  (t) => [uniqueIndex("participation_externe_uq").on(t.formationExterneId, t.utilisateurId)]
);

/* ------------------------------------------------------------------ */
/* Plateforme                                                          */
/* ------------------------------------------------------------------ */

export const parametres = pgTable("parametre", {
  cle: text("cle").primaryKey(),
  valeur: jsonb("valeur").notNull(),
  majLe: majLe(),
});

/**
 * Fichiers déposés (photos, images de formation, logos de certificat).
 * Le contenu vit dans le pilote de stockage (`services/stockage.ts`) ;
 * en base, seulement la fiche. Le pilote « base » range les octets ici.
 */
export const fichiers = pgTable("fichier", {
  id: id(),
  nom: text("nom").notNull(),
  type: text("type").notNull(),
  taille: integer("taille").notNull(),
  /** Pilote « local » : chemin relatif ; pilote « base » : vide. */
  chemin: text("chemin"),
  /** Pilote « base » : contenu encodé en base64 (fichiers < 2 Mo). */
  contenu: text("contenu"),
  creeParId: text("cree_par_id"),
  creeLe: creeLe(),
});

export const journal = pgTable(
  "journal",
  {
    id: id(),
    acteurId: text("acteur_id").references(() => utilisateurs.id),
    action: text("action").notNull(),
    entite: text("entite").notNull(),
    entiteId: text("entite_id"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    creeLe: creeLe(),
  },
  (t) => [index("journal_entite_idx").on(t.entite, t.entiteId)]
);

/* ------------------------------------------------------------------ */
/* Suivi des organisations et demandes de formation                               */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une organisation réclame comme formation.
 *
 * C'est le seul endroit où le besoin remonte du terrain vers la
 * Plateforme : un membre décrit un sujet qui lui manque, les autres
 * votent, et le équipe pédagogique arbitre une offre fondée sur
 * la demande réelle plutôt que sur l'intuition.
 */
export const demandesFormation = pgTable(
  "demande_formation",
  {
    id: id(),
    titre: text("titre").notNull(),
    description: text("description").notNull(),
    domaineId: text("domaine_id").references(() => domaines.id),
    demandeurId: text("demandeur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    /** organisation du demandeur au moment de la demande : fige la portée même s'il change d'organisation. */
    jeId: text("je_id").references(() => juniorEntreprises.id),
    statut: statutDemande("statut").notNull().default("OUVERTE"),
    /** Réponse de l'équipe pédagogique, obligatoire pour refuser ou planifier. */
    reponse: text("reponse"),
    /** Formation publiée qui satisfait la demande, s'il y en a une. */
    formationId: text("formation_id").references(() => formations.id),
    traiteParId: text("traite_par_id").references(() => utilisateurs.id),
    traiteLe: horodatage("traite_le"),
    creeLe: creeLe(),
    majLe: majLe(),
  },
  (t) => [index("demande_formation_statut_idx").on(t.statut, t.domaineId)]
);

/** Un vote par membre et par demande : le compte fait le classement. */
export const votesDemandeFormation = pgTable(
  "vote_demande_formation",
  {
    demandeId: text("demande_id")
      .notNull()
      .references(() => demandesFormation.id, { onDelete: "cascade" }),
    utilisateurId: text("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    creeLe: creeLe(),
  },
  (t) => [primaryKey({ columns: [t.demandeId, t.utilisateurId] })]
);

/**
 * Carnet de suivi d'une organisation, tenu par son chargé de suivi.
 *
 * Les chiffres disent qu'une organisation ralentit ; ils ne disent pas pourquoi. Ces
 * notes datées gardent la mémoire des échanges — passation de bureau,
 * période d'examens, relance faite — pour que le suivi survive au
 * changement de mandat.
 */
export const notesSuivi = pgTable(
  "note_suivi",
  {
    id: id(),
    jeId: text("je_id")
      .notNull()
      .references(() => juniorEntreprises.id, { onDelete: "cascade" }),
    auteurId: text("auteur_id")
      .notNull()
      .references(() => utilisateurs.id),
    contenu: text("contenu").notNull(),
    creeLe: creeLe(),
  },
  (t) => [index("note_suivi_je_idx").on(t.jeId, t.creeLe)]
);

/* ------------------------------------------------------------------ */
/* Relations (API de requêtes relationnelles de Drizzle)               */
/* ------------------------------------------------------------------ */

export const demandesFormationRelations = relations(demandesFormation, ({ one, many }) => ({
  demandeur: one(utilisateurs, { fields: [demandesFormation.demandeurId], references: [utilisateurs.id] }),
  je: one(juniorEntreprises, { fields: [demandesFormation.jeId], references: [juniorEntreprises.id] }),
  domaine: one(domaines, { fields: [demandesFormation.domaineId], references: [domaines.id] }),
  formation: one(formations, { fields: [demandesFormation.formationId], references: [formations.id] }),
  votes: many(votesDemandeFormation),
}));

export const votesDemandeFormationRelations = relations(votesDemandeFormation, ({ one }) => ({
  demande: one(demandesFormation, {
    fields: [votesDemandeFormation.demandeId],
    references: [demandesFormation.id],
  }),
  utilisateur: one(utilisateurs, {
    fields: [votesDemandeFormation.utilisateurId],
    references: [utilisateurs.id],
  }),
}));

export const notesSuiviRelations = relations(notesSuivi, ({ one }) => ({
  je: one(juniorEntreprises, { fields: [notesSuivi.jeId], references: [juniorEntreprises.id] }),
  auteur: one(utilisateurs, { fields: [notesSuivi.auteurId], references: [utilisateurs.id] }),
}));

export const juniorEntreprisesRelations = relations(juniorEntreprises, ({ many }) => ({
  membres: many(utilisateurs),
  competences: many(competences),
  formationsExternes: many(formationsExternes),
}));

export const utilisateursRelations = relations(utilisateurs, ({ one, many }) => ({
  je: one(juniorEntreprises, { fields: [utilisateurs.jeId], references: [juniorEntreprises.id] }),
  historiqueJE: many(etapesHistoriqueJE),
  formationsAnimees: many(formations, { relationName: "formateur" }),
  formationsCreees: many(formations, { relationName: "auteur" }),
  progressions: many(progressions),
  badges: many(badgesObtenus),
  niveaux: many(niveauxCompetence),
  certificats: many(certificats),
}));

export const etapesHistoriqueJERelations = relations(etapesHistoriqueJE, ({ one }) => ({
  utilisateur: one(utilisateurs, { fields: [etapesHistoriqueJE.utilisateurId], references: [utilisateurs.id] }),
}));

export const domainesRelations = relations(domaines, ({ many }) => ({
  competences: many(competences),
  formations: many(formations),
  parcours: many(parcours),
}));

export const competencesRelations = relations(competences, ({ one, many }) => ({
  domaine: one(domaines, { fields: [competences.domaineId], references: [domaines.id] }),
  je: one(juniorEntreprises, { fields: [competences.jeId], references: [juniorEntreprises.id] }),
  formations: many(formationsCompetences),
}));

export const autoEvaluationsRelations = relations(autoEvaluations, ({ one, many }) => ({
  utilisateur: one(utilisateurs, { fields: [autoEvaluations.utilisateurId], references: [utilisateurs.id] }),
  domaine: one(domaines, { fields: [autoEvaluations.domaineId], references: [domaines.id] }),
  reponses: many(reponsesAutoEvaluation),
}));

export const reponsesAutoEvaluationRelations = relations(reponsesAutoEvaluation, ({ one }) => ({
  autoEvaluation: one(autoEvaluations, {
    fields: [reponsesAutoEvaluation.autoEvaluationId],
    references: [autoEvaluations.id],
  }),
  competence: one(competences, { fields: [reponsesAutoEvaluation.competenceId], references: [competences.id] }),
}));

export const niveauxCompetenceRelations = relations(niveauxCompetence, ({ one }) => ({
  utilisateur: one(utilisateurs, { fields: [niveauxCompetence.utilisateurId], references: [utilisateurs.id] }),
  competence: one(competences, { fields: [niveauxCompetence.competenceId], references: [competences.id] }),
}));

export const formationsRelations = relations(formations, ({ one, many }) => ({
  domaine: one(domaines, { fields: [formations.domaineId], references: [domaines.id] }),
  auteur: one(utilisateurs, { fields: [formations.auteurId], references: [utilisateurs.id], relationName: "auteur" }),
  formateur: one(utilisateurs, {
    fields: [formations.formateurId],
    references: [utilisateurs.id],
    relationName: "formateur",
  }),
  competences: many(formationsCompetences),
  pointsQuiz: many(pointsQuiz),
  progressions: many(progressions),
  enquetes: many(enquetes),
  notations: many(notations),
  commentaires: many(commentaires),
  etapes: many(etapesParcours),
}));

export const formationsCompetencesRelations = relations(formationsCompetences, ({ one }) => ({
  formation: one(formations, { fields: [formationsCompetences.formationId], references: [formations.id] }),
  competence: one(competences, { fields: [formationsCompetences.competenceId], references: [competences.id] }),
}));

export const pointsQuizRelations = relations(pointsQuiz, ({ one, many }) => ({
  formation: one(formations, { fields: [pointsQuiz.formationId], references: [formations.id] }),
  questions: many(questions),
  tentatives: many(tentativesQuiz),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  pointQuiz: one(pointsQuiz, { fields: [questions.pointQuizId], references: [pointsQuiz.id] }),
  competence: one(competences, { fields: [questions.competenceId], references: [competences.id] }),
}));

export const progressionsRelations = relations(progressions, ({ one }) => ({
  utilisateur: one(utilisateurs, { fields: [progressions.utilisateurId], references: [utilisateurs.id] }),
  formation: one(formations, { fields: [progressions.formationId], references: [formations.id] }),
}));

export const tentativesQuizRelations = relations(tentativesQuiz, ({ one }) => ({
  pointQuiz: one(pointsQuiz, { fields: [tentativesQuiz.pointQuizId], references: [pointsQuiz.id] }),
  utilisateur: one(utilisateurs, { fields: [tentativesQuiz.utilisateurId], references: [utilisateurs.id] }),
}));

export const enquetesRelations = relations(enquetes, ({ one }) => ({
  utilisateur: one(utilisateurs, { fields: [enquetes.utilisateurId], references: [utilisateurs.id] }),
  formation: one(formations, { fields: [enquetes.formationId], references: [formations.id] }),
}));

export const notationsRelations = relations(notations, ({ one }) => ({
  formation: one(formations, { fields: [notations.formationId], references: [formations.id] }),
}));

export const commentairesRelations = relations(commentaires, ({ one, many }) => ({
  formation: one(formations, { fields: [commentaires.formationId], references: [formations.id] }),
  auteur: one(utilisateurs, { fields: [commentaires.auteurId], references: [utilisateurs.id] }),
  likes: many(likesCommentaire),
  signalements: many(signalements),
}));

export const likesCommentaireRelations = relations(likesCommentaire, ({ one }) => ({
  commentaire: one(commentaires, { fields: [likesCommentaire.commentaireId], references: [commentaires.id] }),
}));

export const signalementsRelations = relations(signalements, ({ one }) => ({
  commentaire: one(commentaires, { fields: [signalements.commentaireId], references: [commentaires.id] }),
  auteur: one(utilisateurs, { fields: [signalements.auteurId], references: [utilisateurs.id] }),
}));

export const parcoursRelations = relations(parcours, ({ one, many }) => ({
  domaine: one(domaines, { fields: [parcours.domaineId], references: [domaines.id] }),
  auteur: one(utilisateurs, { fields: [parcours.auteurId], references: [utilisateurs.id] }),
  modeleCertificat: one(modelesCertificat, {
    fields: [parcours.modeleCertificatId],
    references: [modelesCertificat.id],
  }),
  etapes: many(etapesParcours),
  inscriptions: many(inscriptionsParcours),
  certificats: many(certificats),
}));

export const etapesParcoursRelations = relations(etapesParcours, ({ one }) => ({
  parcours: one(parcours, { fields: [etapesParcours.parcoursId], references: [parcours.id] }),
  formation: one(formations, { fields: [etapesParcours.formationId], references: [formations.id] }),
}));

export const inscriptionsParcoursRelations = relations(inscriptionsParcours, ({ one }) => ({
  parcours: one(parcours, { fields: [inscriptionsParcours.parcoursId], references: [parcours.id] }),
  utilisateur: one(utilisateurs, { fields: [inscriptionsParcours.utilisateurId], references: [utilisateurs.id] }),
}));

export const modelesCertificatRelations = relations(modelesCertificat, ({ one, many }) => ({
  domaine: one(domaines, { fields: [modelesCertificat.domaineId], references: [domaines.id] }),
  certificats: many(certificats),
}));

export const certificatsRelations = relations(certificats, ({ one }) => ({
  utilisateur: one(utilisateurs, { fields: [certificats.utilisateurId], references: [utilisateurs.id] }),
  parcours: one(parcours, { fields: [certificats.parcoursId], references: [parcours.id] }),
  modele: one(modelesCertificat, { fields: [certificats.modeleId], references: [modelesCertificat.id] }),
}));

export const badgesRelations = relations(badges, ({ one, many }) => ({
  critere: one(criteresBadge, { fields: [badges.critereCode], references: [criteresBadge.code] }),
  obtentions: many(badgesObtenus),
}));

export const badgesObtenusRelations = relations(badgesObtenus, ({ one }) => ({
  badge: one(badges, { fields: [badgesObtenus.badgeId], references: [badges.id] }),
  utilisateur: one(utilisateurs, { fields: [badgesObtenus.utilisateurId], references: [utilisateurs.id] }),
}));

export const formationsExternesRelations = relations(formationsExternes, ({ one, many }) => ({
  je: one(juniorEntreprises, { fields: [formationsExternes.jeId], references: [juniorEntreprises.id] }),
  domaine: one(domaines, { fields: [formationsExternes.domaineId], references: [domaines.id] }),
  competences: many(formationsExternesCompetences),
  participants: many(participationsExternes),
}));

export const formationsExternesCompetencesRelations = relations(formationsExternesCompetences, ({ one }) => ({
  formationExterne: one(formationsExternes, {
    fields: [formationsExternesCompetences.formationExterneId],
    references: [formationsExternes.id],
  }),
  competence: one(competences, {
    fields: [formationsExternesCompetences.competenceId],
    references: [competences.id],
  }),
}));

export const participationsExternesRelations = relations(participationsExternes, ({ one }) => ({
  formationExterne: one(formationsExternes, {
    fields: [participationsExternes.formationExterneId],
    references: [formationsExternes.id],
  }),
  utilisateur: one(utilisateurs, { fields: [participationsExternes.utilisateurId], references: [utilisateurs.id] }),
}));

export const journalRelations = relations(journal, ({ one }) => ({
  acteur: one(utilisateurs, { fields: [journal.acteurId], references: [utilisateurs.id] }),
}));
