"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { commentaires, formations, likesCommentaire, notations, signalements } from "@/db/schema";
import { erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import {
  demarrerFormation,
  exigerAccesQuiz,
  soumettreEnquete,
  soumettreQuiz,
  synchroniser,
  type Correction,
  type EtatLecture,
} from "@/server/moteur/apprentissage";
import { idsParRoles, notifier } from "@/server/notifications";
import { likesDe } from "@/server/requetes/catalogue";
import { questionsSansReponses, type QuestionLecture } from "@/server/requetes/lecture";
import { exigerPermission } from "@/server/session";
import { MOTIFS_SIGNALEMENT } from "@/services/moderation";
import { NOTE_MAX, NOTE_MIN, arrondirNote } from "@/services/notation";

/**
 * Actions du module apprentissage.
 *
 * Le client propose, le serveur tranche : le relevé de visionnage est rogné au
 * temps réellement écoulé, la position ne franchit pas un quiz non réalisé, et
 * les bonnes réponses ne quittent le serveur qu'une fois le quiz corrigé.
 */

const idSchema = z.string().trim().min(1, "Identifiant manquant.").max(40);

async function slugDe(formationId: string): Promise<string | null> {
  const [f] = await db.select({ slug: formations.slug }).from(formations).where(eq(formations.id, formationId)).limit(1);
  return f?.slug ?? null;
}

async function revaliderFormation(formationId: string) {
  const slug = await slugDe(formationId);
  if (slug) {
    revalidatePath(`/formations/${slug}`);
    revalidatePath(`/formations/${slug}/lecture`);
  }
  revalidatePath("/catalogue");
  revalidatePath("/accueil");
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

const SchemaDemarrage = z.object({ formationId: idSchema, parcoursId: idSchema.nullish() });

export async function demarrer(entree: unknown): Promise<Resultat> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = SchemaDemarrage.safeParse(entree);
    if (!lu.success) return { erreur: "Formation inconnue." };
    await demarrerFormation(u.id, lu.data.formationId, lu.data.parcoursId ?? null);
    await revaliderFormation(lu.data.formationId);
    return { ok: true };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaSync = z.object({
  formationId: idSchema,
  positionSec: z.number().min(0).max(60 * 60 * 12),
  segments: z
    .array(z.tuple([z.number().min(0), z.number().min(0)]))
    .max(400, "Trop de segments envoyés.")
    .default([]),
  quizEnCoursId: idSchema.nullish(),
  dureeReelle: z.number().min(0).max(60 * 60 * 12).nullish(),
  sauts: z.number().int().min(0).max(50).default(0),
});

/** Battement du lecteur (~10 s, à la pause et avant de quitter la page). */
export async function synchroniserLecture(entree: unknown): Promise<Resultat<EtatLecture>> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = SchemaSync.safeParse(entree);
    if (!lu.success) return { erreur: "Relevé de lecture invalide." };
    const d = lu.data;
    const etat = await synchroniser(u.id, d.formationId, {
      segments: d.segments,
      positionSec: d.positionSec,
      quizEnCoursId: d.quizEnCoursId ?? null,
      dureeReelle: d.dureeReelle ?? null,
      sauts: d.sauts,
    });
    return { ok: true, donnees: etat };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/**
 * Ouvre un quiz : renvoie ses questions sans les bonnes réponses, et
 * seulement si la vidéo l'a réellement atteint. Un client qui demanderait un
 * quiz plus loin dans la vidéo n'obtient rien.
 */
export async function chargerQuiz(entree: unknown): Promise<Resultat<{ questions: QuestionLecture[] }>> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = z.object({ pointQuizId: idSchema }).safeParse(entree);
    if (!lu.success) return { erreur: "Quiz inconnu." };

    await exigerAccesQuiz(u.id, lu.data.pointQuizId);
    return { ok: true, donnees: { questions: await questionsSansReponses(lu.data.pointQuizId) } };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaQuiz = z.object({
  pointQuizId: idSchema,
  reponses: z.record(z.string().max(40), z.array(z.string().max(40)).max(12)).default({}),
});

export async function repondreQuiz(entree: unknown): Promise<Resultat<Correction>> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = SchemaQuiz.safeParse(entree);
    if (!lu.success) return { erreur: "Réponses invalides." };
    const correction = await soumettreQuiz(u.id, lu.data.pointQuizId, lu.data.reponses);
    return { ok: true, donnees: correction };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaEnquete = z.object({
  formationId: idSchema,
  type: z.enum(["CHAUD", "FROID"]),
  noteContenu: z.number().int().min(1).max(5),
  noteFormateur: z.number().int().min(1).max(5),
  noteSpecifique: z.number().int().min(1).max(5),
  recommandation: z.number().int().min(0).max(10),
  commentaire: z.string().trim().max(2000).nullish(),
  reevaluation: z.record(z.string().max(40), z.number().int().min(1).max(10).nullable()).default({}),
});

export async function envoyerEnquete(entree: unknown): Promise<Resultat<{ statut: EtatLecture["statut"] }>> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = SchemaEnquete.safeParse(entree);
    if (!lu.success) {
      const erreurs = erreursZod(lu.error.issues);
      return { erreurs, erreur: Object.values(erreurs)[0] ?? "Réponses incomplètes." };
    }
    const d = lu.data;
    const statut = await soumettreEnquete(u.id, d.formationId, d.type, {
      noteContenu: d.noteContenu,
      noteFormateur: d.noteFormateur,
      noteSpecifique: d.noteSpecifique,
      recommandation: d.recommandation,
      commentaire: d.commentaire ?? null,
      reevaluation: d.reevaluation,
    });
    await revaliderFormation(d.formationId);
    revalidatePath("/competences");
    return { ok: true, donnees: { statut } };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Notation                                                            */
/* ------------------------------------------------------------------ */

const SchemaNote = z.object({
  formationId: idSchema,
  note: z
    .number()
    .min(NOTE_MIN, "La note va de 1 à 5 étoiles.")
    .max(NOTE_MAX, "La note va de 1 à 5 étoiles."),
});

/** Noter, ou renoter : une seule note par membre et par formation. */
export async function noterFormation(entree: unknown): Promise<Resultat<{ note: number }>> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = SchemaNote.safeParse(entree);
    if (!lu.success) return { erreur: "Note invalide : de 1 à 5 étoiles." };
    const note = arrondirNote(lu.data.note);
    if (note < NOTE_MIN || note > NOTE_MAX) return { erreur: "Note invalide : de 1 à 5 étoiles." };

    await db
      .insert(notations)
      .values({ utilisateurId: u.id, formationId: lu.data.formationId, note })
      .onConflictDoUpdate({
        target: [notations.utilisateurId, notations.formationId],
        set: { note, majLe: new Date() },
      });
    await revaliderFormation(lu.data.formationId);
    return { ok: true, donnees: { note }, message: `Note enregistrée : ${note.toFixed(2).replace(/\.?0+$/, "")} / 5.` };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Commentaires                                                         */
/* ------------------------------------------------------------------ */

const SchemaCommentaire = z.object({
  formationId: idSchema,
  parentId: idSchema.nullish(),
  texte: z
    .string()
    .trim()
    .min(2, "Écrivez au moins deux caractères.")
    .max(2000, "Commentaire trop long (2000 caractères au plus)."),
});

export async function publierCommentaire(entree: unknown): Promise<Resultat<{ id: string }>> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = SchemaCommentaire.safeParse(entree);
    if (!lu.success) {
      const erreurs = erreursZod(lu.error.issues);
      return { erreurs, erreur: Object.values(erreurs)[0] ?? "Commentaire invalide." };
    }
    const d = lu.data;

    if (d.parentId) {
      const [parent] = await db
        .select({ id: commentaires.id, formationId: commentaires.formationId, parentId: commentaires.parentId })
        .from(commentaires)
        .where(eq(commentaires.id, d.parentId))
        .limit(1);
      if (!parent || parent.formationId !== d.formationId) return { erreur: "Ce commentaire n'existe plus." };
      // Deux niveaux au plus : une réponse à une réponse rejoint la racine.
      if (parent.parentId) d.parentId = parent.parentId;
    }

    const [insere] = await db
      .insert(commentaires)
      .values({ formationId: d.formationId, auteurId: u.id, parentId: d.parentId ?? null, texte: d.texte })
      .returning({ id: commentaires.id });

    await revaliderFormation(d.formationId);
    return { ok: true, donnees: { id: insere.id }, message: "Commentaire publié." };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

export async function basculerLike(entree: unknown): Promise<Resultat<{ nb: number; aime: boolean }>> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = z.object({ commentaireId: idSchema }).safeParse(entree);
    if (!lu.success) return { erreur: "Commentaire inconnu." };
    const id = lu.data.commentaireId;

    const supprime = await db
      .delete(likesCommentaire)
      .where(and(eq(likesCommentaire.commentaireId, id), eq(likesCommentaire.utilisateurId, u.id)))
      .returning({ id: likesCommentaire.commentaireId });
    if (!supprime.length) {
      await db.insert(likesCommentaire).values({ commentaireId: id, utilisateurId: u.id }).onConflictDoNothing();
    }
    return { ok: true, donnees: await likesDe(id, u.id) };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaSignalement = z.object({
  commentaireId: idSchema,
  motif: z.enum(MOTIFS_SIGNALEMENT),
  details: z.string().trim().max(500).nullish(),
});

export async function signalerCommentaire(entree: unknown): Promise<Resultat> {
  try {
    const u = await exigerPermission("apprentissage", "ecrire");
    const lu = SchemaSignalement.safeParse(entree);
    if (!lu.success) return { erreur: "Choisissez un motif de signalement." };
    const d = lu.data;

    const [c] = await db
      .select({ id: commentaires.id, auteurId: commentaires.auteurId, formationId: commentaires.formationId })
      .from(commentaires)
      .where(eq(commentaires.id, d.commentaireId))
      .limit(1);
    if (!c) return { erreur: "Ce commentaire n'existe plus." };
    if (c.auteurId === u.id) return { erreur: "Vous ne pouvez pas signaler votre propre commentaire." };

    const insere = await db
      .insert(signalements)
      .values({ commentaireId: d.commentaireId, auteurId: u.id, motif: d.motif, details: d.details ?? null })
      .onConflictDoNothing()
      .returning({ id: signalements.id });
    if (!insere.length) return { ok: true, message: "Signalement déjà transmis." };

    await journaliser({
      acteurId: u.id,
      action: "SIGNALER",
      entite: "commentaire",
      entiteId: d.commentaireId,
      details: { motif: d.motif },
    });
    const moderateurs = await idsParRoles(["SUPER_ADMIN", "RESP_PEDAGO"]);
    await notifier(moderateurs, {
      type: "ALERTE",
      titre: "Commentaire signalé",
      message: `Motif : ${d.motif}. À examiner dans la modération.`,
      lien: "/admin/moderation",
      cle: `signalement:${insere[0].id}`,
    });
    revalidatePath("/admin/moderation");
    return { ok: true, message: "Signalement transmis à la modération." };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
