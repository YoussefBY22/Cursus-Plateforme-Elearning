import { and, count, countDistinct, desc, eq, inArray, isNotNull, isNull, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  activitesJour,
  autoEvaluations,
  badges,
  badgesObtenus,
  certificats,
  commentaires,
  domaines,
  competences,
  enquetes,
  evenementsXp,
  formations,
  inscriptionsParcours,
  likesCommentaire,
  niveauxCompetence,
  notations,
  pointsQuiz,
  progressions,
  tentativesQuiz,
  utilisateurs,
} from "@/db/schema";
import { badgesAAttribuer, type StatistiquesMembre } from "@/services/badges";
import { niveauxParDomaine, noteGenerale } from "@/services/competences";
import { completudeProfil } from "@/services/visibilite";
import { etatNiveau, serieJours } from "@/services/xp";
import { notifier } from "@/server/notifications";

/**
 * Ajoute de l'XP — une seule fois par (type, référence). Renvoie les points
 * réellement ajoutés (0 si déjà gagnés). Un passage de niveau émet une
 * notification de type NIVEAU, que la célébration affiche.
 */
export async function ajouterXp(
  utilisateurId: string,
  type: string,
  refId: string,
  points: number,
  libelle: string
): Promise<number> {
  if (points <= 0) return 0;
  const insere = await db
    .insert(evenementsXp)
    .values({ utilisateurId, type, refId, points, libelle })
    .onConflictDoNothing()
    .returning({ id: evenementsXp.id });
  if (!insere.length) return 0;
  const [maj] = await db
    .update(utilisateurs)
    .set({ xp: sql`${utilisateurs.xp} + ${points}` })
    .where(eq(utilisateurs.id, utilisateurId))
    .returning({ xp: utilisateurs.xp });
  if (maj) {
    const avant = etatNiveau(maj.xp - points).niveau;
    const apres = etatNiveau(maj.xp);
    if (apres.niveau > avant) {
      await notifier([utilisateurId], {
        type: "NIVEAU",
        titre: `Niveau ${apres.niveau} atteint`,
        message: `Vous êtes désormais « ${apres.titre} ». Continuez sur votre lancée !`,
        lien: "/competences",
        donnees: { niveau: apres.niveau, titre: apres.titre, celebre: false },
        cle: `niveau:${apres.niveau}`,
      });
    }
  }
  return points;
}

/** Toutes les mesures qu'un critère de badge peut lire. */
export async function statistiquesMembre(utilisateurId: string): Promise<StatistiquesMembre> {
  const [u] = await db.select().from(utilisateurs).where(eq(utilisateurs.id, utilisateurId)).limit(1);
  if (!u) throw new Error("Utilisateur introuvable.");

  const [prog] = await db
    .select({
      secondes: sum(progressions.secondesVues),
      terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
      vues: sql<number>`count(*) filter (where ${progressions.seuilAtteint})`.mapWith(Number),
    })
    .from(progressions)
    .where(eq(progressions.utilisateurId, utilisateurId));

  const [quiz] = await db
    .select({ reussis: countDistinct(tentativesQuiz.pointQuizId) })
    .from(tentativesQuiz)
    .where(and(eq(tentativesQuiz.utilisateurId, utilisateurId), eq(tentativesQuiz.reussi, true)));

  const [parfaits] = await db
    .select({ n: count() })
    .from(tentativesQuiz)
    .innerJoin(pointsQuiz, eq(pointsQuiz.id, tentativesQuiz.pointQuizId))
    .where(
      and(
        eq(tentativesQuiz.utilisateurId, utilisateurId),
        eq(tentativesQuiz.numero, 1),
        eq(pointsQuiz.type, "FINAL"),
        sql`${tentativesQuiz.score} >= 0.999`
      )
    );

  const parcoursFinis = await db
    .select({ id: inscriptionsParcours.parcoursId })
    .from(inscriptionsParcours)
    .where(and(eq(inscriptionsParcours.utilisateurId, utilisateurId), isNotNull(inscriptionsParcours.termineLe)));

  const [certs] = await db
    .select({ n: count() })
    .from(certificats)
    .where(and(eq(certificats.utilisateurId, utilisateurId), isNull(certificats.revoqueLe)));

  const [autos] = await db
    .select({ n: count(), domaines: countDistinct(autoEvaluations.domaineId) })
    .from(autoEvaluations)
    .where(and(eq(autoEvaluations.utilisateurId, utilisateurId), isNotNull(autoEvaluations.termineeLe)));

  const niveaux = await db
    .select({
      niveau: niveauxCompetence.niveau,
      initial: niveauxCompetence.niveauInitial,
      competenceId: niveauxCompetence.competenceId,
      domaineId: competences.domaineId,
    })
    .from(niveauxCompetence)
    .innerJoin(competences, eq(competences.id, niveauxCompetence.competenceId))
    .where(eq(niveauxCompetence.utilisateurId, utilisateurId));
  const parDomaine = niveauxParDomaine(niveaux);

  const [comms] = await db
    .select({ n: count() })
    .from(commentaires)
    .where(and(eq(commentaires.auteurId, utilisateurId), eq(commentaires.masque, false)));
  const [likes] = await db
    .select({ n: count() })
    .from(likesCommentaire)
    .innerJoin(commentaires, eq(commentaires.id, likesCommentaire.commentaireId))
    .where(eq(commentaires.auteurId, utilisateurId));
  const [notes] = await db.select({ n: count() }).from(notations).where(eq(notations.utilisateurId, utilisateurId));
  const [froid] = await db
    .select({ n: count() })
    .from(enquetes)
    .where(and(eq(enquetes.utilisateurId, utilisateurId), eq(enquetes.type, "FROID")));

  const jours = await db
    .select({ jour: activitesJour.jour })
    .from(activitesJour)
    .where(eq(activitesJour.utilisateurId, utilisateurId))
    .orderBy(desc(activitesJour.jour))
    .limit(400);

  const termineesParDomaine = await db
    .select({ domaineId: formations.domaineId, n: count() })
    .from(progressions)
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .where(and(eq(progressions.utilisateurId, utilisateurId), eq(progressions.statut, "TERMINEE")))
    .groupBy(formations.domaineId);

  const [publiees] = await db
    .select({ n: count() })
    .from(formations)
    .where(
      and(
        eq(formations.statut, "PUBLIE"),
        sql`(${formations.auteurId} = ${utilisateurId} or ${formations.formateurId} = ${utilisateurId})`
      )
    );

  return {
    heuresPlateforme: u.tempsActifSec / 3600,
    heuresVisionnage: Number(prog?.secondes ?? 0) / 3600,
    formationsTerminees: prog?.terminees ?? 0,
    formationsVisionnees: prog?.vues ?? 0,
    quizReussis: quiz?.reussis ?? 0,
    quizParfaits: parfaits?.n ?? 0,
    parcoursTermines: parcoursFinis.length,
    certificats: certs?.n ?? 0,
    profilComplet: completudeProfil(u).score >= 1,
    emailVerifie: !!u.emailVerifieLe,
    autoEvaluations: autos?.n ?? 0,
    domainesEvalues: autos?.domaines ?? 0,
    niveau: etatNiveau(u.xp).niveau,
    meilleureCompetence: niveaux.reduce((m, n) => Math.max(m, n.niveau), 0),
    noteGenerale: noteGenerale(Object.values(parDomaine).map((d) => d.niveau)),
    commentaires: comms?.n ?? 0,
    likesRecus: likes?.n ?? 0,
    notesDonnees: notes?.n ?? 0,
    enquetesFroid: froid?.n ?? 0,
    serieJours: serieJours(jours.map((j) => new Date(`${j.jour}T00:00:00Z`))),
    domainesFormes: termineesParDomaine.length,
    formationsParDomaine: Object.fromEntries(termineesParDomaine.map((d) => [d.domaineId, d.n])),
    parcoursTerminesIds: parcoursFinis.map((p) => p.id),
    formationsPubliees: publiees?.n ?? 0,
    progressionMax: niveaux.reduce((m, n) => Math.max(m, n.niveau - n.initial), 0),
  };
}

/**
 * Attribue les badges nouvellement mérités. Deux passes au plus : le bonus
 * d'XP d'un badge peut faire passer un niveau qui débloque un autre badge.
 */
export async function verifierBadges(utilisateurId: string): Promise<string[]> {
  const attribues: string[] = [];
  for (let passe = 0; passe < 2; passe++) {
    const stats = await statistiquesMembre(utilisateurId);
    const regles = await db.select().from(badges).where(eq(badges.actif, true));
    const deja = await db
      .select({ id: badgesObtenus.badgeId })
      .from(badgesObtenus)
      .where(eq(badgesObtenus.utilisateurId, utilisateurId));
    const nouveaux = badgesAAttribuer(regles, stats, new Set(deja.map((d) => d.id)));
    if (!nouveaux.length) break;

    for (const badgeId of nouveaux) {
      const insere = await db
        .insert(badgesObtenus)
        .values({ utilisateurId, badgeId })
        .onConflictDoNothing()
        .returning({ id: badgesObtenus.badgeId });
      if (!insere.length) continue;
      const b = regles.find((r) => r.id === badgeId)!;
      attribues.push(badgeId);
      await notifier([utilisateurId], {
        type: "BADGE",
        titre: `Badge débloqué : ${b.nom}`,
        message: b.description,
        lien: "/badges",
        donnees: { badgeId },
        cle: `badge:${badgeId}`,
      });
      if (b.xpBonus > 0) await ajouterXp(utilisateurId, "BADGE", badgeId, b.xpBonus, `Badge « ${b.nom} »`);
    }
  }
  return attribues;
}

/** Variante qui ne fait jamais échouer l'action qui l'appelle. */
export async function verifierBadgesSansErreur(utilisateurId: string): Promise<void> {
  try {
    await verifierBadges(utilisateurId);
  } catch (err) {
    console.error("[badges] Vérification impossible :", err);
  }
}

/** Libellé lisible d'un domaine (utilitaire partagé). */
export async function nomsDomaines(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const lignes = await db.select({ id: domaines.id, nom: domaines.nom }).from(domaines).where(inArray(domaines.id, ids));
  return new Map(lignes.map((l) => [l.id, l.nom]));
}
