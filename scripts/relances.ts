/**
 * Relances des évaluations à froid — npm run relances
 *
 * À lancer une fois par jour (cron, tâche planifiée de l'hébergeur). Sur un
 * hébergement serverless, la route `/api/cron/relances` fait exactement le
 * même travail : la règle métier vit dans `src/server/relances.ts`.
 */
import "./charger-env";

import { sql as client } from "@/db";
import { envoyerRelancesFroid } from "@/server/relances";

async function main() {
  const { envoyees, enAttente, delaiJours } = await envoyerRelancesFroid();
  if (!enAttente) console.log(`Aucune relance à envoyer (délai : ${delaiJours} jours).`);
  else console.log(`${envoyees} relance(s) envoyée(s) sur ${enAttente} évaluation(s) en attente.`);
  await client.end();
}

main().catch(async (err) => {
  console.error("Échec des relances :", err);
  await client.end().catch(() => {});
  process.exit(1);
});
