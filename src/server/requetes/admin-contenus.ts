import "server-only";
import { asc, count, countDistinct, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { domaines, etapesParcours, formations, parcours, progressions, utilisateurs } from "@/db/schema";

export async function contenusAdmin() {
  const [listeFormations, progres, etapesParFormation, listeParcours, etapes, listeDomaines] = await Promise.all([
    db
      .select({
        id: formations.id,
        titre: formations.titre,
        statut: formations.statut,
        visibleCatalogue: formations.visibleCatalogue,
        domaineId: formations.domaineId,
        domaine: domaines.nom,
        couleur: domaines.couleur,
        auteurId: formations.auteurId,
        auteurPrenom: utilisateurs.prenom,
        auteurNom: utilisateurs.nom,
        dureeSec: formations.dureeSec,
        publieLe: formations.publieLe,
        majLe: formations.majLe,
      })
      .from(formations)
      .innerJoin(domaines, eq(domaines.id, formations.domaineId))
      .innerJoin(utilisateurs, eq(utilisateurs.id, formations.auteurId))
      .orderBy(desc(formations.majLe)),
    db
      .select({
        id: progressions.formationId,
        inscrits: count(),
        terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
      })
      .from(progressions)
      .groupBy(progressions.formationId),
    db
      .select({ id: etapesParcours.formationId, n: countDistinct(etapesParcours.parcoursId) })
      .from(etapesParcours)
      .innerJoin(parcours, eq(parcours.id, etapesParcours.parcoursId))
      .where(eq(parcours.statut, "PUBLIE"))
      .groupBy(etapesParcours.formationId),
    db
      .select({
        id: parcours.id,
        titre: parcours.titre,
        statut: parcours.statut,
        domaineId: parcours.domaineId,
        domaine: domaines.nom,
        couleur: domaines.couleur,
        auteurId: parcours.auteurId,
        auteurPrenom: utilisateurs.prenom,
        auteurNom: utilisateurs.nom,
        publieLe: parcours.publieLe,
        majLe: parcours.majLe,
      })
      .from(parcours)
      .innerJoin(domaines, eq(domaines.id, parcours.domaineId))
      .innerJoin(utilisateurs, eq(utilisateurs.id, parcours.auteurId))
      .orderBy(desc(parcours.majLe)),
    db.select({ id: etapesParcours.parcoursId, n: count() }).from(etapesParcours).groupBy(etapesParcours.parcoursId),
    db.select({ id: domaines.id, nom: domaines.nom }).from(domaines).orderBy(asc(domaines.ordre)),
  ]);
  const iProg = new Map(progres.map((p) => [p.id, p]));
  const iLies = new Map(etapesParFormation.map((e) => [e.id, e.n]));
  const iEtapes = new Map(etapes.map((e) => [e.id, e.n]));

  return {
    formations: listeFormations.map((f) => ({
      id: f.id,
      titre: f.titre,
      statut: f.statut,
      capsule: !f.visibleCatalogue,
      domaineId: f.domaineId,
      domaine: f.domaine,
      couleur: f.couleur,
      auteurId: f.auteurId,
      auteur: `${f.auteurPrenom} ${f.auteurNom}`,
      dureeMin: Math.round(f.dureeSec / 60),
      dejaPublie: !!f.publieLe,
      majLe: f.majLe,
      inscrits: iProg.get(f.id)?.inscrits ?? 0,
      terminees: iProg.get(f.id)?.terminees ?? 0,
      parcoursLies: iLies.get(f.id) ?? 0,
    })),
    parcours: listeParcours.map((p) => ({
      id: p.id,
      titre: p.titre,
      statut: p.statut,
      domaineId: p.domaineId,
      domaine: p.domaine,
      couleur: p.couleur,
      auteurId: p.auteurId,
      auteur: `${p.auteurPrenom} ${p.auteurNom}`,
      dejaPublie: !!p.publieLe,
      majLe: p.majLe,
      etapes: iEtapes.get(p.id) ?? 0,
    })),
    domaines: listeDomaines,
  };
}

export type ContenusAdmin = Awaited<ReturnType<typeof contenusAdmin>>;
