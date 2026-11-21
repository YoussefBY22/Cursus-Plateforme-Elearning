"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { commentaires, formations, signalements } from "@/db/schema";
import { messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { notifier } from "@/server/notifications";
import { exigerPermission } from "@/server/session";

const SchemaCommentaire = z.object({ commentaireId: z.string().min(1).max(40) });

function rafraichir() {
  revalidatePath("/admin/moderation");
  // Le compteur de la barre latérale vit dans le layout de l'application.
  revalidatePath("/", "layout");
}

export async function masquerCommentaire(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("moderation", "valider");
    const lu = SchemaCommentaire.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const { commentaireId } = lu.data;

    const [c] = await db
      .select({ id: commentaires.id, auteurId: commentaires.auteurId, formationTitre: formations.titre, texte: commentaires.texte })
      .from(commentaires)
      .innerJoin(formations, eq(formations.id, commentaires.formationId))
      .where(eq(commentaires.id, commentaireId))
      .limit(1);
    if (!c) return { erreur: "Ce commentaire n'existe plus." };

    const traites = await db.transaction(async (tx) => {
      await tx.update(commentaires).set({ masque: true }).where(eq(commentaires.id, commentaireId));
      return tx
        .update(signalements)
        .set({ statut: "MASQUE", traiteParId: acteur.id, traiteLe: new Date() })
        .where(and(eq(signalements.commentaireId, commentaireId), eq(signalements.statut, "OUVERT")))
        .returning({ motif: signalements.motif });
    });

    const motifs = [...new Set(traites.map((t) => t.motif))];
    await notifier([c.auteurId], {
      type: "MODERATION",
      titre: "Un de vos commentaires a été masqué",
      message: `Votre commentaire sur « ${c.formationTitre} » a été masqué par l'équipe de modération${
        motifs.length ? ` (motif : ${motifs.join(", ").toLowerCase()})` : ""
      }. Gardez les échanges bienveillants et utiles à tous.`,
      cle: `moderation:${commentaireId}`,
    });
    await journaliser({
      acteurId: acteur.id,
      action: "COMMENTAIRE_MASQUE",
      entite: "commentaire",
      entiteId: commentaireId,
      details: { signalements: traites.length, motifs, extrait: c.texte.slice(0, 200) },
    });
    rafraichir();
    return { ok: true, message: "Commentaire masqué" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

export async function rejeterSignalements(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("moderation", "valider");
    const lu = SchemaCommentaire.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const traites = await db
      .update(signalements)
      .set({ statut: "REJETE", traiteParId: acteur.id, traiteLe: new Date() })
      .where(and(eq(signalements.commentaireId, lu.data.commentaireId), eq(signalements.statut, "OUVERT")))
      .returning({ id: signalements.id });
    if (!traites.length) return { erreur: "Ces signalements ont déjà été traités." };
    await journaliser({
      acteurId: acteur.id,
      action: "SIGNALEMENT_REJETE",
      entite: "commentaire",
      entiteId: lu.data.commentaireId,
      details: { signalements: traites.length },
    });
    rafraichir();
    return { ok: true, message: traites.length > 1 ? "Signalements rejetés" : "Signalement rejeté" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
