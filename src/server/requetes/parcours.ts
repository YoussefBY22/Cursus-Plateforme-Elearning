import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  certificats,
  domaines,
  etapesParcours,
  formations,
  inscriptionsParcours,
  parcours,
  progressions,
  utilisateurs,
} from "@/db/schema";

/**
 * Parcours certifiants — suites ordonnées de formations qui donnent droit à
 * un certificat une fois toutes les étapes terminées.
 *
 * Le parcours ne verrouille pas les étapes : on peut commencer par celle qui
 * manque. L'ordre est une recommandation, pas une barrière — contrairement
 * aux quiz à l'intérieur d'une formation, qui, eux, bloquent.
 */

export type EtapeParcours = {
  id: string;
  ordre: number;
  titre: string;
  formation: {
    id: string;
    slug: string;
    titre: string;
    resume: string;
    dureeSec: number;
    niveau: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  };
  statut: "TERMINEE" | "EN_COURS" | "ENQUETE_REQUISE" | null;
  couverture: number;
};

export type CarteParcours = {
  id: string;
  slug: string;
  titre: string;
  sousTitre: string | null;
  description: string;
  imageUrl: string | null;
  domaine: { nom: string; couleur: string; icone: string };
  nbEtapes: number;
  dureeSec: number;
  etapesTerminees: number;
  inscrit: boolean;
  termineLe: Date | null;
};

async function avancementPar(utilisateurId: string, parcoursIds: string[]) {
  if (!parcoursIds.length) return new Map<string, number>();
  const lignes = await db
    .select({
      parcoursId: etapesParcours.parcoursId,
      terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
    })
    .from(etapesParcours)
    .leftJoin(
      progressions,
      and(eq(progressions.formationId, etapesParcours.formationId), eq(progressions.utilisateurId, utilisateurId))
    )
    .where(inArray(etapesParcours.parcoursId, parcoursIds))
    .groupBy(etapesParcours.parcoursId);
  return new Map(lignes.map((l) => [l.parcoursId, l.terminees]));
}

export async function listeParcours(utilisateurId: string): Promise<CarteParcours[]> {
  const lignes = await db
    .select({
      id: parcours.id,
      slug: parcours.slug,
      titre: parcours.titre,
      sousTitre: parcours.sousTitre,
      description: parcours.description,
      imageUrl: parcours.imageUrl,
      domaineNom: domaines.nom,
      domaineCouleur: domaines.couleur,
      domaineIcone: domaines.icone,
      nbEtapes: sql<number>`(select count(*) from etape_parcours e where e.parcours_id = ${parcours.id})`.mapWith(Number),
      dureeSec:
        sql<number>`(select coalesce(sum(f.duree_sec), 0) from etape_parcours e join formation f on f.id = e.formation_id where e.parcours_id = ${parcours.id})`.mapWith(
          Number
        ),
      inscritLe: inscriptionsParcours.demarreLe,
      termineLe: inscriptionsParcours.termineLe,
    })
    .from(parcours)
    .innerJoin(domaines, eq(domaines.id, parcours.domaineId))
    .leftJoin(
      inscriptionsParcours,
      and(eq(inscriptionsParcours.parcoursId, parcours.id), eq(inscriptionsParcours.utilisateurId, utilisateurId))
    )
    .where(eq(parcours.statut, "PUBLIE"))
    .orderBy(asc(domaines.ordre), asc(parcours.titre));

  const avancement = await avancementPar(
    utilisateurId,
    lignes.map((l) => l.id)
  );

  return lignes.map((l) => ({
    id: l.id,
    slug: l.slug,
    titre: l.titre,
    sousTitre: l.sousTitre,
    description: l.description,
    imageUrl: l.imageUrl,
    domaine: { nom: l.domaineNom, couleur: l.domaineCouleur, icone: l.domaineIcone },
    nbEtapes: l.nbEtapes,
    dureeSec: l.dureeSec,
    etapesTerminees: avancement.get(l.id) ?? 0,
    inscrit: Boolean(l.inscritLe),
    termineLe: l.termineLe,
  }));
}

export type DetailParcours = NonNullable<Awaited<ReturnType<typeof detailParcours>>>;

export async function detailParcours(slug: string, utilisateurId: string) {
  const [p] = await db
    .select({
      id: parcours.id,
      slug: parcours.slug,
      titre: parcours.titre,
      sousTitre: parcours.sousTitre,
      description: parcours.description,
      imageUrl: parcours.imageUrl,
      intituleCertificat: parcours.intituleCertificat,
      auteurId: parcours.auteurId,
      domaine: { nom: domaines.nom, couleur: domaines.couleur, icone: domaines.icone },
    })
    .from(parcours)
    .innerJoin(domaines, eq(domaines.id, parcours.domaineId))
    .where(and(eq(parcours.slug, slug), eq(parcours.statut, "PUBLIE")))
    .limit(1);
  if (!p) return null;

  const [etapesBrutes, inscription, certificat, auteur] = await Promise.all([
    db
      .select({
        id: etapesParcours.id,
        ordre: etapesParcours.ordre,
        titre: etapesParcours.titre,
        formationId: formations.id,
        slug: formations.slug,
        formationTitre: formations.titre,
        resume: formations.resume,
        dureeSec: formations.dureeSec,
        niveau: formations.niveau,
        statut: progressions.statut,
        secondesVues: progressions.secondesVues,
      })
      .from(etapesParcours)
      .innerJoin(formations, eq(formations.id, etapesParcours.formationId))
      .leftJoin(
        progressions,
        and(eq(progressions.formationId, etapesParcours.formationId), eq(progressions.utilisateurId, utilisateurId))
      )
      .where(eq(etapesParcours.parcoursId, p.id))
      .orderBy(asc(etapesParcours.ordre)),
    db
      .select({ demarreLe: inscriptionsParcours.demarreLe, termineLe: inscriptionsParcours.termineLe })
      .from(inscriptionsParcours)
      .where(and(eq(inscriptionsParcours.parcoursId, p.id), eq(inscriptionsParcours.utilisateurId, utilisateurId)))
      .limit(1),
    db
      .select({ id: certificats.id, jeton: certificats.jeton, emisLe: certificats.emisLe })
      .from(certificats)
      .where(
        and(
          eq(certificats.parcoursId, p.id),
          eq(certificats.utilisateurId, utilisateurId),
          sql`${certificats.revoqueLe} is null`
        )
      )
      .limit(1),
    db
      .select({ prenom: utilisateurs.prenom, nom: utilisateurs.nom, photoUrl: utilisateurs.photoUrl })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, p.auteurId))
      .limit(1),
  ]);

  const etapes: EtapeParcours[] = etapesBrutes.map((e) => ({
    id: e.id,
    ordre: e.ordre,
    titre: e.titre ?? e.formationTitre,
    formation: {
      id: e.formationId,
      slug: e.slug,
      titre: e.formationTitre,
      resume: e.resume,
      dureeSec: e.dureeSec,
      niveau: e.niveau,
    },
    statut: e.statut,
    couverture: e.dureeSec > 0 ? Math.min(1, (e.secondesVues ?? 0) / e.dureeSec) : 0,
  }));

  const terminees = etapes.filter((e) => e.statut === "TERMINEE").length;
  const prochaine = etapes.find((e) => e.statut !== "TERMINEE") ?? null;

  return {
    ...p,
    auteur: auteur[0] ?? null,
    etapes,
    terminees,
    prochaine,
    dureeSec: etapes.reduce((s, e) => s + e.formation.dureeSec, 0),
    inscrit: Boolean(inscription[0]),
    termineLe: inscription[0]?.termineLe ?? null,
    certificat: certificat[0] ?? null,
  };
}
