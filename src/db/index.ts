import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Client de base unique.
 *
 * En développement, le rechargement à chaud réévalue ce module : sans le
 * cache sur `globalThis`, chaque sauvegarde ouvrirait un nouveau pool et
 * PostgreSQL finirait par refuser les connexions.
 */
const globale = globalThis as unknown as { __jetSql?: ReturnType<typeof postgres> };

function creerClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL manquant : copiez .env.example en .env et renseignez la base.");
  }
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL ?? 10),
    // Neon et les poolers PgBouncer n'acceptent pas les requêtes préparées nommées.
    prepare: false,
    onnotice: () => {},
  });
}

export const sql = globale.__jetSql ?? creerClient();
if (process.env.NODE_ENV !== "production") globale.__jetSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export { schema };
