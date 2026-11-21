import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  certificats,
  competences,
  domaines,
  enquetes,
  formations,
  juniorEntreprises,
  niveauxCompetence,
  notations,
  progressions,
  utilisateurs,
} from "@/db/schema";
import { moyenne, nps } from "@/services/notation";
import { derniersMois, heuresDepuisSecondes, serieMensuelle } from "@/services/rapports";

/** Tout ce que le tableau de bord « Pilotage » affiche, en une passe. */
export async function donneesPilotage(maintenant: Date = new Date()) {
  const il30Jours = new Date(maintenant.getTime() - 30 * 24 * 3600 * 1000);
  const fenetre = derniersMois(6, maintenant);
  const debutFenetre = new Date(`${fenetre[0].cle}-01T00:00:00Z`);

  const [
    [jes],
    [membres],
    [publiees],
    [terminees],
    [vues],
    [certs],
    chaud,
    parMois,
    parDomaine,
    top,
    notesFormations,
    listeJes,
    membresParJe,
    activiteParJe,
    certsParJe,
    niveauParJe,
    chaleur,
    listeDomaines,
  ] = await Promise.all([
    db.select({ n: count() }).from(juniorEntreprises).where(eq(juniorEntreprises.active, true)),
    db.select({ n: count() }).from(utilisateurs).where(eq(utilisateurs.actif, true)),
    db.select({ n: count() }).from(formations).where(eq(formations.statut, "PUBLIE")),
    db
      .select({
        total: count(),
        recentes: sql<number>`count(*) filter (where ${progressions.termineeLe} >= ${il30Jours.toISOString()}::timestamptz)`.mapWith(Number),
      })
      .from(progressions)
      .where(eq(progressions.statut, "TERMINEE")),
    db.select({ secondes: sql<number>`coalesce(sum(${progressions.secondesVues}), 0)`.mapWith(Number) }).from(progressions),
    db.select({ n: count() }).from(certificats).where(isNull(certificats.revoqueLe)),
    db
      .select({ note: enquetes.noteContenu, reco: enquetes.recommandation })
      .from(enquetes)
      .where(eq(enquetes.type, "CHAUD")),
    db
      .select({
        mois: sql<string>`to_char(date_trunc('month', ${progressions.termineeLe} at time zone 'UTC'), 'YYYY-MM')`,
        n: count(),
      })
      .from(progressions)
      .where(and(eq(progressions.statut, "TERMINEE"), gte(progressions.termineeLe, debutFenetre)))
      .groupBy(sql`1`),
    db
      .select({ id: domaines.id, nom: domaines.nom, couleur: domaines.couleur, n: count(progressions.id) })
      .from(domaines)
      .leftJoin(formations, eq(formations.domaineId, domaines.id))
      .leftJoin(progressions, and(eq(progressions.formationId, formations.id), eq(progressions.statut, "TERMINEE")))
      .groupBy(domaines.id)
      .orderBy(desc(count(progressions.id)), asc(domaines.ordre)),
    db
      .select({
        id: formations.id,
        titre: formations.titre,
        couleur: domaines.couleur,
        domaine: domaines.nom,
        n: count(),
      })
      .from(progressions)
      .innerJoin(formations, eq(formations.id, progressions.formationId))
      .innerJoin(domaines, eq(domaines.id, formations.domaineId))
      .where(eq(progressions.statut, "TERMINEE"))
      .groupBy(formations.id, domaines.id)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({ formationId: notations.formationId, moyenne: sql<number>`avg(${notations.note})`.mapWith(Number), n: count() })
      .from(notations)
      .groupBy(notations.formationId),
    db
      .select({ id: juniorEntreprises.id, nom: juniorEntreprises.nom, sigle: juniorEntreprises.sigle, couleur: juniorEntreprises.couleur })
      .from(juniorEntreprises)
      .where(eq(juniorEntreprises.active, true))
      .orderBy(asc(juniorEntreprises.nom)),
    db
      .select({ jeId: utilisateurs.jeId, n: count() })
      .from(utilisateurs)
      .where(and(eq(utilisateurs.actif, true), isNotNull(utilisateurs.jeId)))
      .groupBy(utilisateurs.jeId),
    db
      .select({
        jeId: utilisateurs.jeId,
        terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
        secondes: sql<number>`coalesce(sum(${progressions.secondesVues}), 0)`.mapWith(Number),
      })
      .from(progressions)
      .innerJoin(utilisateurs, eq(utilisateurs.id, progressions.utilisateurId))
      .where(isNotNull(utilisateurs.jeId))
      .groupBy(utilisateurs.jeId),
    db
      .select({ jeId: utilisateurs.jeId, n: count() })
      .from(certificats)
      .innerJoin(utilisateurs, eq(utilisateurs.id, certificats.utilisateurId))
      .where(and(isNull(certificats.revoqueLe), isNotNull(utilisateurs.jeId)))
      .groupBy(utilisateurs.jeId),
    db
      .select({
        jeId: utilisateurs.jeId,
        niveau: sql<number>`avg(${niveauxCompetence.niveau})`.mapWith(Number),
        mesures: countDistinct(niveauxCompetence.utilisateurId),
      })
      .from(niveauxCompetence)
      .innerJoin(utilisateurs, eq(utilisateurs.id, niveauxCompetence.utilisateurId))
      .where(isNotNull(utilisateurs.jeId))
      .groupBy(utilisateurs.jeId),
    db
      .select({
        jeId: utilisateurs.jeId,
        domaineId: competences.domaineId,
        niveau: sql<number>`avg(${niveauxCompetence.niveau})`.mapWith(Number),
        membres: countDistinct(niveauxCompetence.utilisateurId),
      })
      .from(niveauxCompetence)
      .innerJoin(utilisateurs, eq(utilisateurs.id, niveauxCompetence.utilisateurId))
      .innerJoin(competences, eq(competences.id, niveauxCompetence.competenceId))
      .where(isNotNull(utilisateurs.jeId))
      .groupBy(utilisateurs.jeId, competences.domaineId),
    db
      .select({ id: domaines.id, nom: domaines.nom, couleur: domaines.couleur, icone: domaines.icone })
      .from(domaines)
      .orderBy(asc(domaines.ordre)),
  ]);

  const notes = new Map(notesFormations.map((n) => [n.formationId, n]));
  const index = <T extends { jeId: string | null }>(l: T[]) => new Map(l.map((x) => [x.jeId ?? "", x]));
  const iMembres = index(membresParJe);
  const iActivite = index(activiteParJe);
  const iCerts = index(certsParJe);
  const iNiveau = index(niveauParJe);

  return {
    indicateurs: {
      jesActives: jes.n,
      membres: membres.n,
      formationsPubliees: publiees.n,
      formationsTerminees: terminees.total,
      formationsTermineesRecentes: terminees.recentes,
      heuresVues: heuresDepuisSecondes(vues.secondes),
      certificats: certs.n,
      satisfaction: moyenne(chaud.map((c) => c.note)),
      nps: nps(chaud.map((c) => c.reco)),
      reponsesEnquetes: chaud.length,
    },
    parMois: serieMensuelle(parMois, fenetre),
    parDomaine: parDomaine.map((d) => ({ id: d.id, libelle: d.nom, couleur: d.couleur, valeur: d.n })),
    top: top.map((t) => ({
      ...t,
      note: notes.get(t.id)?.moyenne ?? null,
      notes: notes.get(t.id)?.n ?? 0,
    })),
    jes: listeJes.map((j) => ({
      ...j,
      membres: iMembres.get(j.id)?.n ?? 0,
      terminees: iActivite.get(j.id)?.terminees ?? 0,
      heures: heuresDepuisSecondes(iActivite.get(j.id)?.secondes ?? 0),
      certificats: iCerts.get(j.id)?.n ?? 0,
      niveau: iNiveau.get(j.id)?.niveau ?? null,
      membresMesures: iNiveau.get(j.id)?.mesures ?? 0,
    })),
    chaleur: chaleur
      .filter((c) => c.jeId)
      .map((c) => ({ ligne: c.jeId as string, colonne: c.domaineId, valeur: c.niveau, membres: c.membres })),
    domaines: listeDomaines,
  };
}

export type DonneesPilotage = Awaited<ReturnType<typeof donneesPilotage>>;
