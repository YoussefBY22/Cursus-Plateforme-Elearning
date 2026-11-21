import "server-only";
import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { juniorEntreprises, progressions, utilisateurs } from "@/db/schema";

export async function listeOrganisations() {
  const [jes, membres, rh, terminees] = await Promise.all([
    db.select().from(juniorEntreprises).orderBy(asc(juniorEntreprises.nom)),
    db
      .select({
        jeId: utilisateurs.jeId,
        actifs: sql<number>`count(*) filter (where ${utilisateurs.actif})`.mapWith(Number),
        enAttente: sql<number>`count(*) filter (where ${utilisateurs.actif} and ${utilisateurs.rattachement} = 'EN_ATTENTE')`.mapWith(Number),
      })
      .from(utilisateurs)
      .where(isNotNull(utilisateurs.jeId))
      .groupBy(utilisateurs.jeId),
    db
      .select({ jeId: utilisateurs.jeId, prenom: utilisateurs.prenom, nom: utilisateurs.nom, id: utilisateurs.id })
      .from(utilisateurs)
      .where(and(eq(utilisateurs.actif, true), sql`'RESP_RH' = any(${utilisateurs.roles})`, isNotNull(utilisateurs.jeId)))
      .orderBy(asc(utilisateurs.nom)),
    db
      .select({ jeId: utilisateurs.jeId, n: count() })
      .from(progressions)
      .innerJoin(utilisateurs, eq(utilisateurs.id, progressions.utilisateurId))
      .where(and(eq(progressions.statut, "TERMINEE"), isNotNull(utilisateurs.jeId)))
      .groupBy(utilisateurs.jeId),
  ]);
  const iMembres = new Map(membres.map((m) => [m.jeId, m]));
  const iTerminees = new Map(terminees.map((t) => [t.jeId, t.n]));
  return jes.map((j) => ({
    id: j.id,
    nom: j.nom,
    slug: j.slug,
    sigle: j.sigle,
    ville: j.ville,
    ecole: j.ecole,
    couleur: j.couleur,
    active: j.active,
    creeLe: j.creeLe,
    membres: iMembres.get(j.id)?.actifs ?? 0,
    enAttente: iMembres.get(j.id)?.enAttente ?? 0,
    rh: rh.filter((r) => r.jeId === j.id).map((r) => ({ id: r.id, nom: `${r.prenom} ${r.nom}` })),
    terminees: iTerminees.get(j.id) ?? 0,
  }));
}

export type LigneJE = Awaited<ReturnType<typeof listeOrganisations>>[number];
