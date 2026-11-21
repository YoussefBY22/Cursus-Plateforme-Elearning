"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { formations, parcours, utilisateurs } from "@/db/schema";
import { ErreurMetier, erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { notifier } from "@/server/notifications";
import { exigerPermission } from "@/server/session";
import { peutValider } from "@/services/validation";

/*
 * Décisions de validation.
 *
 * Un refus exige un motif : « refusé » sans explication fait perdre son
 * temps à tout le monde, et le motif s'affiche directement dans le studio de
 * l'auteur, à l'endroit où il va corriger.
 */

const SchemaDecision = z.object({
  type: z.enum(["formation", "parcours"]),
  id: z.string().min(1).max(40),
  motif: z
    .string()
    .trim()
    .min(10, "Expliquez en une phrase ce qui doit être corrigé (10 caractères au moins).")
    .max(600, "Motif trop long (600 caractères).")
    .optional(),
});

async function lireContenu(type: "formation" | "parcours", id: string) {
  const table = type === "formation" ? formations : parcours;
  const [c] = await db
    .select({
      statut: table.statut,
      slug: table.slug,
      titre: table.titre,
      auteurId: table.auteurId,
      publieLe: table.publieLe,
      roles: utilisateurs.roles,
    })
    .from(table)
    .innerJoin(utilisateurs, eq(utilisateurs.id, table.auteurId))
    .where(eq(table.id, id))
    .limit(1);
  if (!c) throw new ErreurMetier("Ce contenu n'existe plus.");
  if (c.statut !== "EN_VALIDATION") {
    throw new ErreurMetier("Ce contenu n'est plus en validation : quelqu'un a déjà statué.");
  }
  return c;
}

function nomDu(type: "formation" | "parcours") {
  return type === "formation" ? "La formation" : "Le parcours";
}

/** Publie le contenu. L'auteur est prévenu et le catalogue rafraîchi. */
export async function validerContenu(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("validation", "valider");
    const lu = SchemaDecision.omit({ motif: true }).safeParse({
      type: formData.get("type"),
      id: formData.get("id"),
    });
    if (!lu.success) return { erreur: "Requête invalide." };
    const { type, id } = lu.data;

    const c = await lireContenu(type, id);
    if (!peutValider({ id: acteur.id, roles: acteur.roles }, { auteurId: c.auteurId, auteurRoles: c.roles })) {
      return {
        erreur:
          c.auteurId === acteur.id
            ? "On ne valide pas son propre contenu. Un autre validateur doit statuer."
            : "Ce contenu relève du super administrateur.",
      };
    }

    const table = type === "formation" ? formations : parcours;
    await db
      .update(table)
      .set({
        statut: "PUBLIE",
        publieLe: c.publieLe ?? new Date(),
        valideParId: acteur.id,
        motifRefus: null,
        majLe: new Date(),
      })
      .where(eq(table.id, id));

    await journaliser({
      acteurId: acteur.id,
      action: type === "formation" ? "FORMATION_VALIDEE" : "PARCOURS_VALIDE",
      entite: type,
      entiteId: id,
      details: { titre: c.titre, auteurId: c.auteurId, premierePublication: !c.publieLe },
    });

    await notifier([c.auteurId], {
      type: "VALIDATION",
      titre: c.publieLe ? "Vos modifications sont publiées" : `${nomDu(type)} est publié${type === "formation" ? "e" : ""}`,
      message: `« ${c.titre} » est désormais au catalogue.`,
      lien: type === "formation" ? `/formations/${c.slug}` : `/parcours/${c.slug}`,
      email: true,
      cle: `validation:${type}:${id}:${Date.now().toString(36)}`,
    });

    revalidatePath("/admin/validations");
    revalidatePath("/admin/contenus");
    revalidatePath("/studio");
    revalidatePath(type === "formation" ? "/catalogue" : "/parcours");
    return { ok: true, message: type === "formation" ? "Formation publiée" : "Parcours publié" };
  } catch (err) {
    return { erreur: messageErreur(err, "La validation n'a pas pu être enregistrée.") };
  }
}

/** Renvoie le contenu à son auteur avec un motif obligatoire. */
export async function refuserContenu(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("validation", "valider");
    const lu = SchemaDecision.safeParse({
      type: formData.get("type"),
      id: formData.get("id"),
      motif: formData.get("motif") ?? "",
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const { type, id, motif } = lu.data;
    if (!motif) return { erreurs: { motif: "Le motif est obligatoire." } };

    const c = await lireContenu(type, id);
    if (!peutValider({ id: acteur.id, roles: acteur.roles }, { auteurId: c.auteurId, auteurRoles: c.roles })) {
      return {
        erreur:
          c.auteurId === acteur.id
            ? "On ne refuse pas son propre contenu."
            : "Ce contenu relève du super administrateur.",
      };
    }

    const table = type === "formation" ? formations : parcours;
    await db
      .update(table)
      .set({ statut: "REFUSE", motifRefus: motif, valideParId: acteur.id, majLe: new Date() })
      .where(eq(table.id, id));

    await journaliser({
      acteurId: acteur.id,
      action: type === "formation" ? "FORMATION_REFUSEE" : "PARCOURS_REFUSE",
      entite: type,
      entiteId: id,
      details: { titre: c.titre, auteurId: c.auteurId, motif },
    });

    await notifier([c.auteurId], {
      type: "VALIDATION",
      titre: "Des corrections sont demandées",
      message: `« ${c.titre} » : ${motif}`,
      lien: type === "formation" ? `/studio/formations/${id}` : `/studio/parcours/${id}`,
      email: true,
      cle: `refus:${type}:${id}:${Date.now().toString(36)}`,
    });

    revalidatePath("/admin/validations");
    revalidatePath("/admin/contenus");
    revalidatePath("/studio");
    return { ok: true, message: "Corrections demandées" };
  } catch (err) {
    return { erreur: messageErreur(err, "Le refus n'a pas pu être enregistré.") };
  }
}
