import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  competences,
  domaines,
  enquetes,
  formations,
  formationsCompetences,
  pointsQuiz,
  progressions,
  questions,
  tentativesQuiz,
  utilisateurs,
} from "@/db/schema";
import { lireParametres } from "@/server/parametres";
import type { Segment } from "@/services/visionnage";

/**
 * Données du lecteur suivi.
 *
 * Ce qui part au navigateur est volontairement incomplet : un point de quiz
 * annonce son minutage et son nombre de questions, jamais ses questions ni
 * ses bonnes réponses. Celles-ci ne sont servies qu'à l'ouverture du quiz,
 * après vérification que la vidéo l'a bien atteint, et débarrassées du
 * marqueur « correcte ».
 */

export type PointLecture = {
  id: string;
  type: "INTEGRE" | "FINAL";
  tempsSec: number | null;
  titre: string;
  nbQuestions: number;
  realise: boolean;
  reussi: boolean;
  meilleurScore: number | null;
  tentatives: number;
};

export type PreparationLecture = NonNullable<Awaited<ReturnType<typeof preparerLecture>>>;

export async function preparerLecture(slug: string, utilisateurId: string) {
  const [f] = await db
    .select({
      id: formations.id,
      slug: formations.slug,
      titre: formations.titre,
      resume: formations.resume,
      dureeSec: formations.dureeSec,
      fournisseurVideo: formations.fournisseurVideo,
      referenceVideo: formations.referenceVideo,
      domaineNom: domaines.nom,
      domaineCouleur: domaines.couleur,
      domaineIcone: domaines.icone,
      formateurId: sql<string>`coalesce(${formations.formateurId}, ${formations.auteurId})`,
    })
    .from(formations)
    .innerJoin(domaines, eq(domaines.id, formations.domaineId))
    .where(and(eq(formations.slug, slug), eq(formations.statut, "PUBLIE")))
    .limit(1);
  if (!f) return null;

  const [prog, points, tentatives, chaud, visees, formateur, parametres] = await Promise.all([
    db
      .select({
        positionSec: progressions.positionSec,
        secondesVues: progressions.secondesVues,
        segments: progressions.segments,
        quizEnCoursId: progressions.quizEnCoursId,
        seuilAtteint: progressions.seuilAtteint,
        statut: progressions.statut,
      })
      .from(progressions)
      .where(and(eq(progressions.formationId, f.id), eq(progressions.utilisateurId, utilisateurId)))
      .limit(1),
    db
      .select({
        id: pointsQuiz.id,
        type: pointsQuiz.type,
        tempsSec: pointsQuiz.tempsSec,
        titre: pointsQuiz.titre,
        nbQuestions: sql<number>`(select count(*) from question q where q.point_quiz_id = ${pointsQuiz.id})`.mapWith(Number),
      })
      .from(pointsQuiz)
      .where(eq(pointsQuiz.formationId, f.id))
      .orderBy(asc(pointsQuiz.tempsSec)),
    db
      .select({
        pointQuizId: tentativesQuiz.pointQuizId,
        reussi: sql<boolean>`bool_or(${tentativesQuiz.reussi})`.mapWith(Boolean),
        meilleur: sql<number>`max(${tentativesQuiz.score})`.mapWith(Number),
        nb: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tentativesQuiz)
      .innerJoin(pointsQuiz, eq(pointsQuiz.id, tentativesQuiz.pointQuizId))
      .where(and(eq(tentativesQuiz.utilisateurId, utilisateurId), eq(pointsQuiz.formationId, f.id)))
      .groupBy(tentativesQuiz.pointQuizId),
    db
      .select({ id: enquetes.id })
      .from(enquetes)
      .where(
        and(
          eq(enquetes.formationId, f.id),
          eq(enquetes.utilisateurId, utilisateurId),
          eq(enquetes.type, "CHAUD")
        )
      )
      .limit(1),
    db
      .select({ id: competences.id, nom: competences.nom, question: competences.question })
      .from(formationsCompetences)
      .innerJoin(competences, eq(competences.id, formationsCompetences.competenceId))
      .where(eq(formationsCompetences.formationId, f.id))
      .orderBy(desc(formationsCompetences.poids), asc(competences.nom)),
    db
      .select({ prenom: utilisateurs.prenom, nom: utilisateurs.nom, photoUrl: utilisateurs.photoUrl })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, f.formateurId))
      .limit(1),
    lireParametres(),
  ]);

  const parPoint = new Map(tentatives.map((t) => [t.pointQuizId, t]));
  const liste: PointLecture[] = points.map((p) => {
    const t = parPoint.get(p.id);
    return {
      id: p.id,
      type: p.type,
      tempsSec: p.tempsSec,
      titre: p.titre,
      nbQuestions: p.nbQuestions,
      realise: Boolean(t),
      reussi: Boolean(t?.reussi),
      meilleurScore: t ? t.meilleur : null,
      tentatives: t?.nb ?? 0,
    };
  });

  return {
    formation: {
      id: f.id,
      slug: f.slug,
      titre: f.titre,
      resume: f.resume,
      dureeSec: f.dureeSec,
      fournisseurVideo: f.fournisseurVideo,
      referenceVideo: f.referenceVideo,
      domaine: { nom: f.domaineNom, couleur: f.domaineCouleur, icone: f.domaineIcone },
      formateur: formateur[0] ?? null,
    },
    progression: {
      positionSec: prog[0]?.positionSec ?? 0,
      secondesVues: prog[0]?.secondesVues ?? 0,
      segments: (prog[0]?.segments ?? []) as Segment[],
      quizEnCoursId: prog[0]?.quizEnCoursId ?? null,
      seuilAtteint: prog[0]?.seuilAtteint ?? false,
      statut: prog[0]?.statut ?? ("EN_COURS" as const),
      commencee: Boolean(prog[0]),
    },
    points: liste,
    enqueteChaudFaite: Boolean(chaud[0]),
    competencesVisees: visees,
    regles: {
      seuil: parametres["visionnage.seuil"],
      vitesseMax: parametres["visionnage.vitesseMax"],
      toleranceSaut: parametres["visionnage.toleranceSaut"],
      seuilFinal: parametres["quiz.seuilFinal"],
    },
  };
}

export type QuestionLecture = {
  id: string;
  type: "CHOIX_UNIQUE" | "CHOIX_MULTIPLE" | "VRAI_FAUX";
  enonce: string;
  options: { id: string; texte: string }[];
};

/**
 * Questions d'un point de quiz, sans les bonnes réponses.
 *
 * `correcte` est retiré ici et nulle part ailleurs : c'est le seul endroit
 * qui lit la table `question` pour le compte d'un apprenant.
 */
export async function questionsSansReponses(pointQuizId: string): Promise<QuestionLecture[]> {
  const qs = await db
    .select({
      id: questions.id,
      type: questions.type,
      enonce: questions.enonce,
      options: questions.options,
    })
    .from(questions)
    .where(eq(questions.pointQuizId, pointQuizId))
    .orderBy(asc(questions.ordre));

  return qs.map((q) => ({
    id: q.id,
    type: q.type,
    enonce: q.enonce,
    options: q.options.map((o) => ({ id: o.id, texte: o.texte })),
  }));
}
