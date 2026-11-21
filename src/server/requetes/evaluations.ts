import "server-only";
import { and, asc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  competences,
  domaines,
  enquetes,
  formations,
  formationsCompetences,
  gainsFormation,
  niveauxCompetence,
  progressions,
  utilisateurs,
} from "@/db/schema";
import { lireParametres } from "@/server/parametres";

/*
 * Évaluation à froid.
 *
 * Un mois après la formation (délai paramétrable), on demande au membre ce
 * qu'il en a réellement mis en pratique. C'est cette réponse qui confirme —
 * ou non — la part de gain restée provisoire : sans elle, un acquis déclaré
 * juste après la formation ne se consolide jamais.
 */

/** Date limite à partir de laquelle l'évaluation à froid est attendue. */
function dateEcheance(delaiJours: number): Date {
  return new Date(Date.now() - delaiJours * 86_400_000);
}

export type EvaluationDue = {
  formationId: string;
  slug: string;
  titre: string;
  domaine: string;
  couleur: string;
  icone: string;
  termineeLe: Date;
  joursEcoules: number;
  gainEnAttente: number;
};

/**
 * Formations terminées depuis plus longtemps que le délai et dont
 * l'évaluation à froid manque encore.
 */
export async function evaluationsAFroidDues(utilisateurId: string): Promise<EvaluationDue[]> {
  const p = await lireParametres();
  const limite = dateEcheance(p["evaluationFroid.delaiJours"]);

  const faites = db
    .select({ formationId: enquetes.formationId })
    .from(enquetes)
    .where(and(eq(enquetes.utilisateurId, utilisateurId), eq(enquetes.type, "FROID")));

  const lignes = await db
    .select({
      formationId: formations.id,
      slug: formations.slug,
      titre: formations.titre,
      domaine: domaines.nom,
      couleur: domaines.couleur,
      icone: domaines.icone,
      termineeLe: progressions.termineeLe,
    })
    .from(progressions)
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .innerJoin(domaines, eq(domaines.id, formations.domaineId))
    .where(
      and(
        eq(progressions.utilisateurId, utilisateurId),
        eq(progressions.statut, "TERMINEE"),
        isNotNull(progressions.termineeLe),
        lte(progressions.termineeLe, limite),
        sql`${formations.id} not in ${faites}`
      )
    )
    .orderBy(asc(progressions.termineeLe));
  if (!lignes.length) return [];

  // La part de gain qui attend cette évaluation : c'est l'argument le plus
  // concret pour la faire.
  const attentes = await db
    .select({
      formationId: gainsFormation.formationId,
      enAttente: sql<number>`sum(${gainsFormation.gainEnAttente})`.mapWith(Number),
    })
    .from(gainsFormation)
    .where(
      and(
        eq(gainsFormation.utilisateurId, utilisateurId),
        inArray(
          gainsFormation.formationId,
          lignes.map((l) => l.formationId)
        ),
        isNull(gainsFormation.consolideLe)
      )
    )
    .groupBy(gainsFormation.formationId);
  const iAttente = new Map(attentes.map((a) => [a.formationId, a.enAttente]));

  return lignes.map((l) => ({
    formationId: l.formationId,
    slug: l.slug,
    titre: l.titre,
    domaine: l.domaine,
    couleur: l.couleur,
    icone: l.icone,
    termineeLe: l.termineeLe as Date,
    joursEcoules: Math.floor((Date.now() - (l.termineeLe as Date).getTime()) / 86_400_000),
    gainEnAttente: Math.round((iAttente.get(l.formationId) ?? 0) * 10) / 10,
  }));
}

export type PreparationFroid = {
  formationId: string;
  slug: string;
  titre: string;
  resume: string;
  domaine: { nom: string; couleur: string };
  formateur: string | null;
  termineeLe: Date;
  joursEcoules: number;
  gainEnAttente: number;
  competences: { id: string; nom: string; question: string | null; niveauActuel: number | null }[];
};

/**
 * Tout ce qu'il faut pour l'écran d'évaluation à froid d'une formation.
 * Null si la formation n'est pas terminée, ou si l'évaluation est déjà faite.
 */
export async function preparerEvaluationFroid(utilisateurId: string, slug: string): Promise<PreparationFroid | null> {
  const [l] = await db
    .select({
      formationId: formations.id,
      slug: formations.slug,
      titre: formations.titre,
      resume: formations.resume,
      domaine: domaines.nom,
      couleur: domaines.couleur,
      statut: progressions.statut,
      termineeLe: progressions.termineeLe,
      formateurPrenom: utilisateurs.prenom,
      formateurNom: utilisateurs.nom,
    })
    .from(formations)
    .innerJoin(domaines, eq(domaines.id, formations.domaineId))
    .innerJoin(
      progressions,
      and(eq(progressions.formationId, formations.id), eq(progressions.utilisateurId, utilisateurId))
    )
    .leftJoin(utilisateurs, eq(utilisateurs.id, formations.formateurId))
    .where(eq(formations.slug, slug))
    .limit(1);
  if (!l || l.statut !== "TERMINEE" || !l.termineeLe) return null;

  const [deja] = await db
    .select({ id: enquetes.id })
    .from(enquetes)
    .where(
      and(
        eq(enquetes.utilisateurId, utilisateurId),
        eq(enquetes.formationId, l.formationId),
        eq(enquetes.type, "FROID")
      )
    )
    .limit(1);
  if (deja) return null;

  const visees = await db
    .select({
      id: competences.id,
      nom: competences.nom,
      question: competences.question,
      niveauActuel: niveauxCompetence.niveau,
    })
    .from(formationsCompetences)
    .innerJoin(competences, eq(competences.id, formationsCompetences.competenceId))
    .leftJoin(
      niveauxCompetence,
      and(
        eq(niveauxCompetence.competenceId, competences.id),
        eq(niveauxCompetence.utilisateurId, utilisateurId)
      )
    )
    .where(eq(formationsCompetences.formationId, l.formationId))
    .orderBy(asc(competences.ordre), asc(competences.nom));

  const [attente] = await db
    .select({ enAttente: sql<number>`coalesce(sum(${gainsFormation.gainEnAttente}), 0)`.mapWith(Number) })
    .from(gainsFormation)
    .where(
      and(
        eq(gainsFormation.utilisateurId, utilisateurId),
        eq(gainsFormation.formationId, l.formationId),
        isNull(gainsFormation.consolideLe)
      )
    );

  return {
    formationId: l.formationId,
    slug: l.slug,
    titre: l.titre,
    resume: l.resume,
    domaine: { nom: l.domaine, couleur: l.couleur },
    formateur: l.formateurPrenom ? `${l.formateurPrenom} ${l.formateurNom}` : null,
    termineeLe: l.termineeLe,
    joursEcoules: Math.floor((Date.now() - l.termineeLe.getTime()) / 86_400_000),
    gainEnAttente: Math.round((attente?.enAttente ?? 0) * 10) / 10,
    competences: visees.map((c) => ({
      id: c.id,
      nom: c.nom,
      question: c.question,
      niveauActuel: c.niveauActuel === null ? null : Math.round(c.niveauActuel),
    })),
  };
}
