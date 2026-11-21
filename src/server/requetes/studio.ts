import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  competences,
  domaines,
  etapesParcours,
  formations,
  formationsCompetences,
  modelesCertificat,
  notations,
  parcours,
  pointsQuiz,
  progressions,
  questions,
  utilisateurs,
} from "@/db/schema";
import { lireParametres } from "@/server/parametres";
import type { Utilisateur } from "@/server/session";
import { circuitPour } from "@/services/validation";

/*
 * Lectures de l'espace formateur.
 *
 * Un formateur ne voit QUE ses contenus ici ; la vue d'ensemble de tous les
 * contenus est côté administration. Le responsable pédagogique et le super admin
 * peuvent ouvrir un contenu qui n'est pas le leur (lien « ouvrir dans le
 * studio » depuis l'écran de validation) : c'est `peutOuvrir` qui tranche.
 */

function peutOuvrir(u: Utilisateur, auteurId: string): boolean {
  return auteurId === u.id || u.roles.includes("SUPER_ADMIN") || u.roles.includes("RESP_PEDAGO");
}

/** Circuit de publication de l'auteur : publication directe ou validation. */
export async function circuitAuteur(u: Utilisateur) {
  const p = await lireParametres();
  return circuitPour(u.roles, {
    pedagoPeutCreer: p["contenu.pedagoPeutCreer"],
    pedagoValidationRequise: p["contenu.pedagoValidationRequise"],
  });
}

export type FormationStudio = {
  id: string;
  slug: string;
  titre: string;
  statut: string;
  motifRefus: string | null;
  domaine: string;
  couleur: string;
  dureeSec: number;
  visibleCatalogue: boolean;
  majLe: Date;
  inscrits: number;
  terminees: number;
  note: number | null;
  avis: number;
};

export type ParcoursStudio = {
  id: string;
  slug: string;
  titre: string;
  statut: string;
  motifRefus: string | null;
  domaine: string;
  couleur: string;
  etapes: number;
  majLe: Date;
};

/** Mes formations et mes parcours, les plus récemment touchés d'abord. */
export async function mesContenus(utilisateurId: string): Promise<{
  formations: FormationStudio[];
  parcours: ParcoursStudio[];
}> {
  const [lignes, chemins] = await Promise.all([
    db
      .select({
        id: formations.id,
        slug: formations.slug,
        titre: formations.titre,
        statut: formations.statut,
        motifRefus: formations.motifRefus,
        domaine: domaines.nom,
        couleur: domaines.couleur,
        dureeSec: formations.dureeSec,
        visibleCatalogue: formations.visibleCatalogue,
        majLe: formations.majLe,
        inscrits: sql<number>`count(distinct ${progressions.utilisateurId})`.mapWith(Number),
        terminees: sql<number>`count(distinct case when ${progressions.statut} = 'TERMINEE' then ${progressions.utilisateurId} end)`.mapWith(
          Number
        ),
        note: sql<number | null>`avg(${notations.note})`.mapWith((v) => (v === null ? null : Math.round(Number(v) * 10) / 10)),
        avis: sql<number>`count(distinct ${notations.utilisateurId})`.mapWith(Number),
      })
      .from(formations)
      .innerJoin(domaines, eq(domaines.id, formations.domaineId))
      .leftJoin(progressions, eq(progressions.formationId, formations.id))
      .leftJoin(notations, eq(notations.formationId, formations.id))
      .where(eq(formations.auteurId, utilisateurId))
      .groupBy(formations.id, domaines.nom, domaines.couleur)
      .orderBy(desc(formations.majLe)),
    db
      .select({
        id: parcours.id,
        slug: parcours.slug,
        titre: parcours.titre,
        statut: parcours.statut,
        motifRefus: parcours.motifRefus,
        domaine: domaines.nom,
        couleur: domaines.couleur,
        etapes: count(etapesParcours.id),
        majLe: parcours.majLe,
      })
      .from(parcours)
      .innerJoin(domaines, eq(domaines.id, parcours.domaineId))
      .leftJoin(etapesParcours, eq(etapesParcours.parcoursId, parcours.id))
      .where(eq(parcours.auteurId, utilisateurId))
      .groupBy(parcours.id, domaines.nom, domaines.couleur)
      .orderBy(desc(parcours.majLe)),
  ]);
  return { formations: lignes, parcours: chemins };
}

export type OptionsStudio = {
  domaines: { id: string; nom: string; couleur: string; icone: string }[];
  competences: { id: string; nom: string; domaineId: string }[];
  formateurs: { id: string; nom: string }[];
  modeles: { id: string; nom: string; parDefaut: boolean }[];
};

/** Référentiels à proposer dans les éditeurs. */
export async function optionsStudio(): Promise<OptionsStudio> {
  const [doms, comps, forms, mods] = await Promise.all([
    db
      .select({ id: domaines.id, nom: domaines.nom, couleur: domaines.couleur, icone: domaines.icone })
      .from(domaines)
      .orderBy(asc(domaines.ordre), asc(domaines.nom)),
    // Compétences communes (sans organisation) : une formation Cursus s'adresse à
    // toutes les organisations, pas au référentiel d'une seule.
    db
      .select({ id: competences.id, nom: competences.nom, domaineId: competences.domaineId })
      .from(competences)
      .where(and(eq(competences.active, true), isNull(competences.jeId)))
      .orderBy(asc(competences.ordre), asc(competences.nom)),
    db
      .select({ id: utilisateurs.id, nom: sql<string>`${utilisateurs.prenom} || ' ' || ${utilisateurs.nom}` })
      .from(utilisateurs)
      .where(and(eq(utilisateurs.actif, true), sql`'FORMATEUR' = any(${utilisateurs.roles})`))
      .orderBy(asc(utilisateurs.prenom)),
    db
      .select({ id: modelesCertificat.id, nom: modelesCertificat.nom, parDefaut: modelesCertificat.parDefaut })
      .from(modelesCertificat)
      .where(eq(modelesCertificat.archive, false))
      .orderBy(desc(modelesCertificat.parDefaut), asc(modelesCertificat.nom)),
  ]);
  return { domaines: doms, competences: comps, formateurs: forms, modeles: mods };
}

export type QuestionEdition = {
  id: string;
  type: "CHOIX_UNIQUE" | "CHOIX_MULTIPLE" | "VRAI_FAUX";
  enonce: string;
  explication: string | null;
  competenceId: string | null;
  options: { id: string; texte: string; correcte: boolean }[];
};

export type PointEdition = {
  id: string;
  type: "INTEGRE" | "FINAL";
  tempsSec: number | null;
  titre: string;
  questions: QuestionEdition[];
};

export type FormationEdition = {
  id: string;
  slug: string;
  titre: string;
  resume: string;
  description: string;
  objectifs: string[];
  tags: string[];
  domaineId: string;
  niveau: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  imageUrl: string | null;
  fournisseurVideo: string;
  referenceVideo: string;
  dureeSec: number;
  formateurId: string | null;
  statut: string;
  motifRefus: string | null;
  visibleCatalogue: boolean;
  auteurId: string;
  competences: { competenceId: string; poids: number }[];
  points: PointEdition[];
  inscrits: number;
};

/** Formation complète pour l'éditeur. Null si introuvable ou hors de portée. */
export async function formationPourEdition(u: Utilisateur, id: string): Promise<FormationEdition | null> {
  const [f] = await db.select().from(formations).where(eq(formations.id, id)).limit(1);
  if (!f || !peutOuvrir(u, f.auteurId)) return null;

  const [liens, points, inscrits] = await Promise.all([
    db
      .select({ competenceId: formationsCompetences.competenceId, poids: formationsCompetences.poids })
      .from(formationsCompetences)
      .where(eq(formationsCompetences.formationId, id)),
    db.select().from(pointsQuiz).where(eq(pointsQuiz.formationId, id)).orderBy(asc(pointsQuiz.tempsSec)),
    db
      .select({ n: count() })
      .from(progressions)
      .where(eq(progressions.formationId, id)),
  ]);

  const ids = points.map((p) => p.id);
  const qs = ids.length
    ? await db.select().from(questions).where(inArray(questions.pointQuizId, ids)).orderBy(asc(questions.ordre))
    : [];

  return {
    ...f,
    competences: liens,
    points: points.map((p) => ({
      id: p.id,
      type: p.type as "INTEGRE" | "FINAL",
      tempsSec: p.tempsSec,
      titre: p.titre,
      questions: qs
        .filter((q) => q.pointQuizId === p.id)
        .map((q) => ({
          id: q.id,
          type: q.type as QuestionEdition["type"],
          enonce: q.enonce,
          explication: q.explication,
          competenceId: q.competenceId,
          options: q.options,
        })),
    })),
    inscrits: inscrits[0]?.n ?? 0,
  };
}

export type ParcoursEdition = {
  id: string;
  slug: string;
  titre: string;
  sousTitre: string | null;
  description: string;
  imageUrl: string | null;
  domaineId: string;
  statut: string;
  motifRefus: string | null;
  auteurId: string;
  modeleCertificatId: string | null;
  intituleCertificat: string | null;
  etapes: { id: string; formationId: string; ordre: number; titre: string | null; formationTitre: string; formationStatut: string; dureeSec: number }[];
  /** Formations publiables en étape (publiées, hors parcours en cours). */
  disponibles: { id: string; titre: string; domaine: string; dureeSec: number; statut: string }[];
};

/** Parcours complet pour l'éditeur. Null si introuvable ou hors de portée. */
export async function parcoursPourEdition(u: Utilisateur, id: string): Promise<ParcoursEdition | null> {
  const [p] = await db.select().from(parcours).where(eq(parcours.id, id)).limit(1);
  if (!p || !peutOuvrir(u, p.auteurId)) return null;

  const etapes = await db
    .select({
      id: etapesParcours.id,
      formationId: etapesParcours.formationId,
      ordre: etapesParcours.ordre,
      titre: etapesParcours.titre,
      formationTitre: formations.titre,
      formationStatut: formations.statut,
      dureeSec: formations.dureeSec,
    })
    .from(etapesParcours)
    .innerJoin(formations, eq(formations.id, etapesParcours.formationId))
    .where(eq(etapesParcours.parcoursId, id))
    .orderBy(asc(etapesParcours.ordre));

  const prises = etapes.map((e) => e.formationId);
  const disponibles = await db
    .select({
      id: formations.id,
      titre: formations.titre,
      domaine: domaines.nom,
      dureeSec: formations.dureeSec,
      statut: formations.statut,
    })
    .from(formations)
    .innerJoin(domaines, eq(domaines.id, formations.domaineId))
    .where(
      and(ne(formations.statut, "ARCHIVE"), prises.length ? notInArray(formations.id, prises) : undefined)
    )
    .orderBy(asc(formations.titre));

  return { ...p, etapes, disponibles };
}
