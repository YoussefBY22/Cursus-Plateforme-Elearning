import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { asc, count, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { commentaires, formations, signalements, utilisateurs } from "@/db/schema";

const auteurCommentaire = alias(utilisateurs, "auteur_commentaire");
const signaleur = alias(utilisateurs, "signaleur");
const moderateur = alias(utilisateurs, "moderateur");

export type SignalementGroupe = {
  commentaireId: string;
  texte: string;
  masque: boolean;
  commentaireCreeLe: Date;
  auteur: { id: string; nom: string; photo: string | null };
  formation: { id: string; titre: string; slug: string };
  motifs: { motif: string; n: number }[];
  signalements: { id: string; par: string; motif: string; details: string | null; creeLe: Date }[];
  premierSignalement: Date;
};

/** Signalements ouverts, regroupés par commentaire (le plus signalé d'abord). */
export async function signalementsOuverts(): Promise<SignalementGroupe[]> {
  const lignes = await db
    .select({
      id: signalements.id,
      motif: signalements.motif,
      details: signalements.details,
      creeLe: signalements.creeLe,
      parPrenom: signaleur.prenom,
      parNom: signaleur.nom,
      commentaireId: commentaires.id,
      texte: commentaires.texte,
      masque: commentaires.masque,
      commentaireCreeLe: commentaires.creeLe,
      auteurId: auteurCommentaire.id,
      auteurPrenom: auteurCommentaire.prenom,
      auteurNom: auteurCommentaire.nom,
      auteurPhoto: auteurCommentaire.photoUrl,
      formationId: formations.id,
      formationTitre: formations.titre,
      formationSlug: formations.slug,
    })
    .from(signalements)
    .innerJoin(commentaires, eq(commentaires.id, signalements.commentaireId))
    .innerJoin(auteurCommentaire, eq(auteurCommentaire.id, commentaires.auteurId))
    .innerJoin(signaleur, eq(signaleur.id, signalements.auteurId))
    .innerJoin(formations, eq(formations.id, commentaires.formationId))
    .where(eq(signalements.statut, "OUVERT"))
    .orderBy(asc(signalements.creeLe));

  const groupes = new Map<string, SignalementGroupe>();
  for (const l of lignes) {
    let g = groupes.get(l.commentaireId);
    if (!g) {
      g = {
        commentaireId: l.commentaireId,
        texte: l.texte,
        masque: l.masque,
        commentaireCreeLe: l.commentaireCreeLe,
        auteur: { id: l.auteurId, nom: `${l.auteurPrenom} ${l.auteurNom}`, photo: l.auteurPhoto },
        formation: { id: l.formationId, titre: l.formationTitre, slug: l.formationSlug },
        motifs: [],
        signalements: [],
        premierSignalement: l.creeLe,
      };
      groupes.set(l.commentaireId, g);
    }
    g.signalements.push({ id: l.id, par: `${l.parPrenom} ${l.parNom}`, motif: l.motif, details: l.details, creeLe: l.creeLe });
    const m = g.motifs.find((x) => x.motif === l.motif);
    if (m) m.n++;
    else g.motifs.push({ motif: l.motif, n: 1 });
  }
  return [...groupes.values()].sort(
    (a, b) => b.signalements.length - a.signalements.length || a.premierSignalement.getTime() - b.premierSignalement.getTime()
  );
}

/** Signalements déjà traités, les plus récents d'abord. */
export async function historiqueModeration(limite = 200) {
  return db
    .select({
      id: signalements.id,
      motif: signalements.motif,
      statut: signalements.statut,
      creeLe: signalements.creeLe,
      traiteLe: signalements.traiteLe,
      texte: commentaires.texte,
      formationTitre: formations.titre,
      auteurPrenom: auteurCommentaire.prenom,
      auteurNom: auteurCommentaire.nom,
      parPrenom: signaleur.prenom,
      parNom: signaleur.nom,
      moderateurPrenom: moderateur.prenom,
      moderateurNom: moderateur.nom,
    })
    .from(signalements)
    .innerJoin(commentaires, eq(commentaires.id, signalements.commentaireId))
    .innerJoin(auteurCommentaire, eq(auteurCommentaire.id, commentaires.auteurId))
    .innerJoin(signaleur, eq(signaleur.id, signalements.auteurId))
    .innerJoin(formations, eq(formations.id, commentaires.formationId))
    .leftJoin(moderateur, eq(moderateur.id, signalements.traiteParId))
    .where(ne(signalements.statut, "OUVERT"))
    .orderBy(desc(signalements.traiteLe), desc(signalements.creeLe))
    .limit(limite);
}

export async function compteHistorique(): Promise<number> {
  const [r] = await db.select({ n: count() }).from(signalements).where(ne(signalements.statut, "OUVERT"));
  return r?.n ?? 0;
}
