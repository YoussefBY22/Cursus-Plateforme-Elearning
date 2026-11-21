import { timingSafeEqual } from "node:crypto";
import { envoyerRelancesFroid } from "@/server/relances";

/**
 * Relances quotidiennes des évaluations à froid, en HTTP.
 *
 * Même travail que `npm run relances`, pour les hébergements qui ne savent
 * lancer qu'une requête (Vercel Cron appelle cette route avec
 * `Authorization: Bearer <CRON_SECRET>`).
 *
 * Sans `CRON_SECRET`, la route répond 404 : une relance ouverte à tous
 * permettrait de vider la file d'attente des notifications depuis l'extérieur.
 */

export const dynamic = "force-dynamic";

function autorise(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const entete = req.headers.get("authorization") ?? "";
  const fourni = entete.startsWith("Bearer ") ? entete.slice(7) : "";
  const a = Buffer.from(fourni);
  const b = Buffer.from(secret);
  // Comparaison à temps constant : la longueur se compare en premier, sinon
  // `timingSafeEqual` lève au lieu de répondre faux.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ erreur: "Route désactivée : CRON_SECRET n'est pas défini." }, { status: 404 });
  }
  if (!autorise(req)) {
    return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  try {
    const r = await envoyerRelancesFroid();
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.error("Échec des relances :", e);
    return Response.json({ erreur: "Relances en échec. Voir les journaux du serveur." }, { status: 500 });
  }
}
