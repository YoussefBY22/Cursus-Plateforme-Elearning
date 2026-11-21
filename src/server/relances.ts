import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { enquetes, formations, progressions, utilisateurs } from "@/db/schema";
import { notifier } from "@/server/notifications";
import { lireParametres } from "@/server/parametres";

/**
 * Relances des évaluations à froid.
 *
 * Partagé par le script `npm run relances` et la route `/api/cron/relances` :
 * un hébergement serverless ne peut pas lancer de script, un serveur classique
 * préfère le cron système. La règle métier, elle, ne doit exister qu'une fois.
 *
 * Pas de `server-only` ici, contrairement aux requêtes d'écran : ce module est
 * aussi importé par un script lancé hors de Next, où ce garde-fou lèverait.
 *
 * Deux garde-fous contre les doublons, car un cron se rejoue :
 * `progression.relanceFroidLe` marque ce qui est déjà parti, et la clé
 * d'idempotence de la notification bloque l'envoi même si ce marqueur manque.
 */

export type ResultatRelances = { envoyees: number; enAttente: number; delaiJours: number };

export async function envoyerRelancesFroid(): Promise<ResultatRelances> {
  const p = await lireParametres();
  const delaiJours = p["evaluationFroid.delaiJours"];
  const limite = new Date(Date.now() - delaiJours * 86_400_000);

  const faites = db
    .select({ utilisateurId: enquetes.utilisateurId, formationId: enquetes.formationId })
    .from(enquetes)
    .where(eq(enquetes.type, "FROID"));

  const aRelancer = await db
    .select({
      progressionId: progressions.id,
      utilisateurId: progressions.utilisateurId,
      formationId: formations.id,
      slug: formations.slug,
      titre: formations.titre,
    })
    .from(progressions)
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .innerJoin(utilisateurs, eq(utilisateurs.id, progressions.utilisateurId))
    .where(
      and(
        eq(progressions.statut, "TERMINEE"),
        isNotNull(progressions.termineeLe),
        lte(progressions.termineeLe, limite),
        isNull(progressions.relanceFroidLe),
        eq(utilisateurs.actif, true),
        isNotNull(utilisateurs.emailVerifieLe),
        sql`(${progressions.utilisateurId}, ${formations.id}) not in ${faites}`
      )
    );

  let envoyees = 0;
  for (const r of aRelancer) {
    envoyees += await notifier([r.utilisateurId], {
      type: "EVALUATION_FROID",
      titre: "Votre évaluation à froid est attendue",
      message: `Un mois après « ${r.titre} » : qu'en avez-vous mis en pratique ? Votre réponse confirme vos acquis.`,
      lien: `/evaluations/${r.slug}`,
      email: true,
      cle: `froid:${r.formationId}`,
    });
    await db
      .update(progressions)
      .set({ relanceFroidLe: new Date() })
      .where(eq(progressions.id, r.progressionId));
  }

  return { envoyees, enAttente: aRelancer.length, delaiJours };
}
