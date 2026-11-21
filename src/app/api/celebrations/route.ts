import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { badges, badgesObtenus, notifications } from "@/db/schema";
import { auth } from "@/server/auth";

/** Badges obtenus et niveaux franchis qui n'ont pas encore été célébrés. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ badges: [], niveaux: [] });
  const uid = session.user.id;

  const nouveaux = await db
    .select({
      id: badges.id,
      nom: badges.nom,
      description: badges.description,
      couleur: badges.couleur,
      forme: badges.forme,
      matiere: badges.matiere,
      rarete: badges.rarete,
      effet: badges.effet,
      icone: badges.icone,
      xpBonus: badges.xpBonus,
    })
    .from(badgesObtenus)
    .innerJoin(badges, eq(badges.id, badgesObtenus.badgeId))
    .where(and(eq(badgesObtenus.utilisateurId, uid), eq(badgesObtenus.celebre, false)))
    .limit(6);

  const niveaux = await db
    .select({ id: notifications.id, donnees: notifications.donnees })
    .from(notifications)
    .where(
      and(
        eq(notifications.utilisateurId, uid),
        eq(notifications.type, "NIVEAU"),
        sql`coalesce((${notifications.donnees}->>'celebre')::boolean, false) = false`,
        gt(notifications.creeLe, new Date(Date.now() - 7 * 24 * 3600 * 1000))
      )
    )
    .limit(3);

  return Response.json({
    badges: nouveaux,
    niveaux: niveaux.map((n) => ({
      id: n.id,
      niveau: Number(n.donnees.niveau ?? 0),
      titre: String(n.donnees.titre ?? ""),
    })),
  });
}

const Corps = z.object({
  badges: z.array(z.string().max(40)).max(50).default([]),
  niveaux: z.array(z.string().max(40)).max(50).default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ ok: false }, { status: 401 });
  const lu = Corps.safeParse(await req.json().catch(() => null));
  if (!lu.success) return Response.json({ ok: false }, { status: 400 });
  const uid = session.user.id;
  if (lu.data.badges.length) {
    await db
      .update(badgesObtenus)
      .set({ celebre: true })
      .where(and(eq(badgesObtenus.utilisateurId, uid), inArray(badgesObtenus.badgeId, lu.data.badges)));
  }
  if (lu.data.niveaux.length) {
    await db
      .update(notifications)
      .set({ donnees: sql`${notifications.donnees} || '{"celebre": true}'::jsonb` })
      .where(and(eq(notifications.utilisateurId, uid), inArray(notifications.id, lu.data.niveaux)));
  }
  return Response.json({ ok: true });
}
