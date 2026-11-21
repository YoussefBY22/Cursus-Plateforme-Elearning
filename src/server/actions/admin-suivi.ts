"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { juniorEntreprises, notesSuivi, utilisateurs } from "@/db/schema";
import { ErreurMetier, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { notifier } from "@/server/notifications";
import { exigerPermission } from "@/server/session";
import { estAdmin } from "@/services/rbac";

const SchemaAttribution = z.object({
  jeId: z.string().min(1).max(40),
  /** Vide = retirer le référent. */
  chargeId: z.string().max(40),
});

const SchemaNote = z.object({
  jeId: z.string().min(1).max(40),
  contenu: z.string().trim().min(3, "Écrivez au moins quelques mots.").max(2000),
});

function rafraichir(jeId: string) {
  revalidatePath("/admin/suivi");
  revalidatePath(`/admin/suivi/${jeId}`);
  revalidatePath("/", "layout");
}

/** Le chargé de suivi n'écrit que sur les organisations de son portefeuille. */
async function exigerAccesJe(acteur: { id: string; roles: readonly string[] }, jeId: string) {
  const [je] = await db
    .select({ id: juniorEntreprises.id, nom: juniorEntreprises.nom, chargeSuiviId: juniorEntreprises.chargeSuiviId })
    .from(juniorEntreprises)
    .where(eq(juniorEntreprises.id, jeId))
    .limit(1);
  if (!je) throw new ErreurMetier("Cette organisation n'existe plus.");
  if (!estAdmin(acteur.roles) && je.chargeSuiviId !== acteur.id) {
    throw new ErreurMetier("Cette organisation n'est pas dans votre portefeuille.");
  }
  return je;
}

/** Rattache une organisation à un chargé de suivi, ou retire le rattachement. */
export async function attribuerChargeSuivi(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("suivi", "valider");
    const lu = SchemaAttribution.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const { jeId, chargeId } = lu.data;

    const [je] = await db
      .select({ nom: juniorEntreprises.nom, chargeSuiviId: juniorEntreprises.chargeSuiviId })
      .from(juniorEntreprises)
      .where(eq(juniorEntreprises.id, jeId))
      .limit(1);
    if (!je) return { erreur: "Cette organisation n'existe plus." };

    let nomCharge: string | null = null;
    if (chargeId) {
      const [c] = await db
        .select({ id: utilisateurs.id, prenom: utilisateurs.prenom, nom: utilisateurs.nom, actif: utilisateurs.actif })
        .from(utilisateurs)
        .where(eq(utilisateurs.id, chargeId))
        .limit(1);
      if (!c?.actif) return { erreur: "Ce compte ne peut pas recevoir un portefeuille." };
      nomCharge = `${c.prenom} ${c.nom}`;
    }

    await db
      .update(juniorEntreprises)
      .set({ chargeSuiviId: chargeId || null })
      .where(eq(juniorEntreprises.id, jeId));

    if (chargeId && chargeId !== je.chargeSuiviId) {
      await notifier([chargeId], {
        type: "SUIVI",
        titre: "Une organisation vous est confiée",
        message: `Vous suivez désormais ${je.nom}. Son état et son carnet de suivi sont dans « Suivi des organisations ».`,
        lien: `/admin/suivi/${jeId}`,
        cle: `suivi:${jeId}:${chargeId}`,
      });
    }

    await journaliser({
      acteurId: acteur.id,
      action: chargeId ? "SUIVI_ATTRIBUE" : "SUIVI_RETIRE",
      entite: "junior_entreprise",
      entiteId: jeId,
      details: { charge: nomCharge, precedent: je.chargeSuiviId },
    });
    rafraichir(jeId);
    return { ok: true, message: chargeId ? "Chargé de suivi attribué" : "Rattachement retiré" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/** Ajoute une note datée au carnet de suivi d'une organisation. */
export async function ajouterNoteSuivi(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("suivi", "ecrire");
    const lu = SchemaNote.safeParse(Object.fromEntries(formData));
    if (!lu.success) {
      return { erreur: lu.error.issues[0]?.message ?? "Requête invalide." };
    }
    const { jeId, contenu } = lu.data;
    await exigerAccesJe(acteur, jeId);

    const [note] = await db.insert(notesSuivi).values({ jeId, auteurId: acteur.id, contenu }).returning({ id: notesSuivi.id });
    await journaliser({
      acteurId: acteur.id,
      action: "NOTE_SUIVI_AJOUTEE",
      entite: "junior_entreprise",
      entiteId: jeId,
      details: { noteId: note.id, extrait: contenu.slice(0, 200) },
    });
    rafraichir(jeId);
    return { ok: true, message: "Note ajoutée" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
