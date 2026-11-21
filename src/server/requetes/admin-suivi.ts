import "server-only";
import { and, asc, count, countDistinct, desc, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activitesJour,
  formations,
  juniorEntreprises,
  niveauxCompetence,
  notesSuivi,
  progressions,
  utilisateurs,
} from "@/db/schema";
import { cleJour, comparerPeriodes, etatJe, joursDepuis, type EtatJE, type Variation } from "@/services/tendances";
import { heuresDepuisSecondes } from "@/services/rapports";

export type LigneSuivi = {
  id: string;
  nom: string;
  sigle: string | null;
  couleur: string;
  active: boolean;
  /** Chargé de suivi référent, s'il y en a un. */
  charge: { id: string; nom: string } | null;
  membres: number;
  membresActifs: number;
  /** Formations commencées et pas encore terminées. */
  enCours: number;
  /** Parmi elles, celles sans le moindre relevé depuis deux semaines. */
  enPanne: number;
  terminees: number;
  heures: number;
  niveauMoyen: number | null;
  joursDepuisActivite: number | null;
  variation: Variation;
  etat: EtatJE;
};

/** Seuil au-delà duquel une formation commencée est considérée à l'arrêt. */
export const JOURS_AVANT_PANNE = 14;

/**
 * Suivi des organisations sur une fenêtre glissante de 30 jours,
 * comparée aux 30 jours précédents.
 *
 * `chargeId` restreint au portefeuille d'un chargé de suivi ; sans lui,
 * la plateforme voit toutes les organisations. Une organisation sans aucune activité n'est pas
 * écartée : c'est justement celle qu'il faut voir.
 */
export async function donneesSuivi(
  { chargeId, jeId }: { chargeId?: string; jeId?: string } = {},
  maintenant: Date = new Date()
): Promise<{ jes: LigneSuivi[]; totaux: { suivies: number; enDecrochage: number; enPanne: number; sansCharge: number } }> {
  const jour = 24 * 3600 * 1000;
  const il14Jours = new Date(maintenant.getTime() - JOURS_AVANT_PANNE * jour);
  const il30Jours = new Date(maintenant.getTime() - 30 * jour);
  const il60Jours = new Date(maintenant.getTime() - 60 * jour);
  const depuis30 = cleJour(il30Jours);

  const filtreJe = and(
    chargeId ? eq(juniorEntreprises.chargeSuiviId, chargeId) : undefined,
    jeId ? eq(juniorEntreprises.id, jeId) : undefined
  );
  const membreValide = and(eq(utilisateurs.actif, true), eq(utilisateurs.rattachement, "VALIDE"));

  const charges = db.select().from(utilisateurs).as("charge");

  const [listeJes, membresParJe, activiteParJe, progressionsParJe, niveauParJe] = await Promise.all([
    db
      .select({
        id: juniorEntreprises.id,
        nom: juniorEntreprises.nom,
        sigle: juniorEntreprises.sigle,
        couleur: juniorEntreprises.couleur,
        active: juniorEntreprises.active,
        chargeId: charges.id,
        chargePrenom: charges.prenom,
        chargeNom: charges.nom,
      })
      .from(juniorEntreprises)
      .leftJoin(charges, eq(charges.id, juniorEntreprises.chargeSuiviId))
      .where(filtreJe)
      .orderBy(asc(juniorEntreprises.nom)),

    db
      .select({ jeId: utilisateurs.jeId, n: count() })
      .from(utilisateurs)
      .where(membreValide)
      .groupBy(utilisateurs.jeId),

    db
      .select({
        jeId: utilisateurs.jeId,
        actifs: countDistinct(activitesJour.utilisateurId),
        secondes: sql<number>`coalesce(sum(${activitesJour.secondes}) filter (where ${activitesJour.jour} >= ${depuis30}), 0)`.mapWith(
          Number
        ),
        dernierJour: sql<string | null>`max(${activitesJour.jour})`,
      })
      .from(activitesJour)
      .innerJoin(utilisateurs, eq(utilisateurs.id, activitesJour.utilisateurId))
      .groupBy(utilisateurs.jeId),

    db
      .select({
        jeId: utilisateurs.jeId,
        enCours: sql<number>`count(*) filter (where ${progressions.statut} <> 'TERMINEE')`.mapWith(Number),
        enPanne:
          sql<number>`count(*) filter (where ${progressions.statut} <> 'TERMINEE' and ${progressions.derniereSyncLe} < ${il14Jours.toISOString()}::timestamptz)`.mapWith(
            Number
          ),
        terminees:
          sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE' and ${progressions.termineeLe} >= ${il30Jours.toISOString()}::timestamptz)`.mapWith(
            Number
          ),
        termineesPrecedentes:
          sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE' and ${progressions.termineeLe} >= ${il60Jours.toISOString()}::timestamptz and ${progressions.termineeLe} < ${il30Jours.toISOString()}::timestamptz)`.mapWith(
            Number
          ),
      })
      .from(progressions)
      .innerJoin(utilisateurs, eq(utilisateurs.id, progressions.utilisateurId))
      .groupBy(utilisateurs.jeId),

    db
      .select({ jeId: utilisateurs.jeId, niveau: sql<number>`avg(${niveauxCompetence.niveau})`.mapWith(Number) })
      .from(niveauxCompetence)
      .innerJoin(utilisateurs, eq(utilisateurs.id, niveauxCompetence.utilisateurId))
      .groupBy(utilisateurs.jeId),
  ]);

  const parJe = <T extends { jeId: string | null }>(lignes: T[]) =>
    new Map(lignes.filter((l) => l.jeId).map((l) => [l.jeId as string, l]));
  const membres = parJe(membresParJe);
  const activite = parJe(activiteParJe);
  const avancement = parJe(progressionsParJe);
  const niveaux = parJe(niveauParJe);

  const jes: LigneSuivi[] = listeJes.map((je) => {
    const a = activite.get(je.id);
    const p = avancement.get(je.id);
    const joursDepuisActivite = joursDepuis(a?.dernierJour ?? null, maintenant);
    const mesure = {
      membres: membres.get(je.id)?.n ?? 0,
      membresActifs: a?.actifs ?? 0,
      joursDepuisActivite,
    };
    return {
      id: je.id,
      nom: je.nom,
      sigle: je.sigle,
      couleur: je.couleur,
      active: je.active,
      charge: je.chargeId ? { id: je.chargeId, nom: `${je.chargePrenom} ${je.chargeNom}` } : null,
      ...mesure,
      enCours: p?.enCours ?? 0,
      enPanne: p?.enPanne ?? 0,
      terminees: p?.terminees ?? 0,
      heures: heuresDepuisSecondes(a?.secondes ?? 0),
      niveauMoyen: niveaux.get(je.id)?.niveau ?? null,
      variation: comparerPeriodes(p?.terminees ?? 0, p?.termineesPrecedentes ?? 0),
      etat: etatJe(mesure),
    };
  });

  return {
    jes,
    totaux: {
      suivies: jes.length,
      enDecrochage: jes.filter((j) => j.etat === "EN_DECROCHAGE" || j.etat === "SANS_ACTIVITE").length,
      enPanne: jes.reduce((s, j) => s + j.enPanne, 0),
      sansCharge: jes.filter((j) => !j.charge).length,
    },
  };
}

/** Membres de la plateforme pouvant porter un portefeuille d'organisation. */
export async function chargesDisponibles() {
  return db
    .select({ id: utilisateurs.id, prenom: utilisateurs.prenom, nom: utilisateurs.nom, roles: utilisateurs.roles })
    .from(utilisateurs)
    .where(
      and(
        eq(utilisateurs.actif, true),
        sql`${utilisateurs.roles} && ARRAY['CHARGE_SUIVI','RESP_PEDAGO','SUPER_ADMIN']::text[]`
      )
    )
    .orderBy(asc(utilisateurs.prenom), asc(utilisateurs.nom));
}

/**
 * Fiche d'une organisation : les mêmes chiffres que la liste, plus de
 * quoi agir — les formations à l'arrêt, nommément, et le carnet de suivi.
 */
export async function detailSuivi(jeId: string, maintenant: Date = new Date()) {
  const il14Jours = new Date(maintenant.getTime() - JOURS_AVANT_PANNE * 24 * 3600 * 1000);

  const [{ jes }, je, enPanne, notes] = await Promise.all([
    donneesSuivi({ jeId }, maintenant),
    db
      .select({
        id: juniorEntreprises.id,
        nom: juniorEntreprises.nom,
        sigle: juniorEntreprises.sigle,
        ville: juniorEntreprises.ville,
        ecole: juniorEntreprises.ecole,
        couleur: juniorEntreprises.couleur,
        active: juniorEntreprises.active,
        chargeSuiviId: juniorEntreprises.chargeSuiviId,
      })
      .from(juniorEntreprises)
      .where(eq(juniorEntreprises.id, jeId))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        id: progressions.id,
        membre: sql<string>`${utilisateurs.prenom} || ' ' || ${utilisateurs.nom}`,
        membreId: utilisateurs.id,
        photo: utilisateurs.photoUrl,
        formation: formations.titre,
        slug: formations.slug,
        dureeSec: formations.dureeSec,
        secondesVues: progressions.secondesVues,
        derniereSyncLe: progressions.derniereSyncLe,
      })
      .from(progressions)
      .innerJoin(utilisateurs, eq(utilisateurs.id, progressions.utilisateurId))
      .innerJoin(formations, eq(formations.id, progressions.formationId))
      .where(
        and(
          eq(utilisateurs.jeId, jeId),
          ne(progressions.statut, "TERMINEE"),
          lt(progressions.derniereSyncLe, il14Jours)
        )
      )
      .orderBy(asc(progressions.derniereSyncLe)),

    db
      .select({
        id: notesSuivi.id,
        contenu: notesSuivi.contenu,
        creeLe: notesSuivi.creeLe,
        auteur: sql<string>`${utilisateurs.prenom} || ' ' || ${utilisateurs.nom}`,
        auteurPhoto: utilisateurs.photoUrl,
      })
      .from(notesSuivi)
      .innerJoin(utilisateurs, eq(utilisateurs.id, notesSuivi.auteurId))
      .where(eq(notesSuivi.jeId, jeId))
      .orderBy(desc(notesSuivi.creeLe))
      .limit(50),
  ]);

  if (!je) return null;
  return {
    je,
    ligne: jes[0] ?? null,
    enPanne: enPanne.map((p) => ({
      ...p,
      part: p.dureeSec > 0 ? Math.min(1, p.secondesVues / p.dureeSec) : 0,
      jours: joursDepuis(p.derniereSyncLe, maintenant) ?? 0,
    })),
    notes,
  };
}
