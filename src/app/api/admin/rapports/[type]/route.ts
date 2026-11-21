import { versCsv } from "@/lib/csv";
import { journaliser } from "@/server/journal";
import { donneesRapport } from "@/server/requetes/admin-rapports";
import { AccesRefuse, exigerPermission } from "@/server/session";
import { estTypeRapport, nomFichierRapport } from "@/services/rapports";

export const dynamic = "force-dynamic";

/** Export CSV d'un rapport global (BOM UTF-8 pour Excel), réservé à « rapports:lire ». */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/rapports/[type]">) {
  let acteurId: string;
  try {
    const u = await exigerPermission("rapports", "lire");
    acteurId = u.id;
  } catch (err) {
    const statut = err instanceof AccesRefuse && err.message.startsWith("Session") ? 401 : 403;
    return new Response(err instanceof Error ? err.message : "Accès refusé.", {
      status: statut,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { type } = await ctx.params;
  if (!estTypeRapport(type)) {
    return new Response("Rapport inconnu.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  try {
    const { entetes, lignes } = await donneesRapport(type);
    const nom = nomFichierRapport(type);
    await journaliser({ acteurId, action: "RAPPORT_EXPORTE", entite: "rapport", entiteId: type, details: { lignes: lignes.length } });
    return new Response(versCsv(entetes, lignes), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nom}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(`[rapports] Export « ${type} » impossible :`, err);
    return new Response("Export impossible pour le moment. Réessayez dans un instant.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
