import { pdfCertificat } from "@/server/moteur/certificats";
import { certificatParId } from "@/server/requetes/certificats";
import { sessionFacultative } from "@/server/session";
import { can } from "@/services/rbac";
import { dispositionPdf } from "@/services/certificats/verification";

export const dynamic = "force-dynamic";

const texte = (message: string, status: number) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/**
 * PDF d'un certificat pour un membre connecté : son titulaire, ou un
 * gestionnaire (« certificats:lire »). Pour les autres, le certificat
 * « n'existe pas » : on ne confirme rien.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/certificats/[id]/pdf">) {
  const u = await sessionFacultative();
  if (!u) return texte("Connectez-vous pour télécharger ce certificat.", 401);

  const { id } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return texte("Certificat introuvable.", 404);
  const c = await certificatParId(id);
  if (!c || (c.utilisateurId !== u.id && !can(u.roles, "certificats", "lire"))) return texte("Certificat introuvable.", 404);

  try {
    const pdf = await pdfCertificat({
      canevas: c.canevas,
      couleurTheme: c.couleurTheme,
      donnees: c.donnees,
      jeton: c.jeton,
      filigrane: c.revoqueLe ? "Révoqué" : undefined,
    });
    const apercu = new URL(req.url).searchParams.get("affichage") === "inline";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": dispositionPdf(c.numero, apercu ? "inline" : "attachment"),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(`[certificats] PDF ${id} impossible :`, err);
    return texte("Le PDF n'a pas pu être fabriqué. Réessayez dans un instant.", 500);
  }
}
