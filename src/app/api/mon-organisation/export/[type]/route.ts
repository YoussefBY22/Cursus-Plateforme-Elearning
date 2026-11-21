import { journaliser } from "@/server/journal";
import { contenuExportRh, resoudreJe } from "@/server/requetes/rh";
import { AccesRefuse, exigerPermission, type Utilisateur } from "@/server/session";
import { estTypeExportRh, nomFichierExportRh } from "@/services/rh";

export const dynamic = "force-dynamic";

const texte = (message: string, status: number) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/**
 * Export CSV des données d'une organisation (BOM UTF-8 pour Excel), réservé à
 * « rh:lire ». Le RH n'exporte que SA organisation ; un super admin peut viser une
 * autre organisation avec `?je=<id>`.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/mon-organisation/export/[type]">) {
  let u: Utilisateur;
  try {
    u = await exigerPermission("rh", "lire");
  } catch (err) {
    const statut = err instanceof AccesRefuse && err.message.startsWith("Session") ? 401 : 403;
    return texte(err instanceof Error ? err.message : "Accès refusé.", statut);
  }

  const { type } = await ctx.params;
  if (!estTypeExportRh(type)) return texte("Export inconnu.", 404);

  const je = await resoudreJe(u, new URL(req.url).searchParams.get("je"));
  if (!je) return texte("Votre compte n'est rattaché à aucune organisation.", 403);

  try {
    const { csv, lignes } = await contenuExportRh(je.id, type);
    const nom = nomFichierExportRh(type, je.slug);
    await journaliser({ acteurId: u.id, action: "EXPORT_RH", entite: "junior_entreprise", entiteId: je.id, details: { type, lignes } });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nom}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(`[mon-organisation] Export « ${type} » impossible :`, err);
    return texte("Export impossible pour le moment. Réessayez dans un instant.", 500);
  }
}
