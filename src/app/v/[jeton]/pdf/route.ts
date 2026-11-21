import { ipDeLaRequete, limiterVerification } from "@/server/limiteur";
import { pdfCertificat } from "@/server/moteur/certificats";
import { certificatParJeton } from "@/server/requetes/certificats";
import { dispositionPdf, jetonValide } from "@/services/certificats/verification";

export const dynamic = "force-dynamic";

const texte = (message: string, status: number, entetes: Record<string, string> = {}) =>
  new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", ...entetes },
  });

/** PDF public d'un certificat, par son jeton de vérification. Limité par IP. */
export async function GET(req: Request, ctx: RouteContext<"/v/[jeton]/pdf">) {
  const decision = limiterVerification(ipDeLaRequete(req));
  if (!decision.autorise) {
    return texte("Trop de tentatives. Réessayez dans quelques minutes.", 429, {
      "Retry-After": String(Math.ceil(decision.reessayerDansMs / 1000)),
    });
  }

  const { jeton } = await ctx.params;
  // Même réponse pour un jeton mal formé ou inconnu : rien n'est confirmé.
  if (!jetonValide(jeton)) return texte("Ce lien de vérification n'est pas valide.", 404);
  const c = await certificatParJeton(jeton);
  if (!c) return texte("Ce lien de vérification n'est pas valide.", 404);

  try {
    const pdf = await pdfCertificat({
      canevas: c.canevas,
      couleurTheme: c.couleurTheme,
      donnees: c.donnees,
      jeton: c.jeton,
      filigrane: c.revoqueLe ? "Révoqué" : undefined,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": dispositionPdf(c.numero),
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    console.error("[certificats] PDF public impossible :", err);
    return texte("Le PDF n'a pas pu être fabriqué. Réessayez dans un instant.", 500);
  }
}
