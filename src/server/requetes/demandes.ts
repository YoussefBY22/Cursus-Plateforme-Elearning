import "server-only";
import { and, countDistinct, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  demandesFormation,
  domaines,
  formations,
  juniorEntreprises,
  utilisateurs,
  votesDemandeFormation,
} from "@/db/schema";
import { scoreDemande } from "@/services/tendances";

export type DemandeVue = {
  id: string;
  titre: string;
  description: string;
  statut: "OUVERTE" | "PLANIFIEE" | "SATISFAITE" | "REFUSEE";
  reponse: string | null;
  creeLe: Date;
  domaine: { id: string; nom: string; couleur: string } | null;
  demandeur: { id: string; nom: string; photo: string | null };
  je: string | null;
  formation: { titre: string; slug: string } | null;
  votes: number;
  /** Nombre d'organisation distinctes représentées parmi les votants et le demandeur. */
  jes: number;
  /** L'utilisateur courant a-t-il voté ? */
  vote: boolean;
  /** Peut-il retirer sa demande ? (la sienne, encore ouverte) */
  sienne: boolean;
};

/**
 * Le mur des demandes de formation.
 *
 * Les demandes ouvertes passent devant, classées par le score qui mêle
 * votes, portée inter-organisation et fraîcheur ; les demandes traitées suivent, par
 * date, pour que chacun voie ce que la plateforme en a fait.
 */
export async function listerDemandes(utilisateurId: string, maintenant: Date = new Date()): Promise<DemandeVue[]> {
  const votants = db
    .select({
      demandeId: votesDemandeFormation.demandeId,
      votes: countDistinct(votesDemandeFormation.utilisateurId).as("votes"),
      jes: countDistinct(utilisateurs.jeId).as("jes"),
    })
    .from(votesDemandeFormation)
    .innerJoin(utilisateurs, eq(utilisateurs.id, votesDemandeFormation.utilisateurId))
    .groupBy(votesDemandeFormation.demandeId)
    .as("votants");

  const lignes = await db
    .select({
      id: demandesFormation.id,
      titre: demandesFormation.titre,
      description: demandesFormation.description,
      statut: demandesFormation.statut,
      reponse: demandesFormation.reponse,
      creeLe: demandesFormation.creeLe,
      domaineId: domaines.id,
      domaineNom: domaines.nom,
      domaineCouleur: domaines.couleur,
      demandeurId: utilisateurs.id,
      demandeurNom: sql<string>`${utilisateurs.prenom} || ' ' || ${utilisateurs.nom}`,
      demandeurPhoto: utilisateurs.photoUrl,
      je: juniorEntreprises.sigle,
      jeNom: juniorEntreprises.nom,
      formationTitre: formations.titre,
      formationSlug: formations.slug,
      votes: sql<number>`coalesce(${votants.votes}, 0)`.mapWith(Number),
      jes: sql<number>`coalesce(${votants.jes}, 0)`.mapWith(Number),
      vote: sql<boolean>`exists (select 1 from ${votesDemandeFormation} v where v.demande_id = ${demandesFormation.id} and v.utilisateur_id = ${utilisateurId})`,
    })
    .from(demandesFormation)
    .innerJoin(utilisateurs, eq(utilisateurs.id, demandesFormation.demandeurId))
    .leftJoin(domaines, eq(domaines.id, demandesFormation.domaineId))
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, demandesFormation.jeId))
    .leftJoin(formations, eq(formations.id, demandesFormation.formationId))
    .leftJoin(votants, eq(votants.demandeId, demandesFormation.id))
    .orderBy(desc(demandesFormation.creeLe));

  return lignes
    .map((l) => ({
      id: l.id,
      titre: l.titre,
      description: l.description,
      statut: l.statut,
      reponse: l.reponse,
      creeLe: l.creeLe,
      domaine: l.domaineId ? { id: l.domaineId, nom: l.domaineNom!, couleur: l.domaineCouleur! } : null,
      demandeur: { id: l.demandeurId, nom: l.demandeurNom, photo: l.demandeurPhoto },
      je: l.je ?? l.jeNom,
      formation: l.formationSlug ? { titre: l.formationTitre!, slug: l.formationSlug } : null,
      votes: l.votes,
      jes: l.jes,
      vote: l.vote,
      sienne: l.demandeurId === utilisateurId && l.statut === "OUVERTE",
    }))
    .sort((a, b) => {
      const ouverte = Number(b.statut === "OUVERTE") - Number(a.statut === "OUVERTE");
      if (ouverte !== 0) return ouverte;
      if (a.statut !== "OUVERTE") return b.creeLe.getTime() - a.creeLe.getTime();
      return (
        scoreDemande({ votes: b.votes, jes: b.jes, creeLe: b.creeLe }, maintenant) -
        scoreDemande({ votes: a.votes, jes: a.jes, creeLe: a.creeLe }, maintenant)
      );
    });
}

/** Domaines du référentiel, pour rattacher une demande. */
export async function domainesPourDemande() {
  return db
    .select({ id: domaines.id, nom: domaines.nom })
    .from(domaines)
    .orderBy(domaines.ordre);
}

/** Compte des demandes ouvertes, pour la pastille du menu. */
export async function demandesOuvertes(): Promise<number> {
  const [r] = await db
    .select({ n: countDistinct(demandesFormation.id) })
    .from(demandesFormation)
    .where(eq(demandesFormation.statut, "OUVERTE"));
  return r?.n ?? 0;
}

/** Les domaines les plus réclamés, pour le pilotage de l'offre. */
export async function demandeParDomaine() {
  return db
    .select({
      id: domaines.id,
      nom: domaines.nom,
      couleur: domaines.couleur,
      demandes: countDistinct(demandesFormation.id),
    })
    .from(domaines)
    .leftJoin(
      demandesFormation,
      and(eq(demandesFormation.domaineId, domaines.id), eq(demandesFormation.statut, "OUVERTE"))
    )
    .groupBy(domaines.id)
    .orderBy(desc(countDistinct(demandesFormation.id)));
}
