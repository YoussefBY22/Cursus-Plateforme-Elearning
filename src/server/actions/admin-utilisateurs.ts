"use server";

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { juniorEntreprises, utilisateurs } from "@/db/schema";
import { erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { AccesRefuse, exigerPermission, type Utilisateur } from "@/server/session";
import type { CodeRole } from "@/services/rbac";

const ROLES_VALIDES = ["SUPER_ADMIN", "RESP_PEDAGO", "FORMATEUR", "RESP_RH", "MEMBRE"] as const satisfies readonly CodeRole[];

/** Écrire un compte : permission « utilisateurs:ecrire » ET rôle super admin. */
async function exigerEcritureComptes(): Promise<Utilisateur> {
  const u = await exigerPermission("utilisateurs", "ecrire");
  if (!u.roles.includes("SUPER_ADMIN")) throw new AccesRefuse("Modifier un compte est réservé au super admin.");
  return u;
}

const SchemaCompte = z.object({
  id: z.string().min(1).max(40),
  roles: z.array(z.enum(ROLES_VALIDES)).max(5),
  jeId: z.string().max(40),
  rattachement: z.enum(["EN_ATTENTE", "VALIDE", "REFUSE"]),
});

export async function enregistrerCompte(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerEcritureComptes();
    const lu = SchemaCompte.safeParse({
      id: formData.get("id"),
      roles: formData.getAll("roles"),
      jeId: formData.get("jeId") ?? "",
      rattachement: formData.get("rattachement"),
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;

    const [cible] = await db
      .select({ id: utilisateurs.id, roles: utilisateurs.roles, jeId: utilisateurs.jeId, rattachement: utilisateurs.rattachement })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, d.id))
      .limit(1);
    if (!cible) return { erreur: "Ce compte n'existe plus." };

    // Le rôle MEMBRE est le socle de tout compte : il ne se retire pas.
    const roles = [...new Set<CodeRole>(["MEMBRE", ...d.roles])];
    const ajouteSuperAdmin = roles.includes("SUPER_ADMIN") && !cible.roles.includes("SUPER_ADMIN");
    const retireSuperAdmin = !roles.includes("SUPER_ADMIN") && cible.roles.includes("SUPER_ADMIN");

    if (ajouteSuperAdmin && !acteur.roles.includes("SUPER_ADMIN")) {
      return { erreurs: { roles: "Seul un super admin peut attribuer le rôle super admin." } };
    }
    if (retireSuperAdmin && cible.id === acteur.id) {
      return { erreurs: { roles: "Vous ne pouvez pas retirer votre propre rôle de super admin : demandez-le à un autre super admin." } };
    }

    let jeId: string | null = null;
    if (d.jeId) {
      const [je] = await db.select({ id: juniorEntreprises.id }).from(juniorEntreprises).where(eq(juniorEntreprises.id, d.jeId)).limit(1);
      if (!je) return { erreurs: { jeId: "Organisation introuvable." } };
      jeId = je.id;
    }
    if (roles.includes("RESP_RH") && !jeId) {
      return { erreurs: { jeId: "Un responsable RH doit être rattaché à une organisation." } };
    }
    // Sans organisation, un rattachement « validé » n'a pas de sens.
    const rattachement = jeId ? d.rattachement : "EN_ATTENTE";

    await db.update(utilisateurs).set({ roles, jeId, rattachement }).where(eq(utilisateurs.id, d.id));
    await journaliser({
      acteurId: acteur.id,
      action: "COMPTE_MODIFIE",
      entite: "utilisateur",
      entiteId: d.id,
      details: {
        avant: { roles: cible.roles, jeId: cible.jeId, rattachement: cible.rattachement },
        apres: { roles, jeId, rattachement },
      },
    });
    revalidatePath("/admin/utilisateurs");
    revalidatePath(`/admin/utilisateurs/${d.id}`);
    return { ok: true, message: "Compte enregistré" };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}

const SchemaActivation = z.object({ id: z.string().min(1).max(40), actif: z.enum(["true", "false"]) });

export async function changerActivationCompte(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerEcritureComptes();
    const lu = SchemaActivation.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const actif = lu.data.actif === "true";
    if (!actif && lu.data.id === acteur.id) return { erreur: "Vous ne pouvez pas désactiver votre propre compte." };
    const [maj] = await db
      .update(utilisateurs)
      .set({ actif })
      .where(eq(utilisateurs.id, lu.data.id))
      .returning({ id: utilisateurs.id });
    if (!maj) return { erreur: "Ce compte n'existe plus." };
    await journaliser({
      acteurId: acteur.id,
      action: actif ? "COMPTE_REACTIVE" : "COMPTE_DESACTIVE",
      entite: "utilisateur",
      entiteId: lu.data.id,
    });
    revalidatePath("/admin/utilisateurs");
    revalidatePath(`/admin/utilisateurs/${lu.data.id}`);
    return { ok: true, message: actif ? "Compte réactivé" : "Compte désactivé" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/** Sans caractères ambigus (0/O, 1/l/I) : il sera dicté ou recopié. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function motDePasseTemporaire(): string {
  for (;;) {
    let m = "";
    for (let i = 0; i < 12; i++) m += ALPHABET[randomInt(ALPHABET.length)];
    if (/[A-Za-z]/.test(m) && /[0-9]/.test(m)) return `${m.slice(0, 4)}-${m.slice(4, 8)}-${m.slice(8)}`;
  }
}

export async function reinitialiserMotDePasse(formData: FormData): Promise<Resultat<{ motDePasse: string }>> {
  try {
    const acteur = await exigerEcritureComptes();
    const id = z.string().min(1).max(40).safeParse(formData.get("id"));
    if (!id.success) return { erreur: "Requête invalide." };
    const motDePasse = motDePasseTemporaire();
    const [maj] = await db
      .update(utilisateurs)
      .set({ motDePasseHash: await bcrypt.hash(motDePasse, 11) })
      .where(eq(utilisateurs.id, id.data))
      .returning({ id: utilisateurs.id });
    if (!maj) return { erreur: "Ce compte n'existe plus." };
    await journaliser({
      acteurId: acteur.id,
      action: "MOT_DE_PASSE_REINITIALISE",
      entite: "utilisateur",
      entiteId: id.data,
    });
    revalidatePath(`/admin/utilisateurs/${id.data}`);
    return { ok: true, message: "Mot de passe réinitialisé", donnees: { motDePasse } };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
