import "server-only";
import { and, asc, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { DUREES } from "@/services/catalogue";
import type { CodeDuree, CodeNiveau, CodeTri } from "@/services/catalogue";
import {
  commentaires,
  competences,
  domaines,
  etapesParcours,
  formations,
  formationsCompetences,
  likesCommentaire,
  notations,
  parcours,
  pointsQuiz,
  progressions,
  signalements,
  utilisateurs,
} from "@/db/schema";

/**
 * Catalogue — lecture publique des contenus publiés.
 *
 * Rien de ce qui sert à tricher ne sort d'ici : les questions et les bonnes
 * réponses restent dans le moteur d'apprentissage. Le catalogue ne connaît
 * des quiz que leur nombre et leur minutage.
 */

export {
  DUREES,
  ETATS_AVANCEMENT,
  NIVEAUX,
  TRIS,
  type CodeDuree,
  type CodeNiveau,
  type CodeTri,
} from "@/services/catalogue";

export type FiltresCatalogue = {
  q?: string;
  domaine?: string;
  niveau?: CodeNiveau;
  duree?: CodeDuree;
  /** « encours » | « terminees » | « nouvelles » */
  etat?: string;
  tri?: CodeTri;
};

export type CarteCatalogue = {
  id: string;
  slug: string;
  titre: string;
  resume: string;
  imageUrl: string | null;
  dureeSec: number;
  niveau: CodeNiveau;
  publieLe: Date | null;
  domaine: { id: string; nom: string; couleur: string; icone: string };
  formateur: { prenom: string; nom: string; photoUrl: string | null } | null;
  note: number | null;
  nbNotes: number;
  nbInscrits: number;
  nbQuiz: number;
  progression: { couverture: number; statut: "EN_COURS" | "ENQUETE_REQUISE" | "TERMINEE" } | null;
};

const PUBLIEE = and(eq(formations.statut, "PUBLIE"), eq(formations.visibleCatalogue, true));

/** Agrégats de notation d'une liste de formations, en une requête. */
async function notesPar(ids: string[]) {
  if (!ids.length) return new Map<string, { note: number; nb: number }>();
  const lignes = await db
    .select({
      formationId: notations.formationId,
      note: sql<number>`avg(${notations.note})`.mapWith(Number),
      nb: sql<number>`count(*)`.mapWith(Number),
    })
    .from(notations)
    .where(inArray(notations.formationId, ids))
    .groupBy(notations.formationId);
  return new Map(lignes.map((l) => [l.formationId, { note: l.note, nb: l.nb }]));
}

async function inscritsPar(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const lignes = await db
    .select({ formationId: progressions.formationId, nb: sql<number>`count(*)`.mapWith(Number) })
    .from(progressions)
    .where(inArray(progressions.formationId, ids))
    .groupBy(progressions.formationId);
  return new Map(lignes.map((l) => [l.formationId, l.nb]));
}

async function quizPar(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const lignes = await db
    .select({ formationId: pointsQuiz.formationId, nb: sql<number>`count(*)`.mapWith(Number) })
    .from(pointsQuiz)
    .where(inArray(pointsQuiz.formationId, ids))
    .groupBy(pointsQuiz.formationId);
  return new Map(lignes.map((l) => [l.formationId, l.nb]));
}

async function progressionsPar(utilisateurId: string, ids: string[]) {
  if (!ids.length) return new Map<string, { couverture: number; statut: "EN_COURS" | "ENQUETE_REQUISE" | "TERMINEE" }>();
  const lignes = await db
    .select({
      formationId: progressions.formationId,
      secondesVues: progressions.secondesVues,
      statut: progressions.statut,
      duree: formations.dureeSec,
    })
    .from(progressions)
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .where(and(eq(progressions.utilisateurId, utilisateurId), inArray(progressions.formationId, ids)));
  return new Map(
    lignes.map((l) => [
      l.formationId,
      { couverture: l.duree > 0 ? Math.min(1, l.secondesVues / l.duree) : 0, statut: l.statut },
    ])
  );
}

/** Domaines proposés au filtre, avec le nombre de formations publiées. */
export async function domainesDuCatalogue() {
  return db
    .select({
      id: domaines.id,
      nom: domaines.nom,
      couleur: domaines.couleur,
      icone: domaines.icone,
      nb: sql<number>`count(${formations.id})`.mapWith(Number),
    })
    .from(domaines)
    .leftJoin(formations, and(eq(formations.domaineId, domaines.id), PUBLIEE))
    .groupBy(domaines.id, domaines.nom, domaines.couleur, domaines.icone, domaines.ordre)
    .orderBy(asc(domaines.ordre));
}

export async function listeCatalogue(utilisateurId: string, f: FiltresCatalogue): Promise<CarteCatalogue[]> {
  const conditions: (SQL | undefined)[] = [PUBLIEE];

  const q = f.q?.trim();
  if (q) {
    const motif = `%${q}%`;
    conditions.push(
      or(
        ilike(formations.titre, motif),
        ilike(formations.resume, motif),
        sql`exists (select 1 from unnest(${formations.tags}) t where t ilike ${motif})`
      )
    );
  }
  if (f.domaine) conditions.push(eq(formations.domaineId, f.domaine));
  if (f.niveau) conditions.push(eq(formations.niveau, f.niveau));
  if (f.duree) {
    const d = DUREES[f.duree];
    conditions.push(sql`${formations.dureeSec} >= ${d.min} and ${formations.dureeSec} < ${d.max}`);
  }

  const maProgression = (statut?: "EN_COURS" | "ENQUETE_REQUISE" | "TERMINEE") =>
    exists(
      db
        .select({ un: sql`1` })
        .from(progressions)
        .where(
          and(
            eq(progressions.formationId, formations.id),
            eq(progressions.utilisateurId, utilisateurId),
            statut ? eq(progressions.statut, statut) : undefined
          )
        )
    );

  if (f.etat === "encours") {
    conditions.push(maProgression());
    conditions.push(sql`not ${maProgression("TERMINEE")}`);
  } else if (f.etat === "terminees") {
    conditions.push(maProgression("TERMINEE"));
  } else if (f.etat === "nouvelles") {
    conditions.push(sql`not ${maProgression()}`);
  }

  const classement =
    f.tri === "recentes"
      ? [desc(sql`coalesce(${formations.publieLe}, ${formations.creeLe})`)]
      : f.tri === "courtes"
        ? [asc(formations.dureeSec)]
        : f.tri === "notees"
          ? [
              desc(sql`(select avg(n.note) from notation n where n.formation_id = ${formations.id})`),
              desc(formations.publieLe),
            ]
          : f.tri === "populaires"
            ? [desc(sql`(select count(*) from progression p where p.formation_id = ${formations.id})`)]
            : [asc(domaines.ordre), asc(formations.niveau), asc(formations.titre)];

  const lignes = await db
    .select({
      id: formations.id,
      slug: formations.slug,
      titre: formations.titre,
      resume: formations.resume,
      imageUrl: formations.imageUrl,
      dureeSec: formations.dureeSec,
      niveau: formations.niveau,
      publieLe: formations.publieLe,
      domaineId: domaines.id,
      domaineNom: domaines.nom,
      domaineCouleur: domaines.couleur,
      domaineIcone: domaines.icone,
      formateurPrenom: utilisateurs.prenom,
      formateurNom: utilisateurs.nom,
      formateurPhoto: utilisateurs.photoUrl,
    })
    .from(formations)
    .innerJoin(domaines, eq(domaines.id, formations.domaineId))
    .leftJoin(utilisateurs, eq(utilisateurs.id, sql`coalesce(${formations.formateurId}, ${formations.auteurId})`))
    .where(and(...conditions))
    .orderBy(...classement)
    .limit(120);

  const ids = lignes.map((l) => l.id);
  const [notes, inscrits, quiz, progs] = await Promise.all([
    notesPar(ids),
    inscritsPar(ids),
    quizPar(ids),
    progressionsPar(utilisateurId, ids),
  ]);

  return lignes.map((l) => ({
    id: l.id,
    slug: l.slug,
    titre: l.titre,
    resume: l.resume,
    imageUrl: l.imageUrl,
    dureeSec: l.dureeSec,
    niveau: l.niveau,
    publieLe: l.publieLe,
    domaine: { id: l.domaineId, nom: l.domaineNom, couleur: l.domaineCouleur, icone: l.domaineIcone },
    formateur:
      l.formateurPrenom !== null && l.formateurNom !== null
        ? { prenom: l.formateurPrenom, nom: l.formateurNom, photoUrl: l.formateurPhoto }
        : null,
    note: notes.get(l.id)?.note ?? null,
    nbNotes: notes.get(l.id)?.nb ?? 0,
    nbInscrits: inscrits.get(l.id) ?? 0,
    nbQuiz: quiz.get(l.id) ?? 0,
    progression: progs.get(l.id) ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/* Détail d'une formation                                              */
/* ------------------------------------------------------------------ */

export type CommentaireAffiche = {
  id: string;
  texte: string;
  creeLe: Date;
  auteur: { id: string; prenom: string; nom: string; photoUrl: string | null };
  nbLikes: number;
  aime: boolean;
  signale: boolean;
  reponses: CommentaireAffiche[];
};

export type DetailFormation = NonNullable<Awaited<ReturnType<typeof detailFormation>>>;

export async function detailFormation(slug: string, utilisateurId: string) {
  const [f] = await db
    .select({
      id: formations.id,
      slug: formations.slug,
      titre: formations.titre,
      resume: formations.resume,
      description: formations.description,
      objectifs: formations.objectifs,
      tags: formations.tags,
      imageUrl: formations.imageUrl,
      dureeSec: formations.dureeSec,
      niveau: formations.niveau,
      publieLe: formations.publieLe,
      fournisseurVideo: formations.fournisseurVideo,
      domaine: {
        id: domaines.id,
        nom: domaines.nom,
        couleur: domaines.couleur,
        icone: domaines.icone,
      },
    })
    .from(formations)
    .innerJoin(domaines, eq(domaines.id, formations.domaineId))
    // Pas de `visibleCatalogue` ici : une capsule de parcours ne figure pas au
    // catalogue mais garde sa fiche, puisqu'on peut la suivre depuis le parcours.
    .where(and(eq(formations.slug, slug), eq(formations.statut, "PUBLIE")))
    .limit(1);
  if (!f) return null;

  const [formateur] = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      photoUrl: utilisateurs.photoUrl,
      poste: utilisateurs.poste,
      bio: utilisateurs.bio,
      visibleAnnuaire: utilisateurs.visibleAnnuaire,
    })
    .from(formations)
    .innerJoin(utilisateurs, eq(utilisateurs.id, sql`coalesce(${formations.formateurId}, ${formations.auteurId})`))
    .where(eq(formations.id, f.id))
    .limit(1);

  const [acquis, points, notes, maNote, prog, dansParcours, fil] = await Promise.all([
    db
      .select({
        id: competences.id,
        nom: competences.nom,
        poids: formationsCompetences.poids,
        domaineCouleur: domaines.couleur,
      })
      .from(formationsCompetences)
      .innerJoin(competences, eq(competences.id, formationsCompetences.competenceId))
      .innerJoin(domaines, eq(domaines.id, competences.domaineId))
      .where(eq(formationsCompetences.formationId, f.id))
      .orderBy(desc(formationsCompetences.poids), asc(competences.nom)),
    db
      .select({ id: pointsQuiz.id, type: pointsQuiz.type, tempsSec: pointsQuiz.tempsSec, titre: pointsQuiz.titre })
      .from(pointsQuiz)
      .where(eq(pointsQuiz.formationId, f.id))
      .orderBy(asc(pointsQuiz.tempsSec)),
    db
      .select({ note: notations.note })
      .from(notations)
      .where(eq(notations.formationId, f.id)),
    db
      .select({ note: notations.note })
      .from(notations)
      .where(and(eq(notations.formationId, f.id), eq(notations.utilisateurId, utilisateurId)))
      .limit(1),
    db
      .select({
        positionSec: progressions.positionSec,
        secondesVues: progressions.secondesVues,
        statut: progressions.statut,
        seuilAtteint: progressions.seuilAtteint,
        termineeLe: progressions.termineeLe,
      })
      .from(progressions)
      .where(and(eq(progressions.formationId, f.id), eq(progressions.utilisateurId, utilisateurId)))
      .limit(1),
    db
      .select({ id: parcours.id, slug: parcours.slug, titre: parcours.titre })
      .from(etapesParcours)
      .innerJoin(parcours, eq(parcours.id, etapesParcours.parcoursId))
      .where(and(eq(etapesParcours.formationId, f.id), eq(parcours.statut, "PUBLIE"))),
    filCommentaires(f.id, utilisateurId),
  ]);

  const valeurs = notes.map((n) => n.note);
  return {
    ...f,
    niveau: f.niveau as CodeNiveau,
    formateur: formateur ?? null,
    acquis,
    quizIntegres: points.filter((p) => p.type === "INTEGRE").map((p) => ({ id: p.id, tempsSec: p.tempsSec, titre: p.titre })),
    aQuizFinal: points.some((p) => p.type === "FINAL"),
    nbNotes: valeurs.length,
    note: valeurs.length ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : null,
    repartition: [1, 2, 3, 4, 5].map((e) => valeurs.filter((v) => Math.round(v) === e).length),
    maNote: maNote[0]?.note ?? null,
    progression: prog[0] ?? null,
    parcours: dansParcours,
    commentaires: fil,
  };
}

/** Fil de discussion : commentaires racines et leurs réponses, masqués exclus. */
export async function filCommentaires(formationId: string, utilisateurId: string): Promise<CommentaireAffiche[]> {
  const lignes = await db
    .select({
      id: commentaires.id,
      texte: commentaires.texte,
      creeLe: commentaires.creeLe,
      parentId: commentaires.parentId,
      auteurId: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      photoUrl: utilisateurs.photoUrl,
      nbLikes: sql<number>`(select count(*) from like_commentaire l where l.commentaire_id = ${commentaires.id})`.mapWith(Number),
      aime: sql<boolean>`exists (select 1 from like_commentaire l where l.commentaire_id = ${commentaires.id} and l.utilisateur_id = ${utilisateurId})`.mapWith(
        Boolean
      ),
      signale: sql<boolean>`exists (select 1 from signalement s where s.commentaire_id = ${commentaires.id} and s.auteur_id = ${utilisateurId})`.mapWith(
        Boolean
      ),
    })
    .from(commentaires)
    .innerJoin(utilisateurs, eq(utilisateurs.id, commentaires.auteurId))
    .where(and(eq(commentaires.formationId, formationId), eq(commentaires.masque, false)))
    .orderBy(asc(commentaires.creeLe));

  const vers = (l: (typeof lignes)[number]): CommentaireAffiche => ({
    id: l.id,
    texte: l.texte,
    creeLe: l.creeLe,
    auteur: { id: l.auteurId, prenom: l.prenom, nom: l.nom, photoUrl: l.photoUrl },
    nbLikes: l.nbLikes,
    aime: l.aime,
    signale: l.signale,
    reponses: [],
  });

  const parId = new Map<string, CommentaireAffiche>();
  for (const l of lignes) parId.set(l.id, vers(l));
  const racines: CommentaireAffiche[] = [];
  for (const l of lignes) {
    const noeud = parId.get(l.id)!;
    const parent = l.parentId ? parId.get(l.parentId) : null;
    if (parent) parent.reponses.push(noeud);
    else racines.push(noeud);
  }
  racines.sort((a, b) => b.nbLikes - a.nbLikes || b.creeLe.getTime() - a.creeLe.getTime());
  return racines;
}

/** Les trois formations à reprendre en premier, pour l'accueil et le catalogue. */
export async function aReprendre(utilisateurId: string, limite = 3): Promise<CarteCatalogue[]> {
  const lignes = await db
    .select({ slug: formations.slug })
    .from(progressions)
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .where(
      and(
        eq(progressions.utilisateurId, utilisateurId),
        inArray(progressions.statut, ["EN_COURS", "ENQUETE_REQUISE"]),
        PUBLIEE
      )
    )
    .orderBy(desc(progressions.derniereSyncLe))
    .limit(limite);
  if (!lignes.length) return [];
  const cartes = await listeCatalogue(utilisateurId, { etat: "encours" });
  const ordre = new Map(lignes.map((l, i) => [l.slug, i]));
  return cartes.filter((c) => ordre.has(c.slug)).sort((a, b) => ordre.get(a.slug)! - ordre.get(b.slug)!);
}

/** Compte les signalements ouverts d'un commentaire (garde-fou anti-spam). */
export async function dejaSignale(commentaireId: string, auteurId: string): Promise<boolean> {
  const [s] = await db
    .select({ id: signalements.id })
    .from(signalements)
    .where(and(eq(signalements.commentaireId, commentaireId), eq(signalements.auteurId, auteurId)))
    .limit(1);
  return Boolean(s);
}

/** Likes d'un commentaire après bascule, pour rafraîchir sans recharger. */
export async function likesDe(commentaireId: string, utilisateurId: string) {
  const [l] = await db
    .select({
      nb: sql<number>`count(*)`.mapWith(Number),
      aime: sql<boolean>`bool_or(${likesCommentaire.utilisateurId} = ${utilisateurId})`.mapWith(Boolean),
    })
    .from(likesCommentaire)
    .where(eq(likesCommentaire.commentaireId, commentaireId));
  return { nb: l?.nb ?? 0, aime: Boolean(l?.aime) };
}
