/**
 * Vide entièrement la base (schéma public + journal des migrations).
 * Usage : npm run db:reset   — DESTRUCTIF, réservé au développement.
 */
import "./charger-env";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant.");
  if (process.env.NODE_ENV === "production") throw new Error("Refusé en production.");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  await client.end();
  console.log("✔ Base vidée.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
