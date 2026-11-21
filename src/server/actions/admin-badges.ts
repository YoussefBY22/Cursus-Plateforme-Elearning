"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NOMS_ICONES } from "@/components/icones";
import { db } from "@/db";
import { badges, criteresBadge, domaines, parcours, utilisateurs } from "@/db/schema";
import { erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { slugifier } from "@/lib/utils";
import { journaliser } from "@/server/journal";
import { verifierBadges } from "@/server/moteur/gamification";
import { exigerPermission } from "@/server/session";
import { CRITERES_PAR_CODE, EFFETS, FORMES, MATIERES, RARETES } from "@/services/badges";

const vide = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

const SchemaBadge = z.object({
  id: z.string().max(40).nullable(),
  nom: z.string().trim().min(3, "Nom trop court (3 caractères au moins).").max(60, "Nom trop long (60 caractères)."),
  description: z.string().trim().min(5, "Décrivez le badge en une phrase.").max(240, "Description trop longue (240 caractères)."),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide : #RRGGBB attendu."),
  forme: z.enum(FORMES, "Forme inconnue."),
  matiere: z.enum(MATIERES, "Matière inconnue."),
  rarete: z.enum(RARETES, "Rareté inconnue."),
  effet: z.enum(EFFETS, "Effet inconnu."),
  icone: z.string().refine((v) => NOMS_ICONES.includes(v), "Choisissez une icône de la grille."),
  critereCode: z.string().min(1, "Choisissez un critère.").max(60),
  seuil: z.coerce.number("Seuil invalide.").positive("Le seuil doit être supérieur à 0.").max(100000, "Seuil trop élevé."),
  parametre: z.string().max(40).nullable(),
  xpBonus: z.coerce.number("Bonus invalide.").int("Nombre entier attendu.").min(0, "Pas de bonus négatif.").max(1000, "1 000 XP au plus."),
  secret: z.boolean(),
  actif: z.boolean(),
});

export async function enregistrerBadge(_etat: Resultat<{ id: string }>, formData: FormData): Promise<Resultat<{ id: string }>> {
  try {
    const acteur = await exigerPermission("badges", "ecrire");
    const lu = SchemaBadge.safeParse({
      id: vide(formData.get("id")),
      nom: formData.get("nom") ?? "",
      description: formData.get("description") ?? "",
      couleur: formData.get("couleur") ?? "",
      forme: formData.get("forme"),
      matiere: formData.get("matiere"),
      rarete: formData.get("rarete"),
      effet: formData.get("effet"),
      icone: formData.get("icone") ?? "",
      critereCode: formData.get("critereCode") ?? "",
      seuil: formData.get("seuil") || "1",
      parametre: vide(formData.get("parametre")),
      xpBonus: formData.get("xpBonus") || "0",
      secret: formData.get("secret") === "on",
      actif: formData.get("actif") === "on",
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;

    // Le critère doit exister en base ET avoir un calcul dans services/badges.ts.
    const [critere] = await db.select().from(criteresBadge).where(eq(criteresBadge.code, d.critereCode)).limit(1);
    if (!critere || !CRITERES_PAR_CODE.has(d.critereCode)) return { erreurs: { critereCode: "Critère inconnu." } };

    let parametre: string | null = null;
    if (critere.parametre === "DOMAINE") {
      if (!d.parametre) return { erreurs: { parametre: "Choisissez le domaine concerné." } };
      const [dom] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.id, d.parametre)).limit(1);
      if (!dom) return { erreurs: { parametre: "Domaine introuvable." } };
      parametre = dom.id;
    } else if (critere.parametre === "PARCOURS") {
      if (!d.parametre) return { erreurs: { parametre: "Choisissez le parcours concerné." } };
      const [p] = await db
        .select({ id: parcours.id })
        .from(parcours)
        .where(and(eq(parcours.id, d.parametre), eq(parcours.statut, "PUBLIE")))
        .limit(1);
      if (!p) return { erreurs: { parametre: "Parcours introuvable ou non publié." } };
      parametre = p.id;
    }
    // Critère oui/non (sans unité) : le seuil vaut toujours 1.
    const seuil = critere.unite === "" ? 1 : d.seuil;

    const valeurs = {
      nom: d.nom,
      description: d.description,
      couleur: d.couleur.toUpperCase(),
      forme: d.forme,
      matiere: d.matiere,
      rarete: d.rarete,
      effet: d.effet,
      icone: d.icone,
      critereCode: d.critereCode,
      seuil,
      parametre,
      xpBonus: d.xpBonus,
      secret: d.secret,
      actif: d.actif,
    };

    let id = d.id;
    if (id) {
      const [maj] = await db.update(badges).set(valeurs).where(eq(badges.id, id)).returning({ id: badges.id });
      if (!maj) return { erreur: "Ce badge n'existe plus." };
      await journaliser({ acteurId: acteur.id, action: "BADGE_MODIFIE", entite: "badge", entiteId: id, details: valeurs });
    } else {
      const base = slugifier(d.nom).replaceAll("-", "_").toUpperCase().slice(0, 40) || "BADGE";
      let code = base;
      for (let i = 2; ; i++) {
        const [pris] = await db.select({ id: badges.id }).from(badges).where(eq(badges.code, code)).limit(1);
        if (!pris) break;
        code = `${base}_${i}`;
      }
      const [cree] = await db.insert(badges).values({ ...valeurs, code }).returning({ id: badges.id });
      id = cree.id;
      await journaliser({ acteurId: acteur.id, action: "BADGE_CREE", entite: "badge", entiteId: id, details: { ...valeurs, code } });
    }
    revalidatePath("/admin/badges");
    revalidatePath(`/admin/badges/${id}`);
    return { ok: true, message: d.id ? "Badge enregistré" : "Badge créé", donnees: { id } };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}

const SchemaActivation = z.object({ id: z.string().min(1).max(40), actif: z.enum(["true", "false"]) });

export async function changerActivationBadge(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("badges", "ecrire");
    const lu = SchemaActivation.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const actif = lu.data.actif === "true";
    const [maj] = await db.update(badges).set({ actif }).where(eq(badges.id, lu.data.id)).returning({ id: badges.id });
    if (!maj) return { erreur: "Ce badge n'existe plus." };
    await journaliser({ acteurId: acteur.id, action: actif ? "BADGE_RESTAURE" : "BADGE_ARCHIVE", entite: "badge", entiteId: lu.data.id });
    revalidatePath("/admin/badges");
    revalidatePath(`/admin/badges/${lu.data.id}`);
    return { ok: true, message: actif ? "Badge restauré" : "Badge archivé" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/**
 * Rejoue la vérification des badges pour tous les membres actifs : utile après
 * la création d'un badge ou l'abaissement d'un seuil. Idempotent (un badge déjà
 * obtenu n'est jamais redonné), par lots pour ménager la base.
 */
export async function attribuerRetroactivement(): Promise<Resultat<{ attribues: number; membres: number; echecs: number }>> {
  try {
    const acteur = await exigerPermission("badges", "ecrire");
    const membres = await db.select({ id: utilisateurs.id }).from(utilisateurs).where(eq(utilisateurs.actif, true));
    let attribues = 0;
    let echecs = 0;
    const LOT = 5;
    for (let i = 0; i < membres.length; i += LOT) {
      const resultats = await Promise.allSettled(membres.slice(i, i + LOT).map((m) => verifierBadges(m.id)));
      for (const r of resultats) {
        if (r.status === "fulfilled") attribues += r.value.length;
        else echecs++;
      }
    }
    await journaliser({
      acteurId: acteur.id,
      action: "BADGES_RETROACTIFS",
      entite: "badge",
      details: { membres: membres.length, attribues, echecs },
    });
    revalidatePath("/admin/badges");
    const message =
      attribues === 0
        ? "Aucun nouveau badge : chacun a déjà ce qu'il mérite"
        : `${attribues.toLocaleString("fr-FR")} badge${attribues > 1 ? "s" : ""} attribué${attribues > 1 ? "s" : ""}`;
    return { ok: true, message, donnees: { attribues, membres: membres.length, echecs } };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
