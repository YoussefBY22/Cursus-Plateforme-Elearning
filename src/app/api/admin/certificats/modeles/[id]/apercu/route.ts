import { pdfCertificat } from "@/server/moteur/certificats";
import { modelePourEditeur } from "@/server/requetes/certificats";
import { AccesRefuse, exigerPermission } from "@/server/session";
import { donneesExemple } from "@/services/certificats/cadre";
import { slugifier } from "@/lib/utils";

export const dynamic = "force-dynamic";

const texte = (message: string, status: number) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/** Aperçu PDF d'un modèle : données d'exemple, QR factice, filigrane « Aperçu ». */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/certificats/modeles/[id]/apercu">) {
  try {
    await exigerPermission("certificats", "lire");
  } catch (err) {
    const statut = err instanceof AccesRefuse && err.message.startsWith("Session") ? 401 : 403;
    return texte(err instanceof Error ? err.message : "Accès refusé.", statut);
  }

  const { id } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return texte("Modèle introuvable.", 404);
  const m = await modelePourEditeur(id);
  if (!m) return texte("Modèle introuvable.", 404);

  try {
    const pdf = await pdfCertificat({
      canevas: m.canevas,
      couleurTheme: m.couleurTheme,
      donnees: donneesExemple(),
      jeton: null,
      filigrane: "Aperçu",
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="apercu-${slugifier(m.nom) || "modele"}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(`[certificats] Aperçu du modèle ${id} impossible :`, err);
    return texte("L'aperçu n'a pas pu être fabriqué. Réessayez dans un instant.", 500);
  }
}
