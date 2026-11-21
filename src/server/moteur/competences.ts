import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  autoEvaluations,
  competences,
  enquetes,
  formationsCompetences,
  formationsExternes,
  formationsExternesCompetences,
  gainsFormation,
  historiqueNiveaux,
  niveauxCompetence,
  participationsExternes,
  pointsQuiz,
  questions,
  reponsesAutoEvaluation,
  tentativesQuiz,
  utilisateurs,
} from "@/db/schema";
import {
  autoEvaluationVersNiveau,
  calculerGain,
  consolider,
  type Mesures,
} from "@/services/competences";
import { noterQuiz, scoresParCompetence, type QuestionQuiz } from "@/services/quiz";
import { BAREME_XP } from "@/services/xp";
import { lireParametres } from "@/server/parametres";
import { ajouterXp, verifierBadgesSansErreur } from "@/server/moteur/gamification";

/**
 * Montée en compétences — orchestration en base de la méthode standardisée
 * (`services/competences.ts`). Le même calcul sert aux formations Cursus
 * et aux formations externes saisies par le RH d'une organisation.
 */

type CompetenceRef = { id: string; nom: string; code: string; question: string | null; sourceId: string | null; jeId: string | null };

/**
 * Référentiel effectif d'un domaine pour une organisation : sa version adaptée si elle
 * en a une (le standard de l'organisation), sinon celui de la plateforme.
 */
export async function referentielEffectif(domaineId: string, jeId: string | null): Promise<CompetenceRef[]> {
  const champs = {
    id: competences.id,
    nom: competences.nom,
    code: competences.code,
    question: competences.question,
    sourceId: competences.sourceId,
    jeId: competences.jeId,
  };
  if (jeId) {
    const propres = await db
      .select(champs)
      .from(competences)
      .where(and(eq(competences.domaineId, domaineId), eq(competences.jeId, jeId), eq(competences.active, true)))
      .orderBy(competences.ordre);
    if (propres.length) return propres;
  }
  return db
    .select(champs)
    .from(competences)
    .where(and(eq(competences.domaineId, domaineId), isNull(competences.jeId), eq(competences.active, true)))
    .orderBy(competences.ordre);
}

/**
 * Compétence où ranger une mesure : une compétence commune est remplacée
 * par son adaptation dans l'organisation du membre, si elle existe. Les niveaux restent
 * comparables entre organisations grâce au lien `sourceId`.
 */
export async function competencesEffectives(confedIds: string[], jeId: string | null): Promise<Map<string, string>> {
  const carte = new Map(confedIds.map((id) => [id, id]));
  if (!jeId || !confedIds.length) return carte;
  const adaptations = await db
    .select({ id: competences.id, sourceId: competences.sourceId })
    .from(competences)
    .where(and(eq(competences.jeId, jeId), inArray(competences.sourceId, confedIds), eq(competences.active, true)));
  for (const a of adaptations) if (a.sourceId) carte.set(a.sourceId, a.id);
  return carte;
}

/** Un membre a-t-il déjà une auto-évaluation initiale terminée sur ce domaine ? */
export async function aEvalueDomaine(utilisateurId: string, domaineId: string): Promise<boolean> {
  const [r] = await db
    .select({ id: autoEvaluations.id })
    .from(autoEvaluations)
    .where(
      and(
        eq(autoEvaluations.utilisateurId, utilisateurId),
        eq(autoEvaluations.domaineId, domaineId),
        sql`${autoEvaluations.termineeLe} is not null`,
        inArray(autoEvaluations.contexte, ["INITIALE", "LIBRE"])
      )
    )
    .limit(1);
  return !!r;
}

export type ReponseSaisie = { competenceId: string; valeur: number | null; inconnu: boolean; dureeMs: number };

/**
 * Enregistre une auto-évaluation terminée. Le serveur revérifie le temps :
 * une réponse arrivée après le délai (+ 1,5 s de marge réseau) est comptée
 * comme « temps écoulé », quoi qu'en dise le navigateur.
 */
export async function terminerAutoEvaluation(
  utilisateurId: string,
  autoEvaluationId: string,
  reponses: ReponseSaisie[]
): Promise<{ niveauxCrees: number }> {
  const [ae] = await db
    .select()
    .from(autoEvaluations)
    .where(and(eq(autoEvaluations.id, autoEvaluationId), eq(autoEvaluations.utilisateurId, utilisateurId)))
    .limit(1);
  if (!ae) throw new Error("Auto-évaluation introuvable.");
  if (ae.termineeLe) return { niveauxCrees: 0 };

  const [u] = await db.select({ jeId: utilisateurs.jeId }).from(utilisateurs).where(eq(utilisateurs.id, utilisateurId)).limit(1);
  const referentiel = await referentielEffectif(ae.domaineId, u?.jeId ?? null);
  const autorisees = new Set(referentiel.map((c) => c.id));
  const delaiMs = ae.secondesParQuestion * 1000 + 1500;
  // Garde-fou global : le formulaire entier ne peut pas avoir duré plus que
  // la somme des délais (plus une marge pour l'écran d'introduction).
  const dureeTotaleMs = Date.now() - ae.demarreeLe.getTime();
  const plafondTotal = referentiel.length * delaiMs + 10 * 60 * 1000;

  const lignes = reponses
    .filter((r) => autorisees.has(r.competenceId))
    .map((r) => {
      const hors = r.dureeMs > delaiMs || r.dureeMs < 0 || dureeTotaleMs > plafondTotal;
      const valeur = !hors && !r.inconnu && r.valeur !== null ? Math.round(Math.min(10, Math.max(1, r.valeur))) : null;
      return {
        autoEvaluationId,
        competenceId: r.competenceId,
        valeur,
        inconnu: !hors && r.inconnu,
        expire: hors || (!r.inconnu && r.valeur === null),
        dureeMs: Math.max(0, Math.min(r.dureeMs, 600_000)),
      };
    });

  if (lignes.length) await db.insert(reponsesAutoEvaluation).values(lignes).onConflictDoNothing();
  await db.update(autoEvaluations).set({ termineeLe: new Date() }).where(eq(autoEvaluations.id, autoEvaluationId));

  let niveauxCrees = 0;
  if (ae.contexte !== "FINALE") {
    // L'auto-évaluation fixe le niveau de départ des compétences jamais
    // mesurées. Elle ne réécrit pas un niveau déjà établi par des mesures :
    // se re-noter ne fait pas progresser.
    const existants = await db
      .select({ id: niveauxCompetence.competenceId })
      .from(niveauxCompetence)
      .where(eq(niveauxCompetence.utilisateurId, utilisateurId));
    const deja = new Set(existants.map((e) => e.id));
    for (const l of lignes) {
      if (deja.has(l.competenceId) || l.expire) continue;
      const niveau = autoEvaluationVersNiveau(l.inconnu ? 0 : l.valeur);
      await db
        .insert(niveauxCompetence)
        .values({ utilisateurId, competenceId: l.competenceId, niveau, niveauInitial: niveau })
        .onConflictDoNothing();
      await db.insert(historiqueNiveaux).values({
        utilisateurId,
        competenceId: l.competenceId,
        niveau,
        variation: 0,
        source: "AUTOEVAL",
        refId: autoEvaluationId,
        libelle: "Auto-évaluation initiale",
      });
      niveauxCrees++;
    }
  }

  await ajouterXp(utilisateurId, "AUTO_EVALUATION", autoEvaluationId, BAREME_XP.AUTO_EVALUATION, "Auto-évaluation");
  await verifierBadgesSansErreur(utilisateurId);
  return { niveauxCrees };
}

/** Applique un gain à un niveau, avec historique. */
async function appliquerGain(
  utilisateurId: string,
  competenceId: string,
  gain: ReturnType<typeof calculerGain>,
  cle: { formationId?: string; formationExterneId?: string },
  libelle: string,
  source: "FORMATION" | "EXTERNE"
) {
  const insere = await db
    .insert(gainsFormation)
    .values({
      utilisateurId,
      competenceId,
      formationId: cle.formationId ?? null,
      formationExterneId: cle.formationExterneId ?? null,
      niveauAvant: gain.niveauAvant,
      niveauObserve: gain.niveauObserve,
      gainTotal: gain.gainTotal,
      gainApplique: gain.gainApplique,
      gainEnAttente: gain.gainEnAttente,
      detail: gain.detail,
    })
    .onConflictDoNothing()
    .returning({ id: gainsFormation.id });
  // Garde-fou : une formation ne fait gagner qu'une fois.
  if (!insere.length) return;

  await db
    .insert(niveauxCompetence)
    .values({ utilisateurId, competenceId, niveau: gain.niveauApres, niveauInitial: gain.niveauAvant })
    .onConflictDoUpdate({
      target: [niveauxCompetence.utilisateurId, niveauxCompetence.competenceId],
      set: { niveau: gain.niveauApres, majLe: new Date() },
    });
  await db.insert(historiqueNiveaux).values({
    utilisateurId,
    competenceId,
    niveau: gain.niveauApres,
    variation: gain.gainApplique,
    source,
    refId: cle.formationId ?? cle.formationExterneId ?? null,
    libelle,
  });
}

/** Questions et premières tentatives d'un membre sur une formation. */
async function premieresTentatives(utilisateurId: string, formationId: string) {
  const points = await db.select().from(pointsQuiz).where(eq(pointsQuiz.formationId, formationId));
  const ids = points.map((p) => p.id);
  if (!ids.length) return { questions: [] as QuestionQuiz[], reponses: {} as Record<string, string[]>, scoreFinal: null as number | null };
  const qs = await db.select().from(questions).where(inArray(questions.pointQuizId, ids));
  const tentatives = await db
    .select()
    .from(tentativesQuiz)
    .where(and(eq(tentativesQuiz.utilisateurId, utilisateurId), inArray(tentativesQuiz.pointQuizId, ids), eq(tentativesQuiz.numero, 1)));
  const reponses: Record<string, string[]> = {};
  for (const t of tentatives) Object.assign(reponses, t.reponses);
  const final = points.find((p) => p.type === "FINAL");
  const tFinal = final ? tentatives.find((t) => t.pointQuizId === final.id) : undefined;
  // Seules les questions effectivement soumises comptent.
  const repondues = qs.filter((q) => tentatives.some((t) => t.pointQuizId === q.pointQuizId));
  return {
    questions: repondues.map((q) => ({ ...q, options: q.options })) as QuestionQuiz[],
    reponses,
    scoreFinal: tFinal ? tFinal.score : null,
  };
}

/**
 * Formation Cursus terminée → gain sur chaque compétence visée.
 * Q = 1re tentative des questions étiquetées sur la compétence (à défaut,
 *     l'ensemble des questions de la formation) ;
 * S = réévaluation finale saisie dans l'enquête à chaud ;
 * F = pas d'évaluation individuelle par le formateur en ligne.
 */
export async function appliquerGainsFormation(utilisateurId: string, formationId: string, titre: string) {
  const p = await lireParametres();
  const ponderations = p["competences.ponderations"];
  const visees = await db
    .select({ competenceId: formationsCompetences.competenceId })
    .from(formationsCompetences)
    .where(eq(formationsCompetences.formationId, formationId));
  if (!visees.length) return;

  const [u] = await db.select({ jeId: utilisateurs.jeId }).from(utilisateurs).where(eq(utilisateurs.id, utilisateurId)).limit(1);
  const carte = await competencesEffectives(
    visees.map((v) => v.competenceId),
    u?.jeId ?? null
  );
  const { questions: qs, reponses } = await premieresTentatives(utilisateurId, formationId);
  const parCompetence = scoresParCompetence(qs, reponses);
  const global = qs.length ? noterQuiz(qs, reponses).score : null;

  const [chaud] = await db
    .select({ reevaluation: enquetes.reevaluation })
    .from(enquetes)
    .where(and(eq(enquetes.utilisateurId, utilisateurId), eq(enquetes.formationId, formationId), eq(enquetes.type, "CHAUD")))
    .limit(1);

  for (const { competenceId: confed } of visees) {
    const effective = carte.get(confed) ?? confed;
    const [actuel] = await db
      .select({ niveau: niveauxCompetence.niveau })
      .from(niveauxCompetence)
      .where(and(eq(niveauxCompetence.utilisateurId, utilisateurId), eq(niveauxCompetence.competenceId, effective)))
      .limit(1);
    const s = parCompetence[confed];
    const reeval = chaud?.reevaluation?.[confed] ?? chaud?.reevaluation?.[effective];
    const mesures: Mesures = {
      quiz: s && s.total > 0 ? s.credit / s.total : global,
      formateur: null,
      reevaluation: reeval === undefined ? undefined : reeval,
    };
    const gain = calculerGain(actuel?.niveau ?? 0, mesures, ponderations);
    await appliquerGain(utilisateurId, effective, gain, { formationId }, titre, "FORMATION");
  }
}

/**
 * Évaluation à froid : la part provisoire du gain est acquise si le membre
 * déclare avoir mis en pratique (≥ seuil), sinon elle est abandonnée.
 */
export async function consoliderGains(
  utilisateurId: string,
  cle: { formationId?: string; formationExterneId?: string },
  miseEnPratique: number,
  libelle: string
) {
  const p = await lireParametres();
  const gains = await db
    .select()
    .from(gainsFormation)
    .where(
      and(
        eq(gainsFormation.utilisateurId, utilisateurId),
        cle.formationId ? eq(gainsFormation.formationId, cle.formationId) : eq(gainsFormation.formationExterneId, cle.formationExterneId!),
        isNull(gainsFormation.consolideLe)
      )
    );
  for (const g of gains) {
    const bonus = consolider(g.gainEnAttente, miseEnPratique, p["competences.ponderations"]);
    await db.update(gainsFormation).set({ consolideLe: new Date() }).where(eq(gainsFormation.id, g.id));
    if (bonus <= 0) continue;
    const [maj] = await db
      .update(niveauxCompetence)
      .set({ niveau: sql`least(99, ${niveauxCompetence.niveau} + ${bonus})`, majLe: new Date() })
      .where(and(eq(niveauxCompetence.utilisateurId, utilisateurId), eq(niveauxCompetence.competenceId, g.competenceId)))
      .returning({ niveau: niveauxCompetence.niveau });
    if (maj) {
      await db.insert(historiqueNiveaux).values({
        utilisateurId,
        competenceId: g.competenceId,
        niveau: maj.niveau,
        variation: bonus,
        source: "CONSOLIDATION",
        refId: g.formationId ?? g.formationExterneId,
        libelle: `Mise en pratique — ${libelle}`,
      });
    }
  }
}

/** Réponses d'une auto-évaluation, par compétence. */
async function reponsesDe(autoEvaluationId: string | null): Promise<Map<string, number | null>> {
  if (!autoEvaluationId) return new Map();
  const r = await db
    .select({ competenceId: reponsesAutoEvaluation.competenceId, valeur: reponsesAutoEvaluation.valeur, inconnu: reponsesAutoEvaluation.inconnu })
    .from(reponsesAutoEvaluation)
    .where(eq(reponsesAutoEvaluation.autoEvaluationId, autoEvaluationId));
  return new Map(r.map((x) => [x.competenceId, x.inconnu ? null : x.valeur]));
}

/**
 * Formation externe clôturée → même calcul pour chaque participant :
 * L₀ = niveau courant (à défaut, auto-évaluation initiale de la formation),
 * Q = test interne éventuel, F = évaluation du formateur interne,
 * S = auto-évaluation finale.
 */
export async function calculerFormationExterne(formationExterneId: string) {
  const p = await lireParametres();
  const [fe] = await db.select().from(formationsExternes).where(eq(formationsExternes.id, formationExterneId)).limit(1);
  if (!fe) throw new Error("Formation externe introuvable.");
  const comps = await db
    .select({ id: formationsExternesCompetences.competenceId })
    .from(formationsExternesCompetences)
    .where(eq(formationsExternesCompetences.formationExterneId, formationExterneId));
  const participants = await db
    .select()
    .from(participationsExternes)
    .where(eq(participationsExternes.formationExterneId, formationExterneId));

  let calcules = 0;
  for (const part of participants) {
    if (part.calculeLe) continue;
    const initiale = await reponsesDe(part.autoEvalInitialeId);
    const finale = await reponsesDe(part.autoEvalFinaleId);
    for (const { id: competenceId } of comps) {
      const [actuel] = await db
        .select({ niveau: niveauxCompetence.niveau })
        .from(niveauxCompetence)
        .where(and(eq(niveauxCompetence.utilisateurId, part.utilisateurId), eq(niveauxCompetence.competenceId, competenceId)))
        .limit(1);
      const L0 = actuel?.niveau ?? (initiale.has(competenceId) ? autoEvaluationVersNiveau(initiale.get(competenceId) ?? 0) : 0);
      if (!actuel) {
        await db
          .insert(niveauxCompetence)
          .values({ utilisateurId: part.utilisateurId, competenceId, niveau: L0, niveauInitial: L0 })
          .onConflictDoNothing();
      }
      const mesures: Mesures = {
        quiz: part.scoreTest !== null ? part.scoreTest / 100 : null,
        formateur: part.evaluationFormateur[competenceId] ?? null,
        reevaluation: finale.has(competenceId) ? (finale.get(competenceId) ?? null) : undefined,
      };
      const gain = calculerGain(L0, mesures, p["competences.ponderations"]);
      await appliquerGain(part.utilisateurId, competenceId, gain, { formationExterneId }, `${fe.titre} (externe)`, "EXTERNE");
    }
    await db.update(participationsExternes).set({ calculeLe: new Date() }).where(eq(participationsExternes.id, part.id));
    await verifierBadgesSansErreur(part.utilisateurId);
    calcules++;
  }
  return calcules;
}
