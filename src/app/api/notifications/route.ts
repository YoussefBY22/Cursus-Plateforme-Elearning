import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { auth } from "@/server/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ erreur: "Non connecté" }, { status: 401 });
  const liste = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      titre: notifications.titre,
      message: notifications.message,
      lien: notifications.lien,
      lue: notifications.lue,
      creeLe: notifications.creeLe,
    })
    .from(notifications)
    .where(eq(notifications.utilisateurId, session.user.id))
    .orderBy(desc(notifications.creeLe))
    .limit(15);
  const [{ n }] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.utilisateurId, session.user.id), eq(notifications.lue, false)));
  return Response.json({ nonLues: n, notifications: liste });
}

const Corps = z.union([z.object({ tout: z.literal(true) }), z.object({ id: z.string().min(5).max(40) })]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ erreur: "Non connecté" }, { status: 401 });
  const lu = Corps.safeParse(await req.json().catch(() => null));
  if (!lu.success) return Response.json({ erreur: "Requête invalide" }, { status: 400 });
  const filtre =
    "tout" in lu.data
      ? eq(notifications.utilisateurId, session.user.id)
      : and(eq(notifications.utilisateurId, session.user.id), eq(notifications.id, lu.data.id));
  await db.update(notifications).set({ lue: true }).where(filtre);
  return Response.json({ ok: true });
}
