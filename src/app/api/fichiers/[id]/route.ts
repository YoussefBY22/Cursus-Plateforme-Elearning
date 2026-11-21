import { lireFichier } from "@/server/stockage";

/**
 * Sert un fichier déposé. Les fichiers stockés sont des images publiques par
 * nature (photo de profil, visuel de formation, logo de certificat) : pas de
 * contrôle de session, mais un identifiant aléatoire non devinable.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/fichiers/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response("Introuvable", { status: 404 });
  const f = await lireFichier(id);
  if (!f) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(f.octets), {
    headers: {
      "Content-Type": f.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.nom)}"`,
    },
  });
}
