"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { autoEvaluations, competences, historiqueNiveaux, niveauxCompetence, participationsExternes, reponsesAutoEvaluation } from "@/db/schema";
import { ErreurMetier, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { terminerAutoEvaluation } from "@/server/moteur/competences";
import { preparerAutoEvaluation } from "@/server/requetes/competences";
import { exigerPermission } from "@/server/session";
import {
  CONTEXTES,
  etapeExterne,
  niveauDeclare,
  QUESTIONS_MAX,
  type DemarrageAutoEvaluation,
  type FinAutoEvaluation,
} from "@/services/auto-evaluation";

/*
 * Actions du module « Mes compétences » : démarrer puis terminer une
 * auto-évaluation chronométrée. Le serveur fixe le délai (paramètre
 * `autoEvaluation.secondesParQuestion`), horodate le départ et revérifie
 * chaque durée à la fin : le navigateur ne décide de rien.
 */

const Id = z.string().min(1).max(40);

const SchemaDemarrage = z.object({
  domaineCode: z.string().min(1).max(40),
  contexte: z.enum(CONTEXTES),
  formationSlug: z.string().min(1).max(120).nullish(),
  formationExterneId: Id.nullish(),
});

/** Crée l'auto-évaluation (départ du chronomètre) et renvoie les questions. */
export async function demarrerAutoEvaluation(entree: {
  domaineCode: string;
  contexte: (typeof CONTEXTES)[number];
  formationSlug?: string | null;
  formationExterneId?: string | null;
}): Promise<Resultat<DemarrageAutoEvaluation>> {
  try {
    const u = await exigerPermission("apprentissage", "lire");
    const lu = SchemaDemarrage.safeParse(entree);
    if (!lu.success) return { erreur: "Requête invalide." };
    const prep = await preparerAutoEvaluation(u.id, lu.data);
    if (!prep.questions.length) return { erreur: "Aucune compétence à évaluer dans ce domaine pour le moment." };

    const [ae] = await db
      .insert(autoEvaluations)
      .values({
        utilisateurId: u.id,
        domaineId: prep.domaine.id,
        contexte: prep.contexte,
        formationId: prep.formation?.id ?? null,
        participationExterneId: prep.externe?.participationId ?? null,
        secondesParQuestion: prep.secondesParQuestion,
      })
      .returning({ id: autoEvaluations.id });

    await journaliser({
      acteurId: u.id,
      action: "AUTO_EVALUATION_DEMARREE",
      entite: "auto_evaluation",
      entiteId: ae.id,
      details: {
        domaine: prep.domaine.code,
        contexte: prep.contexte,
        demande: lu.data.contexte,
        formationId: prep.formation?.id ?? null,
        formationExterneId: prep.externe?.id ?? null,
        questions: prep.questions.length,
      },
    });
    return {
      ok: true,
      donnees: {
        id: ae.id,
        contexte: prep.contexte,
        secondesParQuestion: prep.secondesParQuestion,
        questions: prep.questions,
      },
    };
  } catch (err) {
    return { erreur: messageErreur(err, "Impossible de démarrer l'auto-évaluation. Réessayez.") };
  }
}

const SchemaReponses = z
  .array(
    z.object({
      competenceId: Id,
      valeur: z.number().int().min(1).max(10).nullable(),
      inconnu: z.boolean(),
      dureeMs: z.number().int().min(0).max(3_600_000),
    })
  )
  .max(QUESTIONS_MAX * 2);

/**
 * Enregistre les réponses (le moteur revérifie les délais et fixe les
 * niveaux de départ), puis rattache l'auto-évaluation à la participation
 * externe éventuelle (initiale ou finale selon le contexte).
 */
export async function terminerAutoEvaluationAction(
  id: string,
  reponses: { competenceId: string; valeur: number | null; inconnu: boolean; dureeMs: number }[]
): Promise<Resultat<FinAutoEvaluation>> {
  try {
    const u = await exigerPermission("apprentissage", "lire");
    const idLu = Id.safeParse(id);
    const lu = SchemaReponses.safeParse(reponses);
    if (!idLu.success || !lu.success) return { erreur: "Réponses invalides." };

    const [ae] = await db
      .select()
      .from(autoEvaluations)
      .where(and(eq(autoEvaluations.id, idLu.data), eq(autoEvaluations.utilisateurId, u.id)))
      .limit(1);
    if (!ae) return { erreur: "Auto-évaluation introuvable." };
    if (ae.termineeLe) throw new ErreurMetier("Cette auto-évaluation est déjà enregistrée.");

    // Une réponse par compétence : la première reçue fait foi.
    const vues = new Set<string>();
    const uniques = lu.data.filter((r) => (vues.has(r.competenceId) ? false : (vues.add(r.competenceId), true)));
    const { niveauxCrees } = await terminerAutoEvaluation(u.id, ae.id, uniques);

    let formationExterneId: string | null = null;
    if (ae.participationExterneId) {
      const etape = etapeExterne(ae.contexte);
      const colonne = etape === "finale" ? participationsExternes.autoEvalFinaleId : participationsExternes.autoEvalInitialeId;
      const [maj] = await db
        .update(participationsExternes)
        .set(etape === "finale" ? { autoEvalFinaleId: ae.id } : { autoEvalInitialeId: ae.id })
        .where(
          and(
            eq(participationsExternes.id, ae.participationExterneId),
            eq(participationsExternes.utilisateurId, u.id),
            isNull(colonne)
          )
        )
        .returning({ formationExterneId: participationsExternes.formationExterneId });
      formationExterneId = maj?.formationExterneId ?? null;
      if (!maj) {
        const [p] = await db
          .select({ formationExterneId: participationsExternes.formationExterneId })
          .from(participationsExternes)
          .where(eq(participationsExternes.id, ae.participationExterneId))
          .limit(1);
        formationExterneId = p?.formationExterneId ?? null;
      }
    }

    // Ce que le serveur a retenu, compétence par compétence.
    const enregistrees = await db
      .select({
        competenceId: reponsesAutoEvaluation.competenceId,
        valeur: reponsesAutoEvaluation.valeur,
        inconnu: reponsesAutoEvaluation.inconnu,
        expire: reponsesAutoEvaluation.expire,
        nom: competences.nom,
        ordre: competences.ordre,
      })
      .from(reponsesAutoEvaluation)
      .innerJoin(competences, eq(competences.id, reponsesAutoEvaluation.competenceId))
      .where(eq(reponsesAutoEvaluation.autoEvaluationId, ae.id))
      .orderBy(competences.ordre);
    const ids = enregistrees.map((r) => r.competenceId);
    const [niveaux, fixes] = ids.length
      ? await Promise.all([
          db
            .select({ competenceId: niveauxCompetence.competenceId, niveau: niveauxCompetence.niveau })
            .from(niveauxCompetence)
            .where(and(eq(niveauxCompetence.utilisateurId, u.id), inArray(niveauxCompetence.competenceId, ids))),
          db
            .select({ competenceId: historiqueNiveaux.competenceId })
            .from(historiqueNiveaux)
            .where(and(eq(historiqueNiveaux.utilisateurId, u.id), eq(historiqueNiveaux.refId, ae.id))),
        ])
      : [[], []];
    const iNiveaux = new Map(niveaux.map((n) => [n.competenceId, n.niveau]));
    const iFixes = new Set(fixes.map((f) => f.competenceId));
    // Ordre des questions posées (celui de la saisie), sinon celui du référentiel.
    const rang = new Map(uniques.map((r, i) => [r.competenceId, i]));

    await journaliser({
      acteurId: u.id,
      action: "AUTO_EVALUATION_TERMINEE",
      entite: "auto_evaluation",
      entiteId: ae.id,
      details: { contexte: ae.contexte, reponses: enregistrees.length, niveauxCrees, formationExterneId },
    });

    revalidatePath("/competences");
    if (formationExterneId) {
      revalidatePath(`/competences/externe/${formationExterneId}`);
      revalidatePath(`/mon-organisation/formations-externes/${formationExterneId}`);
    }

    return {
      ok: true,
      message: "Auto-évaluation enregistrée",
      donnees: {
        contexte: ae.contexte,
        resultats: [...enregistrees]
          .sort((a, b) => (rang.get(a.competenceId) ?? 99) - (rang.get(b.competenceId) ?? 99))
          .map((r) => ({
            competenceId: r.competenceId,
            nom: r.nom,
            valeur: r.valeur,
            inconnu: r.inconnu,
            expire: r.expire,
            niveauDeclare: niveauDeclare(r),
            niveauActuel: iNiveaux.has(r.competenceId) ? Math.round((iNiveaux.get(r.competenceId) as number) * 10) / 10 : null,
            niveauFixe: iFixes.has(r.competenceId),
          })),
      },
    };
  } catch (err) {
    return { erreur: messageErreur(err, "Vos réponses n'ont pas pu être enregistrées. Réessayez.") };
  }
}
