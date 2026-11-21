import "server-only";
import { and, asc, avg, count, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  badgesObtenus,
  certificats,
  domaines,
  enquetes,
  etapesHistoriqueJE,
  formations,
  juniorEntreprises,
  notations,
  progressions,
  utilisateurs,
} from "@/db/schema";
import type { Utilisateur } from "@/server/session";
import { etatNiveau } from "@/services/xp";
import { completudeProfil, figureDansAnnuaire, lienWhatsapp, normaliserUrl, peutVoirProfil, peutVoirStats } from "@/services/visibilite";

/*
 * Profils, annuaire et profils formateurs.
 *
 * Toute la visibilité passe par `services/visibilite` : une requête ne
 * décide jamais seule de montrer un profil ou ses statistiques. Un membre
 * invisible de l'annuaire reste consultable par sa propre organisation et par les
 * administrateurs — c'est la règle du brief, pas une exception du code.
 */

const nomSql = sql<string>`${utilisateurs.prenom} || ' ' || ${utilisateurs.nom}`;

function lecteurDe(u: Utilisateur) {
  return { id: u.id, jeId: u.jeId, roles: u.roles };
}

/* ------------------------------------------------------------------ */
/* Mon profil                                                          */
/* ------------------------------------------------------------------ */

export type MonProfil = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  photoUrl: string | null;
  poste: string | null;
  departement: string | null;
  bio: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  reseaux: { instagram?: string; facebook?: string; github?: string; site?: string; x?: string };
  visibleAnnuaire: boolean;
  masquerStats: boolean;
  roles: string[];
  je: { id: string; nom: string; sigle: string | null } | null;
  rattachement: string;
  completude: { score: number; manquants: string[] };
  historique: { id: string; annee: number; anneeFin: number | null; poste: string; organisation: string; description: string | null }[];
};

export async function monProfil(utilisateurId: string): Promise<MonProfil | null> {
  const [u] = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      photoUrl: utilisateurs.photoUrl,
      poste: utilisateurs.poste,
      departement: utilisateurs.departement,
      bio: utilisateurs.bio,
      linkedin: utilisateurs.linkedin,
      whatsapp: utilisateurs.whatsapp,
      reseaux: utilisateurs.reseaux,
      visibleAnnuaire: utilisateurs.visibleAnnuaire,
      masquerStats: utilisateurs.masquerStats,
      roles: utilisateurs.roles,
      rattachement: utilisateurs.rattachement,
      jeId: juniorEntreprises.id,
      jeNom: juniorEntreprises.nom,
      jeSigle: juniorEntreprises.sigle,
    })
    .from(utilisateurs)
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .where(eq(utilisateurs.id, utilisateurId))
    .limit(1);
  if (!u) return null;

  const historique = await db
    .select()
    .from(etapesHistoriqueJE)
    .where(eq(etapesHistoriqueJE.utilisateurId, utilisateurId))
    .orderBy(desc(etapesHistoriqueJE.annee));

  return {
    id: u.id,
    prenom: u.prenom,
    nom: u.nom,
    email: u.email,
    photoUrl: u.photoUrl,
    poste: u.poste,
    departement: u.departement,
    bio: u.bio,
    linkedin: u.linkedin,
    whatsapp: u.whatsapp,
    reseaux: u.reseaux,
    visibleAnnuaire: u.visibleAnnuaire,
    masquerStats: u.masquerStats,
    roles: u.roles,
    rattachement: u.rattachement,
    je: u.jeId ? { id: u.jeId, nom: u.jeNom ?? "", sigle: u.jeSigle } : null,
    completude: completudeProfil({
      photoUrl: u.photoUrl,
      poste: u.poste,
      bio: u.bio,
      linkedin: u.linkedin,
      departement: u.departement,
      jeId: u.jeId,
    }),
    historique: historique.map((h) => ({
      id: h.id,
      annee: h.annee,
      anneeFin: h.anneeFin,
      poste: h.poste,
      organisation: h.organisation,
      description: h.description,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Profil vu par quelqu'un d'autre                                     */
/* ------------------------------------------------------------------ */

export type StatsProfil = {
  xp: number;
  niveau: number;
  titreNiveau: string;
  formationsTerminees: number;
  certificats: number;
  badges: number;
};

export type ProfilPublic = {
  id: string;
  nom: string;
  photoUrl: string | null;
  poste: string | null;
  departement: string | null;
  bio: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  lienWhatsapp: string | null;
  reseaux: { instagram?: string; facebook?: string; github?: string; site?: string; x?: string };
  roles: string[];
  je: { nom: string; sigle: string | null; couleur: string } | null;
  membreDepuis: Date;
  /** Null quand le lecteur n'a pas le droit de voir les statistiques. */
  stats: StatsProfil | null;
  historique: { id: string; annee: number; anneeFin: number | null; poste: string; organisation: string; description: string | null }[];
  cEstMoi: boolean;
};

/** Profil d'un membre. Null si introuvable ou hors de portée du lecteur. */
export async function profilPublic(lecteur: Utilisateur, id: string): Promise<ProfilPublic | null> {
  const [u] = await db
    .select({
      id: utilisateurs.id,
      nom: nomSql,
      photoUrl: utilisateurs.photoUrl,
      poste: utilisateurs.poste,
      departement: utilisateurs.departement,
      bio: utilisateurs.bio,
      linkedin: utilisateurs.linkedin,
      whatsapp: utilisateurs.whatsapp,
      reseaux: utilisateurs.reseaux,
      roles: utilisateurs.roles,
      xp: utilisateurs.xp,
      creeLe: utilisateurs.creeLe,
      visibleAnnuaire: utilisateurs.visibleAnnuaire,
      masquerStats: utilisateurs.masquerStats,
      actif: utilisateurs.actif,
      jeId: utilisateurs.jeId,
      jeNom: juniorEntreprises.nom,
      jeSigle: juniorEntreprises.sigle,
      jeCouleur: juniorEntreprises.couleur,
    })
    .from(utilisateurs)
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .where(eq(utilisateurs.id, id))
    .limit(1);
  if (!u || !u.actif) return null;

  const cible = { id: u.id, jeId: u.jeId, visibleAnnuaire: u.visibleAnnuaire, masquerStats: u.masquerStats, roles: u.roles };
  const moi = lecteurDe(lecteur);
  // Un formateur garde un profil consultable : c'est sa vitrine.
  const formateur = u.roles.includes("FORMATEUR");
  if (!peutVoirProfil(moi, cible) && !formateur) return null;

  const statsVisibles = peutVoirStats(moi, cible) || formateur;
  let stats: StatsProfil | null = null;
  if (statsVisibles) {
    const [[terminees], [certifs], [bdg]] = await Promise.all([
      db
        .select({ n: count() })
        .from(progressions)
        .where(and(eq(progressions.utilisateurId, u.id), eq(progressions.statut, "TERMINEE"))),
      db.select({ n: count() }).from(certificats).where(and(eq(certificats.utilisateurId, u.id), isNull(certificats.revoqueLe))),
      db.select({ n: count() }).from(badgesObtenus).where(eq(badgesObtenus.utilisateurId, u.id)),
    ]);
    const etat = etatNiveau(u.xp);
    stats = {
      xp: u.xp,
      niveau: etat.niveau,
      titreNiveau: etat.titre,
      formationsTerminees: terminees.n,
      certificats: certifs.n,
      badges: bdg.n,
    };
  }

  const historique = await db
    .select()
    .from(etapesHistoriqueJE)
    .where(eq(etapesHistoriqueJE.utilisateurId, u.id))
    .orderBy(desc(etapesHistoriqueJE.annee));

  return {
    id: u.id,
    nom: u.nom,
    photoUrl: u.photoUrl,
    poste: u.poste,
    departement: u.departement,
    bio: u.bio,
    linkedin: normaliserUrl(u.linkedin),
    whatsapp: u.whatsapp,
    // Le numéro ne s'affiche jamais en clair : seul le lien de discussion.
    lienWhatsapp: formateur ? lienWhatsapp(u.whatsapp, `Bonjour, je vous contacte depuis Cursus.`) : null,
    reseaux: u.reseaux,
    roles: u.roles,
    je: u.jeNom ? { nom: u.jeNom, sigle: u.jeSigle, couleur: u.jeCouleur ?? "#0f1226" } : null,
    membreDepuis: u.creeLe,
    stats,
    historique,
    cEstMoi: lecteur.id === u.id,
  };
}

/* ------------------------------------------------------------------ */
/* Annuaire                                                            */
/* ------------------------------------------------------------------ */

export type LigneAnnuaire = {
  id: string;
  nom: string;
  photoUrl: string | null;
  poste: string | null;
  roles: string[];
  je: string | null;
  jeCouleur: string;
  xp: number | null;
  niveau: number | null;
};

export type FiltresAnnuaire = { q?: string; jeId?: string; role?: string };

export async function annuaire(lecteur: Utilisateur, filtres: FiltresAnnuaire): Promise<LigneAnnuaire[]> {
  const conditions = [eq(utilisateurs.actif, true), isNotNull(utilisateurs.emailVerifieLe)];
  if (filtres.q) {
    const motif = `%${filtres.q}%`;
    conditions.push(
      or(
        sql`${nomSql} ilike ${motif}`,
        sql`${utilisateurs.poste} ilike ${motif}`,
        sql`${utilisateurs.departement} ilike ${motif}`
      )!
    );
  }
  if (filtres.jeId) conditions.push(eq(utilisateurs.jeId, filtres.jeId));
  if (filtres.role) conditions.push(sql`${filtres.role} = any(${utilisateurs.roles})`);

  const lignes = await db
    .select({
      id: utilisateurs.id,
      nom: nomSql,
      photoUrl: utilisateurs.photoUrl,
      poste: utilisateurs.poste,
      roles: utilisateurs.roles,
      xp: utilisateurs.xp,
      jeId: utilisateurs.jeId,
      jeNom: juniorEntreprises.nom,
      jeSigle: juniorEntreprises.sigle,
      jeCouleur: juniorEntreprises.couleur,
      visibleAnnuaire: utilisateurs.visibleAnnuaire,
      masquerStats: utilisateurs.masquerStats,
    })
    .from(utilisateurs)
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .where(and(...conditions))
    .orderBy(desc(utilisateurs.xp), asc(utilisateurs.prenom))
    .limit(300);

  const moi = lecteurDe(lecteur);
  return lignes
    .filter((l) =>
      figureDansAnnuaire(moi, {
        id: l.id,
        jeId: l.jeId,
        visibleAnnuaire: l.visibleAnnuaire,
        masquerStats: l.masquerStats,
        roles: l.roles,
      })
    )
    .map((l) => {
      const stats = peutVoirStats(moi, {
        id: l.id,
        jeId: l.jeId,
        visibleAnnuaire: l.visibleAnnuaire,
        masquerStats: l.masquerStats,
        roles: l.roles,
      });
      return {
        id: l.id,
        nom: l.nom,
        photoUrl: l.photoUrl,
        poste: l.poste,
        roles: l.roles,
        je: l.jeSigle ?? l.jeNom ?? null,
        jeCouleur: l.jeCouleur ?? "#0f1226",
        xp: stats ? l.xp : null,
        niveau: stats ? etatNiveau(l.xp).niveau : null,
      };
    });
}

/** Organisations représentées dans l'annuaire, pour le filtre. */
export async function jePourFiltre(): Promise<{ id: string; nom: string }[]> {
  return db
    .select({ id: juniorEntreprises.id, nom: sql<string>`coalesce(${juniorEntreprises.sigle}, ${juniorEntreprises.nom})` })
    .from(juniorEntreprises)
    .where(eq(juniorEntreprises.active, true))
    .orderBy(asc(juniorEntreprises.nom));
}

/* ------------------------------------------------------------------ */
/* Formateurs                                                          */
/* ------------------------------------------------------------------ */

export type LigneFormateur = {
  id: string;
  nom: string;
  photoUrl: string | null;
  poste: string | null;
  je: string | null;
  formations: number;
  apprenants: number;
  satisfaction: number | null;
};

/** Formateurs actifs, les plus suivis d'abord. */
export async function listeFormateurs(): Promise<LigneFormateur[]> {
  const lignes = await db
    .select({
      id: utilisateurs.id,
      nom: nomSql,
      photoUrl: utilisateurs.photoUrl,
      poste: utilisateurs.poste,
      jeNom: juniorEntreprises.nom,
      jeSigle: juniorEntreprises.sigle,
    })
    .from(utilisateurs)
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .where(and(eq(utilisateurs.actif, true), sql`'FORMATEUR' = any(${utilisateurs.roles})`))
    .orderBy(asc(utilisateurs.prenom));
  if (!lignes.length) return [];

  const ids = lignes.map((l) => l.id);
  const [parFormateur, satisfactions] = await Promise.all([
    db
      .select({
        formateurId: formations.formateurId,
        formations: sql<number>`count(distinct ${formations.id})`.mapWith(Number),
        apprenants: sql<number>`count(distinct ${progressions.utilisateurId})`.mapWith(Number),
      })
      .from(formations)
      .leftJoin(progressions, eq(progressions.formationId, formations.id))
      .where(and(inArray(formations.formateurId, ids), eq(formations.statut, "PUBLIE")))
      .groupBy(formations.formateurId),
    db
      .select({ formateurId: formations.formateurId, note: avg(enquetes.noteFormateur) })
      .from(enquetes)
      .innerJoin(formations, eq(formations.id, enquetes.formationId))
      .where(inArray(formations.formateurId, ids))
      .groupBy(formations.formateurId),
  ]);

  const iStats = new Map(parFormateur.map((p) => [p.formateurId, p]));
  const iSat = new Map(satisfactions.map((s) => [s.formateurId, s.note === null ? null : Number(s.note)]));

  return lignes
    .map((l) => ({
      id: l.id,
      nom: l.nom,
      photoUrl: l.photoUrl,
      poste: l.poste,
      je: l.jeSigle ?? l.jeNom ?? null,
      formations: iStats.get(l.id)?.formations ?? 0,
      apprenants: iStats.get(l.id)?.apprenants ?? 0,
      satisfaction: (() => {
        const n = iSat.get(l.id);
        return n === null || n === undefined ? null : Math.round(n * 10) / 10;
      })(),
    }))
    .sort((a, b) => b.apprenants - a.apprenants || a.nom.localeCompare(b.nom, "fr"));
}

export type ProfilFormateur = {
  profil: ProfilPublic;
  stats: { formations: number; apprenants: number; terminees: number; satisfaction: number | null; note: number | null; avis: number };
  formations: { id: string; slug: string; titre: string; domaine: string; couleur: string; dureeSec: number; apprenants: number; note: number | null }[];
};

/** Profil formateur : la vitrine, avec ses formations et sa satisfaction. */
export async function profilFormateur(lecteur: Utilisateur, id: string): Promise<ProfilFormateur | null> {
  const profil = await profilPublic(lecteur, id);
  if (!profil || !profil.roles.includes("FORMATEUR")) return null;

  const [sesFormations, [satisfaction], [moyenne]] = await Promise.all([
    db
      .select({
        id: formations.id,
        slug: formations.slug,
        titre: formations.titre,
        domaine: domaines.nom,
        couleur: domaines.couleur,
        dureeSec: formations.dureeSec,
        apprenants: sql<number>`count(distinct ${progressions.utilisateurId})`.mapWith(Number),
        note: sql<number | null>`avg(${notations.note})`.mapWith((v) => (v === null ? null : Math.round(Number(v) * 10) / 10)),
      })
      .from(formations)
      .innerJoin(domaines, eq(domaines.id, formations.domaineId))
      .leftJoin(progressions, eq(progressions.formationId, formations.id))
      .leftJoin(notations, eq(notations.formationId, formations.id))
      .where(and(eq(formations.formateurId, id), eq(formations.statut, "PUBLIE")))
      .groupBy(formations.id, domaines.nom, domaines.couleur)
      .orderBy(desc(sql`count(distinct ${progressions.utilisateurId})`)),
    db
      .select({ note: avg(enquetes.noteFormateur), avis: count() })
      .from(enquetes)
      .innerJoin(formations, eq(formations.id, enquetes.formationId))
      .where(eq(formations.formateurId, id)),
    db
      .select({ note: avg(notations.note), avis: count() })
      .from(notations)
      .innerJoin(formations, eq(formations.id, notations.formationId))
      .where(eq(formations.formateurId, id)),
  ]);

  const [terminees] = await db
    .select({ n: count() })
    .from(progressions)
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .where(and(eq(formations.formateurId, id), eq(progressions.statut, "TERMINEE")));

  // Un apprenant qui suit deux formations du même formateur ne compte qu'une fois.
  const [{ total }] = await db
    .select({ total: sql<number>`count(distinct ${progressions.utilisateurId})`.mapWith(Number) })
    .from(progressions)
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .where(eq(formations.formateurId, id));

  return {
    profil,
    stats: {
      formations: sesFormations.length,
      apprenants: total,
      terminees: terminees.n,
      satisfaction: satisfaction.note === null ? null : Math.round(Number(satisfaction.note) * 10) / 10,
      note: moyenne.note === null ? null : Math.round(Number(moyenne.note) * 10) / 10,
      avis: moyenne.avis,
    },
    formations: sesFormations,
  };
}
