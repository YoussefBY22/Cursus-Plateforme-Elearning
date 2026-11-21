import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  enquetes,
  etapesParcours,
  formations,
  inscriptionsParcours,
  parcours,
  pointsQuiz,
  progressions,
  questions,
  tentativesQuiz,
} from "@/db/schema";
import {
  couverture,
  fusionnerSegments,
  secondesCouvertes,
  seuilAtteint,
  segmentsPlausibles,
  type ReglesVisionnage,
  type Segment,
} from "@/services/visionnage";
import { noterQuiz, prochaineBarriere, type QuestionQuiz, type Reponses } from "@/services/quiz";
import { BAREME_XP, xpFormation } from "@/services/xp";
import { lireParametres } from "@/server/parametres";
import { ajouterXp, verifierBadgesSansErreur } from "@/server/moteur/gamification";
import { appliquerGainsFormation, consoliderGains } from "@/server/moteur/competences";
import { emettreCertificat, idsParcoursContenant } from "@/server/moteur/certificats";
import { notifier } from "@/server/notifications";
import { ErreurMetier } from "@/lib/resultat";

/**
 * Apprentissage — lecture, quiz bloquants, enquêtes, achèvement.
 *
 * Une formation est TERMINÉE seulement si :
 *   1. le seuil de visionnage est atteint (segments uniques réellement vus) ;
 *   2. tous les quiz intégrés ont été réalisés ;
 *   3. le quiz final est réussi (seuil paramétrable) ;
 *   4. l'enquête de satisfaction à chaud est remplie.
 * Les trois premiers faits, le statut passe à ENQUETE_REQUISE.
 */

export class ErreurApprentissage extends ErreurMetier {}

async function reglesVisionnage(): Promise<ReglesVisionnage & { seuilFinal: number }> {
  const p = await lireParametres();
  return {
    seuil: p["visionnage.seuil"],
    vitesseMax: p["visionnage.vitesseMax"],
    toleranceSaut: p["visionnage.toleranceSaut"],
    seuilFinal: p["quiz.seuilFinal"],
  };
}

export async function chargerPoints(formationId: string) {
  return db.select().from(pointsQuiz).where(eq(pointsQuiz.formationId, formationId)).orderBy(asc(pointsQuiz.tempsSec));
}

/** Points réalisés : intégrés soumis au moins une fois, final réussi. */
export async function pointsRealises(utilisateurId: string, formationId: string): Promise<{ integres: Set<string>; finalReussi: boolean; finalTente: boolean }> {
  const lignes = await db
    .select({ id: tentativesQuiz.pointQuizId, type: pointsQuiz.type, reussi: tentativesQuiz.reussi })
    .from(tentativesQuiz)
    .innerJoin(pointsQuiz, eq(pointsQuiz.id, tentativesQuiz.pointQuizId))
    .where(and(eq(tentativesQuiz.utilisateurId, utilisateurId), eq(pointsQuiz.formationId, formationId)));
  return {
    integres: new Set(lignes.filter((l) => l.type === "INTEGRE").map((l) => l.id)),
    finalReussi: lignes.some((l) => l.type === "FINAL" && l.reussi),
    finalTente: lignes.some((l) => l.type === "FINAL"),
  };
}

/** Crée la progression si besoin et inscrit au parcours d'où l'on vient. */
export async function demarrerFormation(utilisateurId: string, formationId: string, parcoursId?: string | null) {
  await db.insert(progressions).values({ utilisateurId, formationId }).onConflictDoNothing();
  if (parcoursId) {
    await db.insert(inscriptionsParcours).values({ utilisateurId, parcoursId }).onConflictDoNothing();
  }
  const [p] = await db
    .select()
    .from(progressions)
    .where(and(eq(progressions.utilisateurId, utilisateurId), eq(progressions.formationId, formationId)))
    .limit(1);
  return p;
}

export type EtatLecture = {
  positionSec: number;
  secondesVues: number;
  couverture: number;
  seuilAtteint: boolean;
  statut: "EN_COURS" | "ENQUETE_REQUISE" | "TERMINEE";
  quizEnCoursId: string | null;
  segments: Segment[];
};

/**
 * Synchronisation périodique du lecteur (toutes les ~10 s et à la pause).
 *
 * Le serveur ne croit pas le client : segments rognés au temps réel écoulé
 * (× vitesse max), coupés à la barrière du prochain quiz non réalisé, et la
 * position ne peut pas franchir cette barrière.
 */
export async function synchroniser(
  utilisateurId: string,
  formationId: string,
  envoi: { segments: Segment[]; positionSec: number; quizEnCoursId: string | null; dureeReelle?: number | null; sauts?: number }
): Promise<EtatLecture> {
  const [f] = await db.select().from(formations).where(eq(formations.id, formationId)).limit(1);
  if (!f) throw new ErreurApprentissage("Formation introuvable.");
  const prog = await demarrerFormation(utilisateurId, formationId);
  const regles = await reglesVisionnage();

  // Durée réelle remontée par le lecteur : on corrige une durée saisie à la
  // main si l'écart reste raisonnable (± 20 %) — au-delà, on garde la nôtre.
  let duree = f.dureeSec;
  if (envoi.dureeReelle && envoi.dureeReelle > 5) {
    const ecart = Math.abs(envoi.dureeReelle - f.dureeSec) / Math.max(1, f.dureeSec);
    if (ecart > 0.02 && ecart <= 0.2) {
      duree = Math.round(envoi.dureeReelle);
      await db.update(formations).set({ dureeSec: duree }).where(eq(formations.id, formationId));
    }
  }

  const points = await chargerPoints(formationId);
  const { integres } = await pointsRealises(utilisateurId, formationId);
  const barriere = prochaineBarriere(
    points.filter((p) => p.type === "INTEGRE" && p.tempsSec !== null).map((p) => ({ id: p.id, tempsSec: p.tempsSec! })),
    integres
  );
  const limite = barriere ? barriere.tempsSec : duree;

  const ecoule = (Date.now() - prog.derniereSyncLe.getTime()) / 1000;
  const recus = segmentsPlausibles(envoi.segments ?? [], ecoule, duree, regles)
    .map(([a, b]) => [Math.min(a, limite), Math.min(b, limite)] as Segment)
    .filter(([a, b]) => b > a);
  const fusion = fusionnerSegments([...(prog.segments as Segment[]), ...recus]);
  const vues = secondesCouvertes(fusion, duree);
  const atteint = prog.seuilAtteint || seuilAtteint(fusion, duree, regles);

  const position = Math.max(0, Math.min(envoi.positionSec ?? 0, limite, duree));
  const quizValide =
    envoi.quizEnCoursId && points.some((p) => p.id === envoi.quizEnCoursId && p.type === "INTEGRE" && !integres.has(p.id))
      ? envoi.quizEnCoursId
      : null;

  await db
    .update(progressions)
    .set({
      segments: fusion,
      secondesVues: vues,
      positionSec: position,
      quizEnCoursId: quizValide,
      seuilAtteint: atteint,
      derniereSyncLe: new Date(),
      sauts: sql`${progressions.sauts} + ${Math.max(0, Math.min(envoi.sauts ?? 0, 50))}`,
    })
    .where(eq(progressions.id, prog.id));

  const statut = await verifierAchevement(utilisateurId, formationId);
  return {
    positionSec: position,
    secondesVues: vues,
    couverture: couverture(fusion, duree),
    seuilAtteint: atteint,
    statut,
    quizEnCoursId: quizValide,
    segments: fusion,
  };
}

export type Correction = {
  score: number;
  reussi: boolean;
  bonnes: number;
  total: number;
  numero: number;
  /** Détail révélé : pour les quiz intégrés toujours, pour le final une fois réussi. */
  details: { questionId: string; correcte: boolean; bonnes: string[] | null; explication: string | null }[];
  statut: EtatLecture["statut"];
};

/**
 * Barrière d'accès à un quiz — une seule définition, partagée par l'ouverture
 * du quiz (qui sert les questions) et par sa correction. Les deux voient donc
 * exactement la même règle.
 */
export async function exigerAccesQuiz(utilisateurId: string, pointQuizId: string) {
  const [point] = await db.select().from(pointsQuiz).where(eq(pointsQuiz.id, pointQuizId)).limit(1);
  if (!point) throw new ErreurApprentissage("Quiz introuvable.");
  const [f] = await db.select().from(formations).where(eq(formations.id, point.formationId)).limit(1);
  if (!f) throw new ErreurApprentissage("Formation introuvable.");
  const prog = await demarrerFormation(utilisateurId, point.formationId);
  const regles = await reglesVisionnage();
  const realises = await pointsRealises(utilisateurId, point.formationId);

  if (point.type === "INTEGRE") {
    // On ne répond qu'à un quiz atteint : la position doit être sur la barrière.
    const atteint = prog.positionSec >= (point.tempsSec ?? 0) - 5 || prog.quizEnCoursId === point.id;
    if (!atteint) throw new ErreurApprentissage("Ce quiz se débloque quand la vidéo l'atteint.");
  } else {
    const points = await chargerPoints(point.formationId);
    const manquants = points.filter((p) => p.type === "INTEGRE" && !realises.integres.has(p.id));
    if (!prog.seuilAtteint || manquants.length) {
      throw new ErreurApprentissage("Le quiz final s'ouvre une fois la vidéo vue et les quiz intégrés réalisés.");
    }
  }
  return { point, formation: f, prog, regles, realises };
}

export async function soumettreQuiz(utilisateurId: string, pointQuizId: string, reponses: Reponses): Promise<Correction> {
  const { point, formation: f, prog, regles } = await exigerAccesQuiz(utilisateurId, pointQuizId);

  const qs = await db.select().from(questions).where(eq(questions.pointQuizId, pointQuizId)).orderBy(asc(questions.ordre));
  const qq: QuestionQuiz[] = qs.map((q) => ({ ...q, options: q.options }));
  const propres: Reponses = {};
  for (const q of qq) {
    const ids = new Set(q.options.map((o) => o.id));
    propres[q.id] = (reponses[q.id] ?? []).filter((r) => ids.has(r)).slice(0, q.options.length);
  }
  const resultat = noterQuiz(qq, propres);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(tentativesQuiz)
    .where(and(eq(tentativesQuiz.utilisateurId, utilisateurId), eq(tentativesQuiz.pointQuizId, pointQuizId)));
  const numero = n + 1;
  const reussi = point.type === "FINAL" ? resultat.score >= regles.seuilFinal - 1e-9 : resultat.score >= 0.5;

  await db.insert(tentativesQuiz).values({
    utilisateurId,
    pointQuizId,
    reponses: propres,
    score: resultat.score,
    reussi,
    numero,
  });
  if (prog.quizEnCoursId === pointQuizId) {
    await db.update(progressions).set({ quizEnCoursId: null }).where(eq(progressions.id, prog.id));
  }

  if (point.type === "INTEGRE") {
    await ajouterXp(utilisateurId, "QUIZ", pointQuizId, BAREME_XP.QUIZ_INTEGRE, `Quiz — ${f?.titre ?? ""}`);
  } else if (reussi) {
    await ajouterXp(utilisateurId, "QUIZ", pointQuizId, BAREME_XP.QUIZ_FINAL, `Quiz final — ${f?.titre ?? ""}`);
    if (numero === 1 && resultat.score >= 0.999) {
      await ajouterXp(utilisateurId, "QUIZ_EXCELLENCE", pointQuizId, BAREME_XP.QUIZ_FINAL_EXCELLENCE, "Quiz final parfait");
    }
  }

  const statut = await verifierAchevement(utilisateurId, point.formationId);
  await verifierBadgesSansErreur(utilisateurId);

  const reveler = point.type === "INTEGRE" || reussi;
  return {
    score: resultat.score,
    reussi,
    bonnes: resultat.bonnes,
    total: resultat.total,
    numero,
    statut,
    details: resultat.details.map((d) => ({
      questionId: d.questionId,
      correcte: d.correcte,
      bonnes: reveler ? d.bonnes : null,
      explication: reveler ? (qs.find((q) => q.id === d.questionId)?.explication ?? null) : null,
    })),
  };
}

export type SaisieEnquete = {
  noteContenu: number;
  noteFormateur: number;
  noteSpecifique: number;
  recommandation: number;
  commentaire?: string | null;
  reevaluation?: Record<string, number | null>;
};

export async function soumettreEnquete(
  utilisateurId: string,
  formationId: string,
  type: "CHAUD" | "FROID",
  s: SaisieEnquete
): Promise<EtatLecture["statut"]> {
  const [prog] = await db
    .select()
    .from(progressions)
    .where(and(eq(progressions.utilisateurId, utilisateurId), eq(progressions.formationId, formationId)))
    .limit(1);
  if (!prog) throw new ErreurApprentissage("Commencez la formation avant de l'évaluer.");
  if (type === "CHAUD" && prog.statut === "EN_COURS") {
    throw new ErreurApprentissage("L'enquête s'ouvre une fois la vidéo vue et les quiz réalisés.");
  }
  if (type === "FROID" && prog.statut !== "TERMINEE") {
    throw new ErreurApprentissage("L'évaluation à froid concerne une formation terminée.");
  }
  const borne = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v)));
  const insere = await db
    .insert(enquetes)
    .values({
      utilisateurId,
      formationId,
      type,
      noteContenu: borne(s.noteContenu, 1, 5),
      noteFormateur: borne(s.noteFormateur, 1, 5),
      noteSpecifique: borne(s.noteSpecifique, 1, 5),
      recommandation: borne(s.recommandation, 0, 10),
      commentaire: s.commentaire?.trim().slice(0, 2000) || null,
      reevaluation: Object.fromEntries(
        Object.entries(s.reevaluation ?? {}).map(([k, v]) => [k, v === null ? null : borne(v, 1, 10)])
      ),
    })
    .onConflictDoNothing()
    .returning({ id: enquetes.id });
  if (!insere.length) return prog.statut;

  const [f] = await db.select({ titre: formations.titre }).from(formations).where(eq(formations.id, formationId)).limit(1);
  if (type === "CHAUD") {
    await ajouterXp(utilisateurId, "ENQUETE_CHAUD", formationId, BAREME_XP.ENQUETE_CHAUD, "Enquête de satisfaction");
  } else {
    await ajouterXp(utilisateurId, "ENQUETE_FROID", formationId, BAREME_XP.ENQUETE_FROID, "Évaluation à froid");
    await consoliderGains(utilisateurId, { formationId }, s.noteSpecifique, f?.titre ?? "Formation");
  }
  const statut = await verifierAchevement(utilisateurId, formationId);
  await verifierBadgesSansErreur(utilisateurId);
  return statut;
}

/**
 * Recalcule le statut d'une progression ; au passage à TERMINÉE : XP,
 * compétences, parcours (et certificat), badges. Idempotent.
 */
export async function verifierAchevement(utilisateurId: string, formationId: string): Promise<EtatLecture["statut"]> {
  const [prog] = await db
    .select()
    .from(progressions)
    .where(and(eq(progressions.utilisateurId, utilisateurId), eq(progressions.formationId, formationId)))
    .limit(1);
  if (!prog) return "EN_COURS";
  if (prog.statut === "TERMINEE") return "TERMINEE";

  const points = await chargerPoints(formationId);
  const r = await pointsRealises(utilisateurId, formationId);
  const integresOk = points.filter((p) => p.type === "INTEGRE").every((p) => r.integres.has(p.id));
  const finalOk = !points.some((p) => p.type === "FINAL") || r.finalReussi;
  if (!prog.seuilAtteint || !integresOk || !finalOk) return "EN_COURS";

  const [chaud] = await db
    .select({ id: enquetes.id })
    .from(enquetes)
    .where(and(eq(enquetes.utilisateurId, utilisateurId), eq(enquetes.formationId, formationId), eq(enquetes.type, "CHAUD")))
    .limit(1);
  if (!chaud) {
    if (prog.statut !== "ENQUETE_REQUISE") {
      await db.update(progressions).set({ statut: "ENQUETE_REQUISE" }).where(eq(progressions.id, prog.id));
    }
    return "ENQUETE_REQUISE";
  }

  const bascule = await db
    .update(progressions)
    .set({ statut: "TERMINEE", termineeLe: new Date() })
    .where(and(eq(progressions.id, prog.id), sql`${progressions.statut} <> 'TERMINEE'`))
    .returning({ id: progressions.id });
  if (!bascule.length) return "TERMINEE";

  const [f] = await db.select().from(formations).where(eq(formations.id, formationId)).limit(1);
  await ajouterXp(utilisateurId, "FORMATION", formationId, xpFormation(f.dureeSec), `Formation terminée — ${f.titre}`);
  await appliquerGainsFormation(utilisateurId, formationId, f.titre);
  await verifierParcours(utilisateurId, formationId);

  const formateurId = f.formateurId ?? f.auteurId;
  if (formateurId && formateurId !== utilisateurId) {
    await notifier([formateurId], {
      type: "INFO",
      titre: "Une formation de plus terminée",
      message: `Un membre vient de terminer « ${f.titre} ».`,
      lien: "/studio",
      cle: `fin:${formationId}:${utilisateurId}`,
    });
  }
  await verifierBadgesSansErreur(utilisateurId);
  return "TERMINEE";
}

/**
 * Un parcours (ou pack de formations) est terminé quand toutes ses étapes le
 * sont : inscription close, XP, certificat. Un membre qui a tout suivi hors
 * du parcours y est inscrit d'office — il a bien fait le pack.
 */
export async function verifierParcours(utilisateurId: string, formationId: string) {
  const ids = await idsParcoursContenant(formationId);
  for (const parcoursId of ids) {
    const etapes = await db.select({ formationId: etapesParcours.formationId }).from(etapesParcours).where(eq(etapesParcours.parcoursId, parcoursId));
    const terminees = await db
      .select({ id: progressions.formationId })
      .from(progressions)
      .where(
        and(
          eq(progressions.utilisateurId, utilisateurId),
          eq(progressions.statut, "TERMINEE"),
          inArray(
            progressions.formationId,
            etapes.map((e) => e.formationId)
          )
        )
      );
    if (terminees.length < new Set(etapes.map((e) => e.formationId)).size) continue;

    await db.insert(inscriptionsParcours).values({ utilisateurId, parcoursId }).onConflictDoNothing();
    const fini = await db
      .update(inscriptionsParcours)
      .set({ termineLe: new Date() })
      .where(
        and(
          eq(inscriptionsParcours.utilisateurId, utilisateurId),
          eq(inscriptionsParcours.parcoursId, parcoursId),
          sql`${inscriptionsParcours.termineLe} is null`
        )
      )
      .returning();
    if (!fini.length) continue;
    const [p] = await db.select({ titre: parcours.titre }).from(parcours).where(eq(parcours.id, parcoursId)).limit(1);
    await ajouterXp(utilisateurId, "PARCOURS", parcoursId, BAREME_XP.PARCOURS_TERMINE, `Parcours terminé — ${p?.titre ?? ""}`);
    await emettreCertificat(utilisateurId, parcoursId);
  }
}
