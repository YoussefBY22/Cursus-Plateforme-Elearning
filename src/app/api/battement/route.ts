import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activitesJour, utilisateurs } from "@/db/schema";
import { auth } from "@/server/auth";
import { ajouterXp, verifierBadgesSansErreur } from "@/server/moteur/gamification";
import { BAREME_XP } from "@/services/xp";

/**
 * Battement de présence (une fois par minute, onglet visible et actif).
 * On ne crédite que le temps réellement écoulé depuis le battement
 * précédent, plafonné : rejouer la requête en boucle ne rapporte rien.
 */
const PLAFOND_SEC = 65;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ ok: false }, { status: 401 });
  const uid = session.user.id;
  const maintenant = new Date();

  const [u] = await db
    .select({ dernier: utilisateurs.dernierBattement, total: utilisateurs.tempsActifSec })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, uid))
    .limit(1);
  if (!u) return Response.json({ ok: false }, { status: 404 });

  const ecoule = u.dernier ? (maintenant.getTime() - u.dernier.getTime()) / 1000 : PLAFOND_SEC;
  if (ecoule < 20) return Response.json({ ok: true, credite: 0 });
  const credite = Math.round(Math.min(PLAFOND_SEC, ecoule));

  await db
    .update(utilisateurs)
    .set({
      tempsActifSec: sql`${utilisateurs.tempsActifSec} + ${credite}`,
      dernierBattement: maintenant,
      dernierAcces: maintenant,
    })
    .where(eq(utilisateurs.id, uid));

  const jour = maintenant.toISOString().slice(0, 10);
  const [activite] = await db
    .insert(activitesJour)
    .values({ utilisateurId: uid, jour, secondes: credite })
    .onConflictDoUpdate({
      target: [activitesJour.utilisateurId, activitesJour.jour],
      set: { secondes: sql`${activitesJour.secondes} + ${credite}` },
    })
    .returning({ secondes: activitesJour.secondes });

  // 5 XP par quart d'heure actif, 8 quarts par jour au plus.
  const quarts = Math.min(
    BAREME_XP.TEMPS_ACTIF_MAX_JOUR / BAREME_XP.TEMPS_ACTIF_QUART_HEURE,
    Math.floor((activite?.secondes ?? 0) / 900)
  );
  let gagne = 0;
  if (quarts > 0) {
    gagne = await ajouterXp(uid, "TEMPS_ACTIF", `${jour}:${quarts}`, BAREME_XP.TEMPS_ACTIF_QUART_HEURE, "Temps actif");
  }

  // Les badges de temps se vérifient à chaque heure pleine franchie.
  const heureFranchie = Math.floor((u.total + credite) / 3600) > Math.floor(u.total / 3600);
  if (heureFranchie || gagne > 0) await verifierBadgesSansErreur(uid);

  return Response.json({ ok: true, credite, nouveautes: heureFranchie || gagne > 0 });
}
