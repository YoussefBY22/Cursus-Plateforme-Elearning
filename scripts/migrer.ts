/**
 * Applique les migrations SQL versionnées (dossier `drizzle/`).
 * Usage : npm run db:migrate   (lit DATABASE_URL dans .env)
 */
import "./charger-env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (voir .env.example).");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
  console.log("✔ Migrations appliquées.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
