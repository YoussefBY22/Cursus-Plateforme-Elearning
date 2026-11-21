"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NOMS_ICONES } from "@/components/icones";
import { db } from "@/db";
import { competences, domaines } from "@/db/schema";
import { erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { slugifier } from "@/lib/utils";
import { journaliser } from "@/server/journal";
import { exigerPermission } from "@/server/session";

const vide = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

const codeDepuis = (texte: string) => slugifier(texte).replaceAll("-", "_").toUpperCase().slice(0, 40);

function rafraichir() {
  revalidatePath("/admin/referentiel");
  revalidatePath("/admin");
}

/* ------------------------------------------------------------------ */
/* Domaines                                                            */
/* ------------------------------------------------------------------ */

const SchemaDomaine = z.object({
  id: z.string().max(40).nullable(),
  nom: z.string().trim().min(3, "Nom trop court.").max(80, "Nom trop long (80 caractères)."),
  description: z.string().max(400, "Description trop longue (400 caractères).").nullable(),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide : #RRGGBB attendu."),
  icone: z.string().refine((v) => NOMS_ICONES.includes(v), "Choisissez une icône de la liste."),
});

export async function enregistrerDomaine(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("referentiel", "ecrire");
    const lu = SchemaDomaine.safeParse({
      id: vide(formData.get("id")),
      nom: formData.get("nom") ?? "",
      description: vide(formData.get("description")),
      couleur: formData.get("couleur") ?? "",
      icone: formData.get("icone") ?? "",
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;
    const valeurs = { nom: d.nom, description: d.description, couleur: d.couleur.toUpperCase(), icone: d.icone };

    if (d.id) {
      const [maj] = await db.update(domaines).set(valeurs).where(eq(domaines.id, d.id)).returning({ id: domaines.id });
      if (!maj) return { erreur: "Ce domaine n'existe plus." };
      await journaliser({ acteurId: acteur.id, action: "DOMAINE_MODIFIE", entite: "domaine", entiteId: d.id, details: valeurs });
    } else {
      const existants = await db.select({ code: domaines.code, ordre: domaines.ordre }).from(domaines);
      const base = codeDepuis(d.nom) || "DOMAINE";
      let code = base;
      for (let i = 2; existants.some((e) => e.code === code); i++) code = `${base}_${i}`;
      const ordre = existants.reduce((m, e) => Math.max(m, e.ordre), 0) + 1;
      const [cree] = await db.insert(domaines).values({ ...valeurs, code, ordre }).returning({ id: domaines.id });
      await journaliser({ acteurId: acteur.id, action: "DOMAINE_CREE", entite: "domaine", entiteId: cree.id, details: { ...valeurs, code } });
    }
    rafraichir();
    return { ok: true, message: d.id ? "Domaine enregistré" : "Domaine créé" };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}

const SchemaDeplacement = z.object({ id: z.string().min(1).max(40), sens: z.enum(["haut", "bas"]) });

/** Échange la position d'un élément avec son voisin, après avoir renuméroté la liste (1, 2, 3…). */
function permuter<T extends { id: string }>(liste: T[], id: string, sens: "haut" | "bas"): T[] | null {
  const i = liste.findIndex((x) => x.id === id);
  const j = sens === "haut" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= liste.length) return null;
  const copie = [...liste];
  [copie[i], copie[j]] = [copie[j], copie[i]];
  return copie;
}

export async function deplacerDomaine(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("referentiel", "ecrire");
    const lu = SchemaDeplacement.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const liste = await db.select({ id: domaines.id }).from(domaines).orderBy(asc(domaines.ordre), asc(domaines.nom));
    const nouvelle = permuter(liste, lu.data.id, lu.data.sens);
    if (!nouvelle) return { ok: true };
    await db.transaction(async (tx) => {
      for (const [i, d] of nouvelle.entries()) await tx.update(domaines).set({ ordre: i + 1 }).where(eq(domaines.id, d.id));
    });
    await journaliser({ acteurId: acteur.id, action: "DOMAINE_DEPLACE", entite: "domaine", entiteId: lu.data.id, details: { sens: lu.data.sens } });
    rafraichir();
    return { ok: true, message: "Ordre des domaines mis à jour" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Compétences communes (je_id nul)                                */
/* ------------------------------------------------------------------ */

const SchemaCompetence = z.object({
  id: z.string().max(40).nullable(),
  domaineId: z.string().min(1, "Domaine manquant.").max(40),
  nom: z.string().trim().min(3, "Nom trop court.").max(120, "Nom trop long (120 caractères)."),
  description: z.string().max(500, "Description trop longue (500 caractères).").nullable(),
  question: z.string().max(240, "Question trop longue (240 caractères).").nullable(),
  pistes: z.string().max(1500, "Pistes trop longues (1 500 caractères).").nullable(),
});

export async function enregistrerCompetence(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("referentiel", "ecrire");
    const lu = SchemaCompetence.safeParse({
      id: vide(formData.get("id")),
      domaineId: formData.get("domaineId") ?? "",
      nom: formData.get("nom") ?? "",
      description: vide(formData.get("description")),
      question: vide(formData.get("question")),
      pistes: vide(formData.get("pistes")),
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;
    const valeurs = { nom: d.nom, description: d.description, question: d.question, pistes: d.pistes };

    if (d.id) {
      // Seules les compétences de la plateforme se modifient ici ; les versions adaptées restent aux organisations.
      const [maj] = await db
        .update(competences)
        .set(valeurs)
        .where(and(eq(competences.id, d.id), isNull(competences.jeId)))
        .returning({ id: competences.id });
      if (!maj) return { erreur: "Cette compétence n'existe plus ou appartient à une organisation." };
      await journaliser({ acteurId: acteur.id, action: "COMPETENCE_MODIFIEE", entite: "competence", entiteId: d.id, details: valeurs });
    } else {
      const [domaine] = await db.select({ code: domaines.code }).from(domaines).where(eq(domaines.id, d.domaineId)).limit(1);
      if (!domaine) return { erreur: "Ce domaine n'existe plus." };
      const existantes = await db
        .select({ code: competences.code, ordre: competences.ordre, domaineId: competences.domaineId })
        .from(competences)
        .where(isNull(competences.jeId));
      const base = `${domaine.code}_${codeDepuis(d.nom)}`.slice(0, 60);
      let code = base;
      for (let i = 2; existantes.some((e) => e.code === code); i++) code = `${base}_${i}`;
      const ordre = existantes.filter((e) => e.domaineId === d.domaineId).reduce((m, e) => Math.max(m, e.ordre), 0) + 1;
      const [cree] = await db
        .insert(competences)
        .values({ ...valeurs, code, ordre, domaineId: d.domaineId, jeId: null })
        .returning({ id: competences.id });
      await journaliser({ acteurId: acteur.id, action: "COMPETENCE_CREEE", entite: "competence", entiteId: cree.id, details: { ...valeurs, code } });
    }
    rafraichir();
    return { ok: true, message: d.id ? "Compétence enregistrée" : "Compétence ajoutée" };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}

export async function deplacerCompetence(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("referentiel", "ecrire");
    const lu = SchemaDeplacement.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const [c] = await db
      .select({ domaineId: competences.domaineId })
      .from(competences)
      .where(and(eq(competences.id, lu.data.id), isNull(competences.jeId)))
      .limit(1);
    if (!c) return { erreur: "Cette compétence n'existe plus." };
    const liste = await db
      .select({ id: competences.id })
      .from(competences)
      .where(and(eq(competences.domaineId, c.domaineId), isNull(competences.jeId)))
      .orderBy(asc(competences.ordre), asc(competences.nom));
    const nouvelle = permuter(liste, lu.data.id, lu.data.sens);
    if (!nouvelle) return { ok: true };
    await db.transaction(async (tx) => {
      for (const [i, x] of nouvelle.entries()) await tx.update(competences).set({ ordre: i + 1 }).where(eq(competences.id, x.id));
    });
    await journaliser({ acteurId: acteur.id, action: "COMPETENCE_DEPLACEE", entite: "competence", entiteId: lu.data.id, details: { sens: lu.data.sens } });
    rafraichir();
    return { ok: true, message: "Ordre des compétences mis à jour" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaActivation = z.object({ id: z.string().min(1).max(40), active: z.enum(["true", "false"]) });

export async function changerActivationCompetence(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("referentiel", "ecrire");
    const lu = SchemaActivation.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const active = lu.data.active === "true";
    const [maj] = await db
      .update(competences)
      .set({ active })
      .where(and(eq(competences.id, lu.data.id), isNull(competences.jeId)))
      .returning({ id: competences.id });
    if (!maj) return { erreur: "Cette compétence n'existe plus." };
    await journaliser({
      acteurId: acteur.id,
      action: active ? "COMPETENCE_ACTIVEE" : "COMPETENCE_DESACTIVEE",
      entite: "competence",
      entiteId: lu.data.id,
    });
    rafraichir();
    return { ok: true, message: active ? "Compétence réactivée" : "Compétence désactivée" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
