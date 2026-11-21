import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { asc, count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  certificats,
  competences,
  domaines,
  enquetes,
  formations,
  historiqueNiveaux,
  juniorEntreprises,
  niveauxCompetence,
  notations,
  parcours,
  progressions,
  utilisateurs,
} from "@/db/schema";
import { libelleRole } from "@/services/rbac";
import {
  satisfactionParFormation,
  tabulerCertificats,
  tabulerCompetences,
  tabulerFormations,
  tabulerHistorique,
  tabulerMembres,
  type Tabulaire,
  type TypeRapport,
} from "@/services/rapports";
import { etatNiveau } from "@/services/xp";

const auteur = alias(utilisateurs, "auteur");

async function rapportMembres(): Promise<Tabulaire> {
  const [lignes, activite, certs] = await Promise.all([
    db
      .select({
        id: utilisateurs.id,
        prenom: utilisateurs.prenom,
        nom: utilisateurs.nom,
        email: utilisateurs.email,
        je: juniorEntreprises.nom,
        roles: utilisateurs.roles,
        rattachement: utilisateurs.rattachement,
        actif: utilisateurs.actif,
        xp: utilisateurs.xp,
        creeLe: utilisateurs.creeLe,
        dernierAcces: utilisateurs.dernierAcces,
      })
      .from(utilisateurs)
      .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
      .orderBy(asc(juniorEntreprises.nom), asc(utilisateurs.nom), asc(utilisateurs.prenom)),
    db
      .select({
        id: progressions.utilisateurId,
        secondes: sql<number>`coalesce(sum(${progressions.secondesVues}), 0)`.mapWith(Number),
        terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
      })
      .from(progressions)
      .groupBy(progressions.utilisateurId),
    db
      .select({ id: certificats.utilisateurId, n: count() })
      .from(certificats)
      .where(isNull(certificats.revoqueLe))
      .groupBy(certificats.utilisateurId),
  ]);
  const iAct = new Map(activite.map((a) => [a.id, a]));
  const iCert = new Map(certs.map((c) => [c.id, c.n]));
  return tabulerMembres(
    lignes.map((l) => ({
      ...l,
      niveau: etatNiveau(l.xp).niveau,
      secondesVues: iAct.get(l.id)?.secondes ?? 0,
      formationsTerminees: iAct.get(l.id)?.terminees ?? 0,
      certificats: iCert.get(l.id) ?? 0,
    })),
    libelleRole
  );
}

async function rapportFormations(): Promise<Tabulaire> {
  const [lignes, progres, notes, chaud] = await Promise.all([
    db
      .select({
        id: formations.id,
        titre: formations.titre,
        domaine: domaines.nom,
        statut: formations.statut,
        auteurPrenom: auteur.prenom,
        auteurNom: auteur.nom,
        dureeSec: formations.dureeSec,
      })
      .from(formations)
      .innerJoin(domaines, eq(domaines.id, formations.domaineId))
      .innerJoin(auteur, eq(auteur.id, formations.auteurId))
      .orderBy(asc(domaines.ordre), asc(formations.titre)),
    db
      .select({
        id: progressions.formationId,
        inscrits: count(),
        terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
      })
      .from(progressions)
      .groupBy(progressions.formationId),
    db
      .select({ id: notations.formationId, moyenne: sql<number>`avg(${notations.note})`.mapWith(Number), n: count() })
      .from(notations)
      .groupBy(notations.formationId),
    db
      .select({ formationId: enquetes.formationId, noteContenu: enquetes.noteContenu, recommandation: enquetes.recommandation })
      .from(enquetes)
      .where(eq(enquetes.type, "CHAUD")),
  ]);
  const iProg = new Map(progres.map((p) => [p.id, p]));
  const iNotes = new Map(notes.map((n) => [n.id, n]));
  return tabulerFormations(
    lignes.map((l) => ({
      id: l.id,
      titre: l.titre,
      domaine: l.domaine,
      statut: l.statut,
      auteur: `${l.auteurPrenom} ${l.auteurNom}`,
      dureeSec: l.dureeSec,
      inscrits: iProg.get(l.id)?.inscrits ?? 0,
      terminees: iProg.get(l.id)?.terminees ?? 0,
      noteMoyenne: iNotes.get(l.id)?.moyenne ?? null,
      notes: iNotes.get(l.id)?.n ?? 0,
    })),
    satisfactionParFormation(chaud)
  );
}

async function rapportCompetences(): Promise<Tabulaire> {
  const lignes = await db
    .select({
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      je: juniorEntreprises.nom,
      domaine: domaines.nom,
      competence: competences.nom,
      jeCompetence: competences.jeId,
      niveauInitial: niveauxCompetence.niveauInitial,
      niveau: niveauxCompetence.niveau,
      majLe: niveauxCompetence.majLe,
    })
    .from(niveauxCompetence)
    .innerJoin(utilisateurs, eq(utilisateurs.id, niveauxCompetence.utilisateurId))
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .innerJoin(competences, eq(competences.id, niveauxCompetence.competenceId))
    .innerJoin(domaines, eq(domaines.id, competences.domaineId))
    .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom), asc(domaines.ordre), asc(competences.ordre));
  return tabulerCompetences(
    lignes.map((l) => ({
      membre: `${l.prenom} ${l.nom}`,
      email: l.email,
      je: l.je,
      domaine: l.domaine,
      competence: l.competence,
      adaptee: l.jeCompetence !== null,
      niveauInitial: l.niveauInitial,
      niveau: l.niveau,
      majLe: l.majLe,
    }))
  );
}

async function rapportHistorique(): Promise<Tabulaire> {
  const lignes = await db
    .select({
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      je: juniorEntreprises.nom,
      domaine: domaines.nom,
      competence: competences.nom,
      date: historiqueNiveaux.creeLe,
      niveau: historiqueNiveaux.niveau,
      variation: historiqueNiveaux.variation,
      source: historiqueNiveaux.source,
      libelle: historiqueNiveaux.libelle,
    })
    .from(historiqueNiveaux)
    .innerJoin(utilisateurs, eq(utilisateurs.id, historiqueNiveaux.utilisateurId))
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .innerJoin(competences, eq(competences.id, historiqueNiveaux.competenceId))
    .innerJoin(domaines, eq(domaines.id, competences.domaineId))
    .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom), asc(competences.nom), asc(historiqueNiveaux.creeLe));
  return tabulerHistorique(
    lignes.map((l) => ({
      membre: `${l.prenom} ${l.nom}`,
      email: l.email,
      je: l.je,
      domaine: l.domaine,
      competence: l.competence,
      date: l.date,
      niveau: l.niveau,
      variation: l.variation,
      source: l.source,
      libelle: l.libelle,
    }))
  );
}

async function rapportCertificats(): Promise<Tabulaire> {
  const lignes = await db
    .select({
      numero: certificats.numero,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      je: juniorEntreprises.nom,
      parcours: parcours.titre,
      emisLe: certificats.emisLe,
      revoqueLe: certificats.revoqueLe,
      motifRevocation: certificats.motifRevocation,
      consultations: certificats.consultations,
    })
    .from(certificats)
    .innerJoin(utilisateurs, eq(utilisateurs.id, certificats.utilisateurId))
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .innerJoin(parcours, eq(parcours.id, certificats.parcoursId))
    .orderBy(asc(certificats.emisLe));
  return tabulerCertificats(lignes.map((l) => ({ ...l, membre: `${l.prenom} ${l.nom}` })));
}

export async function donneesRapport(type: TypeRapport): Promise<Tabulaire> {
  switch (type) {
    case "membres":
      return rapportMembres();
    case "formations":
      return rapportFormations();
    case "competences":
      return rapportCompetences();
    case "historique":
      return rapportHistorique();
    case "certificats":
      return rapportCertificats();
  }
}

/** Nombre de lignes de chaque export, pour la page des rapports. */
export async function volumesRapports(): Promise<Record<TypeRapport, number>> {
  const [[m], [f], [c], [h], [cert]] = await Promise.all([
    db.select({ n: count() }).from(utilisateurs),
    db.select({ n: count() }).from(formations),
    db.select({ n: count() }).from(niveauxCompetence),
    db.select({ n: count() }).from(historiqueNiveaux),
    db.select({ n: count() }).from(certificats).where(isNotNull(certificats.numero)),
  ]);
  return { membres: m.n, formations: f.n, competences: c.n, historique: h.n, certificats: cert.n };
}
