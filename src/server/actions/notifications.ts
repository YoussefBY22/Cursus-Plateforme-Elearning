"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { messageErreur, type Resultat } from "@/lib/resultat";
import { exigerSession } from "@/server/session";

/*
 * Notifications : un membre ne touche qu'aux siennes.
 *
 * Ces actions doublent l'API utilisée par la cloche, pour que la page
 * fonctionne même sans JavaScript (formulaires simples).
 */

export async function marquerNotificationLue(formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerSession();
    const id = z.string().min(1).max(40).safeParse(formData.get("id"));
    if (!id.success) return { erreur: "Requête invalide." };
    await db
      .update(notifications)
      .set({ lue: true })
      .where(and(eq(notifications.id, id.data), eq(notifications.utilisateurId, u.id)));
    revalidatePath("/notifications");
    return { ok: true, message: "Notification marquée comme lue" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

export async function marquerToutesLues(): Promise<Resultat> {
  try {
    const u = await exigerSession();
    await db
      .update(notifications)
      .set({ lue: true })
      .where(and(eq(notifications.utilisateurId, u.id), eq(notifications.lue, false)));
    revalidatePath("/notifications");
    return { ok: true, message: "Tout est marqué comme lu" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
