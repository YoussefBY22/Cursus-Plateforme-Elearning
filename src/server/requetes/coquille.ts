import "server-only";
import { and, count, desc, eq, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activitesJour,
  demandesFormation,
  enquetes,
  formations,
  notifications,
  parcours,
  progressions,
  signalements,
  utilisateurs,
} from "@/db/schema";
import { can } from "@/services/rbac";
import { etatNiveau, serieJours } from "@/services/xp";
import { lireParametres } from "@/server/parametres";
import type { Utilisateur } from "@/server/session";

/** Tout ce que la barre latérale et la barre du haut affichent. */
export async function donneesCoquille(u: Utilisateur) {
  const [profil] = await db
    .select({
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      photoUrl: utilisateurs.photoUrl,
      xp: utilisateurs.xp,
      emailVerifieLe: utilisateurs.emailVerifieLe,
      jeId: utilisateurs.jeId,
      rattachement: utilisateurs.rattachement,
    })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, u.id))
    .limit(1);

  const [{ nonLues }] = await db
    .select({ nonLues: count() })
    .from(notifications)
    .where(and(eq(notifications.utilisateurId, u.id), eq(notifications.lue, false)));

  const jours = await db
    .select({ jour: activitesJour.jour })
    .from(activitesJour)
    .where(eq(activitesJour.utilisateurId, u.id))
    .orderBy(desc(activitesJour.jour))
    .limit(60);
  const serie = serieJours(jours.map((j) => new Date(`${j.jour}T00:00:00Z`)));

  let validations = 0;
  let signalementsOuverts = 0;
  if (can(u.roles, "validation", "lire")) {
    const [f] = await db
      .select({ n: count() })
      .from(formations)
      .where(and(eq(formations.statut, "EN_VALIDATION"), ne(formations.auteurId, u.id)));
    const [p] = await db
      .select({ n: count() })
      .from(parcours)
      .where(and(eq(parcours.statut, "EN_VALIDATION"), ne(parcours.auteurId, u.id)));
    validations = f.n + p.n;
  }
  if (can(u.roles, "moderation", "lire")) {
    const [s] = await db.select({ n: count() }).from(signalements).where(eq(signalements.statut, "OUVERT"));
    signalementsOuverts = s.n;
  }

  let demandes = 0;
  if (can(u.roles, "suivi", "lire")) {
    const [d] = await db.select({ n: count() }).from(demandesFormation).where(eq(demandesFormation.statut, "OUVERTE"));
    demandes = d.n;
  }

  const p = await lireParametres();

  // Évaluations à froid dues : la pastille du menu est le seul rappel visible
  // en continu, la notification étant ponctuelle.
  const limiteFroid = new Date(Date.now() - p["evaluationFroid.delaiJours"] * 86_400_000);
  const [{ n: evaluationsFroid }] = await db
    .select({ n: count() })
    .from(progressions)
    .where(
      and(
        eq(progressions.utilisateurId, u.id),
        eq(progressions.statut, "TERMINEE"),
        isNotNull(progressions.termineeLe),
        lte(progressions.termineeLe, limiteFroid),
        sql`${progressions.formationId} not in ${db
          .select({ formationId: enquetes.formationId })
          .from(enquetes)
          .where(and(eq(enquetes.utilisateurId, u.id), eq(enquetes.type, "FROID")))}`
      )
    );

  const studio =
    u.roles.includes("SUPER_ADMIN") ||
    u.roles.includes("FORMATEUR") ||
    (u.roles.includes("RESP_PEDAGO") && p["contenu.pedagoPeutCreer"]);

  return {
    profil: profil ?? null,
    niveau: etatNiveau(profil?.xp ?? 0),
    nonLues,
    serie,
    validations,
    signalementsOuverts,
    evaluationsFroid,
    demandes,
    studio,
  };
}
