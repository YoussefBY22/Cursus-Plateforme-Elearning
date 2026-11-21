"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { juniorEntreprises } from "@/db/schema";
import { erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { slugifier } from "@/lib/utils";
import { journaliser } from "@/server/journal";
import { exigerSuperAdmin } from "@/server/requetes/admin-acces";

const vide = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

const SchemaJE = z.object({
  id: z.string().max(40).nullable(),
  nom: z.string().trim().min(3, "Nom trop court (3 caractères au moins).").max(120, "Nom trop long."),
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Minuscules, chiffres et tirets uniquement.")
    .nullable(),
  sigle: z.string().max(16, "Sigle trop long (16 caractères).").nullable(),
  ville: z.string().max(80).nullable(),
  ecole: z.string().max(120).nullable(),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide : #RRGGBB attendu."),
  active: z.boolean(),
});

export async function enregistrerJE(_etat: Resultat<{ id: string }>, formData: FormData): Promise<Resultat<{ id: string }>> {
  try {
    const acteur = await exigerSuperAdmin();
    const lu = SchemaJE.safeParse({
      id: vide(formData.get("id")),
      nom: formData.get("nom") ?? "",
      slug: vide(formData.get("slug")),
      sigle: vide(formData.get("sigle")),
      ville: vide(formData.get("ville")),
      ecole: vide(formData.get("ecole")),
      couleur: formData.get("couleur") ?? "",
      active: formData.get("active") === "on",
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;

    const slug = d.slug ?? slugifier(d.nom);
    if (!slug) return { erreurs: { slug: "Impossible de déduire une adresse : saisissez-la." } };
    const [pris] = await db
      .select({ id: juniorEntreprises.id })
      .from(juniorEntreprises)
      .where(d.id ? and(eq(juniorEntreprises.slug, slug), ne(juniorEntreprises.id, d.id)) : eq(juniorEntreprises.slug, slug))
      .limit(1);
    if (pris) return { erreurs: { slug: "Cette adresse est déjà prise par une autre organisation." } };

    const valeurs = {
      nom: d.nom,
      slug,
      sigle: d.sigle,
      ville: d.ville,
      ecole: d.ecole,
      couleur: d.couleur.toUpperCase(),
      active: d.active,
    };

    let id = d.id;
    if (id) {
      const [maj] = await db.update(juniorEntreprises).set(valeurs).where(eq(juniorEntreprises.id, id)).returning({ id: juniorEntreprises.id });
      if (!maj) return { erreur: "Cette organisation n'existe plus." };
      await journaliser({ acteurId: acteur.id, action: "JE_MODIFIEE", entite: "junior_entreprise", entiteId: id, details: valeurs });
    } else {
      const [cree] = await db.insert(juniorEntreprises).values(valeurs).returning({ id: juniorEntreprises.id });
      id = cree.id;
      await journaliser({ acteurId: acteur.id, action: "JE_CREEE", entite: "junior_entreprise", entiteId: id, details: valeurs });
    }
    revalidatePath("/admin/organisations");
    return { ok: true, message: d.id ? "Organisation enregistrée" : "Organisation créée", donnees: { id } };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}

const SchemaActivation = z.object({ id: z.string().min(1).max(40), active: z.enum(["true", "false"]) });

export async function changerActivationJE(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerSuperAdmin();
    const lu = SchemaActivation.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const active = lu.data.active === "true";
    const [maj] = await db
      .update(juniorEntreprises)
      .set({ active })
      .where(eq(juniorEntreprises.id, lu.data.id))
      .returning({ id: juniorEntreprises.id });
    if (!maj) return { erreur: "Cette organisation n'existe plus." };
    await journaliser({
      acteurId: acteur.id,
      action: active ? "JE_REACTIVEE" : "JE_DESACTIVEE",
      entite: "junior_entreprise",
      entiteId: lu.data.id,
    });
    revalidatePath("/admin/organisations");
    revalidatePath("/admin");
    return { ok: true, message: active ? "Organisation réactivée" : "Organisation désactivée" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
