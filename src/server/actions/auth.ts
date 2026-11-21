"use server";

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";
import { db } from "@/db";
import { jetonsVerification, juniorEntreprises, utilisateurs } from "@/db/schema";
import { jetonAleatoire } from "@/lib/ids";
import { signIn } from "@/server/auth";
import { envoyerEmail, gabaritEmail, urlApp } from "@/server/email";
import { ajouterXp, verifierBadgesSansErreur } from "@/server/moteur/gamification";
import { notifier } from "@/server/notifications";
import { lireParametres } from "@/server/parametres";
import { exigerConnecte } from "@/server/session";
import { journaliser } from "@/server/journal";
import { BAREME_XP } from "@/services/xp";

export type EtatFormulaire = { erreur?: string; erreurs?: Record<string, string>; ok?: boolean; message?: string };

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export async function connexion(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const suite = String(formData.get("suite") ?? "/accueil");
  if (!email || !motDePasse) return { erreur: "Saisissez votre e-mail et votre mot de passe." };
  try {
    await signIn("credentials", {
      email,
      motDePasse,
      redirectTo: suite.startsWith("/") && !suite.startsWith("//") ? suite : "/accueil",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { erreur: "E-mail ou mot de passe incorrect. Vérifiez la saisie, ou créez un compte." };
    }
    throw err; // la redirection de next-auth passe par une exception
  }
  return {};
}

export async function connexionGoogle() {
  await signIn("google", { redirectTo: "/accueil" });
}

const SchemaInscription = z.object({
  prenom: z.string().trim().min(2, "Prénom trop court.").max(60),
  nom: z.string().trim().min(2, "Nom trop court.").max(60),
  email: z.email("Adresse e-mail invalide.").transform((e) => e.toLowerCase().trim()),
  motDePasse: z
    .string()
    .min(8, "8 caractères au moins.")
    .max(128)
    .regex(/[A-Za-z]/, "Au moins une lettre.")
    .regex(/[0-9]/, "Au moins un chiffre."),
  jeId: z.string().max(40).optional().or(z.literal("")),
  departement: z.string().max(60).optional().or(z.literal("")),
});

export async function inscription(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const p = await lireParametres();
  if (!p["inscription.ouverte"]) return { erreur: "Les inscriptions sont momentanément fermées." };
  const lu = SchemaInscription.safeParse(Object.fromEntries(formData));
  if (!lu.success) {
    const erreurs: Record<string, string> = {};
    for (const i of lu.error.issues) erreurs[String(i.path[0])] ??= i.message;
    return { erreurs };
  }
  const d = lu.data;
  const [existe] = await db.select({ id: utilisateurs.id }).from(utilisateurs).where(eq(utilisateurs.email, d.email)).limit(1);
  if (existe) return { erreurs: { email: "Un compte existe déjà avec cette adresse. Connectez-vous." } };

  let jeId: string | null = null;
  if (d.jeId) {
    const [je] = await db.select({ id: juniorEntreprises.id }).from(juniorEntreprises).where(eq(juniorEntreprises.id, d.jeId)).limit(1);
    jeId = je?.id ?? null;
  }

  const [cree] = await db
    .insert(utilisateurs)
    .values({
      prenom: d.prenom,
      nom: d.nom,
      email: d.email,
      motDePasseHash: await bcrypt.hash(d.motDePasse, 11),
      jeId,
      departement: d.departement || null,
      rattachement: "EN_ATTENTE",
    })
    .returning({ id: utilisateurs.id });

  await envoyerLienVerification(cree.id, d.email, d.prenom);
  await journaliser({ acteurId: cree.id, action: "INSCRIPTION", entite: "utilisateur", entiteId: cree.id });

  if (jeId) {
    const rh = await db
      .select({ id: utilisateurs.id, roles: utilisateurs.roles })
      .from(utilisateurs)
      .where(eq(utilisateurs.jeId, jeId));
    await notifier(
      rh.filter((r) => r.roles.includes("RESP_RH")).map((r) => r.id),
      {
        type: "RATTACHEMENT",
        titre: "Nouveau membre à confirmer",
        message: `${d.prenom} ${d.nom} indique faire partie de votre organisation.`,
        lien: "/mon-organisation",
        email: true,
        cle: `rattachement:${cree.id}`,
      }
    );
  }

  await signIn("credentials", { email: d.email, motDePasse: d.motDePasse, redirectTo: "/accueil?bienvenue=1" });
  return {};
}

async function envoyerLienVerification(utilisateurId: string, email: string, prenom: string) {
  const jeton = jetonAleatoire();
  await db.insert(jetonsVerification).values({
    utilisateurId,
    empreinte: empreinte(jeton),
    type: "EMAIL",
    expireLe: new Date(Date.now() + 48 * 3600 * 1000),
  });
  await envoyerEmail({
    a: email,
    sujet: "Confirmez votre adresse e-mail — Cursus",
    html: gabaritEmail(
      `Bienvenue ${prenom} !`,
      "Confirmez votre adresse pour sécuriser votre compte et débloquer votre premier badge. Ce lien est valable 48 heures.",
      { url: urlApp(`/verifier-email/${jeton}`), libelle: "Confirmer mon e-mail" }
    ),
  });
}

export async function renvoyerVerification(): Promise<EtatFormulaire> {
  const u = await exigerConnecte();
  const [profil] = await db
    .select({ email: utilisateurs.email, prenom: utilisateurs.prenom, verifie: utilisateurs.emailVerifieLe })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, u.id))
    .limit(1);
  if (!profil) return { erreur: "Compte introuvable." };
  if (profil.verifie) return { ok: true, message: "Votre adresse est déjà confirmée." };
  await envoyerLienVerification(u.id, profil.email, profil.prenom);
  return { ok: true, message: `Lien envoyé à ${profil.email}.` };
}

/** Consomme un jeton de vérification. Renvoie l'état pour la page. */
export async function verifierEmail(jeton: string): Promise<"ok" | "invalide"> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(jeton)) return "invalide";
  const [j] = await db
    .select()
    .from(jetonsVerification)
    .where(
      and(
        eq(jetonsVerification.empreinte, empreinte(jeton)),
        eq(jetonsVerification.type, "EMAIL"),
        isNull(jetonsVerification.utiliseLe),
        gt(jetonsVerification.expireLe, new Date())
      )
    )
    .limit(1);
  if (!j) return "invalide";
  await db.update(jetonsVerification).set({ utiliseLe: new Date() }).where(eq(jetonsVerification.id, j.id));
  await db.update(utilisateurs).set({ emailVerifieLe: new Date() }).where(eq(utilisateurs.id, j.utilisateurId));
  await ajouterXp(j.utilisateurId, "EMAIL_VERIFIE", j.utilisateurId, BAREME_XP.EMAIL_VERIFIE, "E-mail vérifié");
  await verifierBadgesSansErreur(j.utilisateurId);
  return "ok";
}
