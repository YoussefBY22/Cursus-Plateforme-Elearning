"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { etapesHistoriqueJE, utilisateurs } from "@/db/schema";
import { erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { verifierBadgesSansErreur } from "@/server/moteur/gamification";
import { exigerSession } from "@/server/session";
import { normaliserUrl } from "@/services/visibilite";

/*
 * Mon profil : les seules écritures qu'un membre fait sur lui-même.
 *
 * Son rôle, son organisation et son XP ne sont pas ici : ils se décident ailleurs
 * (administration, rattachement, moteur de gamification). Un membre ne peut
 * donc pas se promouvoir en modifiant son profil.
 */

const vide = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

const url = z
  .string()
  .max(300, "Lien trop long.")
  .nullable()
  .transform((v) => normaliserUrl(v))
  .refine((v) => v === null || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "Lien invalide : attendez-vous à https://…");

const SchemaProfil = z.object({
  prenom: z.string().trim().min(2, "Prénom trop court.").max(60, "Prénom trop long."),
  nom: z.string().trim().min(2, "Nom trop court.").max(60, "Nom trop long."),
  photoUrl: url,
  poste: z.string().trim().max(80, "Intitulé trop long (80 caractères).").nullable(),
  departement: z.string().trim().max(80, "Nom trop long (80 caractères).").nullable(),
  bio: z.string().trim().max(600, "Bio trop longue (600 caractères).").nullable(),
  linkedin: url,
  whatsapp: z
    .string()
    .trim()
    .max(25)
    .nullable()
    .refine((v) => v === null || /^(\+|00)\d[\d\s().-]{6,24}$/.test(v), "Numéro invalide. Format international attendu, par exemple +33 6 12 34 56 78."),
  instagram: url,
  github: url,
  site: url,
  visibleAnnuaire: z.boolean(),
  masquerStats: z.boolean(),
});

export async function enregistrerMonProfil(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerSession();
    const lu = SchemaProfil.safeParse({
      prenom: formData.get("prenom") ?? "",
      nom: formData.get("nom") ?? "",
      photoUrl: vide(formData.get("photoUrl")),
      poste: vide(formData.get("poste")),
      departement: vide(formData.get("departement")),
      bio: vide(formData.get("bio")),
      linkedin: vide(formData.get("linkedin")),
      whatsapp: vide(formData.get("whatsapp")),
      instagram: vide(formData.get("instagram")),
      github: vide(formData.get("github")),
      site: vide(formData.get("site")),
      visibleAnnuaire: formData.get("visibleAnnuaire") === "on",
      masquerStats: formData.get("masquerStats") === "on",
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;

    await db
      .update(utilisateurs)
      .set({
        prenom: d.prenom,
        nom: d.nom,
        photoUrl: d.photoUrl,
        poste: d.poste,
        departement: d.departement,
        bio: d.bio,
        linkedin: d.linkedin,
        whatsapp: d.whatsapp,
        reseaux: {
          ...(d.instagram ? { instagram: d.instagram } : {}),
          ...(d.github ? { github: d.github } : {}),
          ...(d.site ? { site: d.site } : {}),
        },
        visibleAnnuaire: d.visibleAnnuaire,
        masquerStats: d.masquerStats,
        majLe: new Date(),
      })
      .where(eq(utilisateurs.id, u.id));

    // Un profil complété peut débloquer un badge — sans faire échouer
    // l'enregistrement si le calcul des badges a un souci.
    await verifierBadgesSansErreur(u.id);

    await journaliser({
      acteurId: u.id,
      action: "PROFIL_MODIFIE",
      entite: "utilisateur",
      entiteId: u.id,
      details: { visibleAnnuaire: d.visibleAnnuaire, masquerStats: d.masquerStats },
    });

    revalidatePath("/profil");
    revalidatePath(`/membres/${u.id}`);
    revalidatePath("/annuaire");
    return { ok: true, message: "Profil enregistré" };
  } catch (err) {
    return { erreur: messageErreur(err, "Votre profil n'a pas pu être enregistré.") };
  }
}

const anneeMax = new Date().getFullYear() + 1;

const SchemaEtape = z.object({
  annee: z.coerce.number("Année invalide.").int().min(2000, "Année trop ancienne.").max(anneeMax, "Année dans le futur."),
  anneeFin: z.coerce
    .number("Année invalide.")
    .int()
    .min(2000)
    .max(anneeMax + 6)
    .nullable(),
  poste: z.string().trim().min(2, "Indiquez le poste.").max(80, "Intitulé trop long."),
  organisation: z.string().trim().min(2, "Indiquez l'organisation.").max(100, "Nom trop long."),
  description: z.string().trim().max(400, "Description trop longue.").nullable(),
});

/** Ajoute une étape à la frise du parcours associatif. */
export async function ajouterEtapeHistorique(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerSession();
    const brut = {
      annee: formData.get("annee") ?? "",
      anneeFin: vide(formData.get("anneeFin")),
      poste: formData.get("poste") ?? "",
      organisation: formData.get("organisation") ?? "",
      description: vide(formData.get("description")),
    };
    const lu = SchemaEtape.safeParse(brut);
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;
    if (d.anneeFin !== null && d.anneeFin < d.annee) {
      return { erreurs: { anneeFin: "L'année de fin précède l'année de début." } };
    }

    const [{ n }] = await db
      .select({ n: count() })
      .from(etapesHistoriqueJE)
      .where(eq(etapesHistoriqueJE.utilisateurId, u.id));
    if (n >= 12) return { erreur: "Votre frise compte déjà douze étapes. Retirez-en une avant d'en ajouter." };

    await db.insert(etapesHistoriqueJE).values({
      utilisateurId: u.id,
      annee: d.annee,
      anneeFin: d.anneeFin,
      poste: d.poste,
      organisation: d.organisation,
      description: d.description,
    });

    revalidatePath("/profil");
    revalidatePath(`/membres/${u.id}`);
    revalidatePath(`/formateurs/${u.id}`);
    return { ok: true, message: "Étape ajoutée" };
  } catch (err) {
    return { erreur: messageErreur(err, "L'étape n'a pas pu être ajoutée.") };
  }
}

/** Retire une étape de la frise. Un membre ne touche qu'à la sienne. */
export async function supprimerEtapeHistorique(formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerSession();
    const id = z.string().min(1).max(40).safeParse(formData.get("id"));
    if (!id.success) return { erreur: "Requête invalide." };

    const supprimees = await db
      .delete(etapesHistoriqueJE)
      .where(and(eq(etapesHistoriqueJE.id, id.data), eq(etapesHistoriqueJE.utilisateurId, u.id)))
      .returning({ id: etapesHistoriqueJE.id });
    if (!supprimees.length) return { erreur: "Cette étape n'existe plus." };

    revalidatePath("/profil");
    revalidatePath(`/membres/${u.id}`);
    revalidatePath(`/formateurs/${u.id}`);
    return { ok: true, message: "Étape retirée" };
  } catch (err) {
    return { erreur: messageErreur(err, "L'étape n'a pas pu être retirée.") };
  }
}
