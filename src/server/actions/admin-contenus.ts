"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { formations, parcours } from "@/db/schema";
import { messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { exigerPermission } from "@/server/session";

const SchemaStatut = z.object({
  type: z.enum(["formation", "parcours"]),
  id: z.string().min(1).max(40),
  operation: z.enum(["archiver", "republier"]),
});

/**
 * Archiver retire un contenu du catalogue sans rien effacer (progressions,
 * notes, certificats restent). Republier ne vaut que pour un contenu déjà
 * publié une fois : un brouillon archivé repasse par la validation.
 */
export async function changerStatutContenu(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("validation", "valider");
    const lu = SchemaStatut.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const { type, id, operation } = lu.data;
    const table = type === "formation" ? formations : parcours;

    const [actuel] = await db
      .select({ statut: table.statut, publieLe: table.publieLe, titre: table.titre })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);
    if (!actuel) return { erreur: "Ce contenu n'existe plus." };

    if (operation === "archiver") {
      if (actuel.statut === "ARCHIVE") return { erreur: "Ce contenu est déjà archivé." };
      await db.update(table).set({ statut: "ARCHIVE" }).where(eq(table.id, id));
    } else {
      if (actuel.statut !== "ARCHIVE") return { erreur: "Seul un contenu archivé peut être republié." };
      if (!actuel.publieLe) {
        return { erreur: "Ce contenu n'a jamais été publié : rouvrez-le dans le studio pour le soumettre à la validation." };
      }
      await db.update(table).set({ statut: "PUBLIE" }).where(eq(table.id, id));
    }

    await journaliser({
      acteurId: acteur.id,
      action: operation === "archiver" ? "CONTENU_ARCHIVE" : "CONTENU_REPUBLIE",
      entite: type,
      entiteId: id,
      details: { titre: actuel.titre, statutAvant: actuel.statut },
    });
    revalidatePath("/admin/contenus");
    revalidatePath("/catalogue");
    revalidatePath("/parcours");
    const nom = type === "formation" ? "Formation" : "Parcours";
    return { ok: true, message: operation === "archiver" ? `${nom} archivé${type === "formation" ? "e" : ""}` : `${nom} republié${type === "formation" ? "e" : ""}` };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
