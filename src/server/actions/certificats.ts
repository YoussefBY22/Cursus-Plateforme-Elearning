"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { certificats, domaines, modelesCertificat, parcours } from "@/db/schema";
import { ErreurMetier, erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { regenererJeton, retablirCertificat, revoquerCertificat } from "@/server/moteur/certificats";
import { exigerPermission } from "@/server/session";
import { detecterTypeImage, imageDepuisFormulaire } from "@/server/stockage";
import { HEX_COULEUR, imagesInconnues } from "@/services/certificats/edition";
import { SchemaCanevasCertificat } from "@/services/certificats/schema-canevas";

export type ImageModele = { fichierId: string; nom: string; type: "png" | "jpeg" };

const LISTE = "/admin/certificats";
const idSchema = z.string().trim().min(1, "Identifiant manquant.").max(40);

function revaliderModele(id: string) {
  revalidatePath(LISTE);
  revalidatePath(`${LISTE}/modeles/${id}`);
}

/* ------------------------------------------------------------------ */
/* Modèles                                                             */
/* ------------------------------------------------------------------ */

const SchemaModele = z.object({
  id: idSchema,
  nom: z.string().trim().min(3, "Nom trop court (3 caractères au moins).").max(80, "Nom trop long (80 caractères)."),
  couleurTheme: z.string().regex(HEX_COULEUR, "Couleur invalide : #RRGGBB attendu."),
  domaineId: z.string().trim().max(40).nullable(),
  canevas: SchemaCanevasCertificat,
});

/**
 * Enregistrement automatique de l'éditeur : réglages + canevas d'un bloc.
 * Appelé après une pause de frappe, jamais par un formulaire.
 */
export async function enregistrerModele(entree: unknown): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = SchemaModele.safeParse(entree);
    if (!lu.success) {
      const erreurs = erreursZod(lu.error.issues);
      return { erreurs, erreur: Object.values(erreurs)[0] ?? "Modèle invalide." };
    }
    const d = lu.data;

    const [m] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.id, d.id)).limit(1);
    if (!m) return { erreur: "Ce modèle n'existe plus." };
    if (m.archive) return { erreur: "Ce modèle est archivé : restaurez-le pour le modifier." };

    const inconnues = imagesInconnues(d.canevas, m.images.map((i) => i.fichierId));
    if (inconnues.length) return { erreur: "Une image de la page n'appartient pas à ce modèle. Déposez-la à nouveau." };

    const domaineId = d.domaineId || null;
    if (domaineId) {
      const [dom] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.id, domaineId)).limit(1);
      if (!dom) return { erreurs: { domaineId: "Domaine introuvable." }, erreur: "Domaine introuvable." };
      const [pris] = await db
        .select({ nom: modelesCertificat.nom })
        .from(modelesCertificat)
        .where(and(eq(modelesCertificat.domaineId, domaineId), eq(modelesCertificat.archive, false), ne(modelesCertificat.id, d.id)))
        .limit(1);
      if (pris) {
        const message = `Ce domaine est déjà associé au modèle « ${pris.nom} ».`;
        return { erreurs: { domaineId: message }, erreur: message };
      }
    }

    const couleurTheme = d.couleurTheme.toUpperCase();
    await db
      .update(modelesCertificat)
      .set({ nom: d.nom, couleurTheme, domaineId, canevas: d.canevas, majLe: new Date() })
      .where(eq(modelesCertificat.id, d.id));

    // Le canevas s'enregistre à chaque pause : on ne journalise que les réglages.
    if (m.nom !== d.nom || m.couleurTheme !== couleurTheme || m.domaineId !== domaineId) {
      await journaliser({
        acteurId: acteur.id,
        action: "MODELE_CERTIFICAT_MODIFIE",
        entite: "modele_certificat",
        entiteId: d.id,
        details: { nom: d.nom, couleurTheme, domaineId },
      });
    }
    revalidatePath(LISTE);
    return { ok: true, message: "Modèle enregistré" };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Vos modifications restent à l'écran : réessayez.") };
  }
}

const SchemaCreation = z.object({
  sourceId: idSchema,
  nom: z.string().trim().min(3, "Nom trop court (3 caractères au moins).").max(80, "Nom trop long (80 caractères)."),
});

/** Crée un modèle en dupliquant un modèle existant (le modèle par défaut le plus souvent). */
export async function creerModele(entree: unknown): Promise<Resultat<{ id: string }>> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = SchemaCreation.safeParse(entree);
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const [source] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.id, lu.data.sourceId)).limit(1);
    if (!source) return { erreur: "Le modèle à dupliquer n'existe plus." };
    const [cree] = await db
      .insert(modelesCertificat)
      .values({
        nom: lu.data.nom,
        couleurTheme: source.couleurTheme,
        canevas: source.canevas,
        images: source.images,
        domaineId: null,
        parDefaut: false,
      })
      .returning({ id: modelesCertificat.id });
    await journaliser({
      acteurId: acteur.id,
      action: "MODELE_CERTIFICAT_CREE",
      entite: "modele_certificat",
      entiteId: cree.id,
      details: { nom: lu.data.nom, source: source.id },
    });
    revalidatePath(LISTE);
    return { ok: true, message: "Modèle créé", donnees: { id: cree.id } };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

export async function definirModeleParDefaut(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = idSchema.safeParse(formData.get("id"));
    if (!lu.success) return { erreur: "Requête invalide." };
    await db.transaction(async (tx) => {
      const [m] = await tx.select().from(modelesCertificat).where(eq(modelesCertificat.id, lu.data)).limit(1);
      if (!m) throw new ErreurMetier("Ce modèle n'existe plus.");
      if (m.archive) throw new ErreurMetier("Restaurez ce modèle avant d'en faire le modèle par défaut.");
      await tx.update(modelesCertificat).set({ parDefaut: false }).where(eq(modelesCertificat.parDefaut, true));
      await tx.update(modelesCertificat).set({ parDefaut: true }).where(eq(modelesCertificat.id, lu.data));
    });
    await journaliser({ acteurId: acteur.id, action: "MODELE_CERTIFICAT_DEFAUT", entite: "modele_certificat", entiteId: lu.data });
    revaliderModele(lu.data);
    return { ok: true, message: "Modèle par défaut changé" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/**
 * Archive un modèle. Les certificats déjà émis n'en dépendent pas (leur
 * canevas est figé à l'émission) ; on refuse en revanche d'archiver le
 * modèle par défaut ou un modèle encore choisi par un parcours.
 */
export async function archiverModele(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = idSchema.safeParse(formData.get("id"));
    if (!lu.success) return { erreur: "Requête invalide." };
    const [m] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.id, lu.data)).limit(1);
    if (!m) return { erreur: "Ce modèle n'existe plus." };
    if (m.parDefaut) return { erreur: "Le modèle par défaut ne s'archive pas : choisissez d'abord un autre modèle par défaut." };
    const utilisateurs = await db.select({ titre: parcours.titre }).from(parcours).where(eq(parcours.modeleCertificatId, m.id));
    if (utilisateurs.length) {
      return {
        erreur: `Ce modèle est choisi par ${utilisateurs.length} parcours (${utilisateurs
          .slice(0, 2)
          .map((p) => `« ${p.titre} »`)
          .join(", ")}${utilisateurs.length > 2 ? "…" : ""}). Changez leur modèle avant de l'archiver.`,
      };
    }
    // Un modèle archivé ne doit plus être choisi pour son domaine.
    await db.update(modelesCertificat).set({ archive: true, domaineId: null }).where(eq(modelesCertificat.id, m.id));
    await journaliser({
      acteurId: acteur.id,
      action: "MODELE_CERTIFICAT_ARCHIVE",
      entite: "modele_certificat",
      entiteId: m.id,
      details: { domaineId: m.domaineId },
    });
    revaliderModele(m.id);
    return { ok: true, message: "Modèle archivé" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

export async function restaurerModele(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = idSchema.safeParse(formData.get("id"));
    if (!lu.success) return { erreur: "Requête invalide." };
    const [m] = await db
      .update(modelesCertificat)
      .set({ archive: false })
      .where(eq(modelesCertificat.id, lu.data))
      .returning({ id: modelesCertificat.id });
    if (!m) return { erreur: "Ce modèle n'existe plus." };
    await journaliser({ acteurId: acteur.id, action: "MODELE_CERTIFICAT_RESTAURE", entite: "modele_certificat", entiteId: m.id });
    revaliderModele(m.id);
    return { ok: true, message: "Modèle restauré" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

/** Dépose un logo, une signature ou un cachet (PNG ou JPEG) dans la bibliothèque du modèle. */
export async function deposerImageModele(formData: FormData): Promise<Resultat<ImageModele>> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = idSchema.safeParse(formData.get("modeleId"));
    if (!lu.success) return { erreur: "Requête invalide." };
    const fichier = formData.get("image");
    if (!(fichier instanceof File) || fichier.size === 0) return { erreur: "Choisissez une image PNG ou JPEG." };
    if (fichier.size > TAILLE_MAX_IMAGE) return { erreur: "Image trop lourde (5 Mo au plus)." };

    // On croit les octets, pas l'extension : le moteur PDF ne lit que PNG et JPEG.
    const entete = new Uint8Array(await fichier.slice(0, 16).arrayBuffer());
    const type = detecterTypeImage(entete);
    if (type !== "image/png" && type !== "image/jpeg") return { erreur: "Format non pris en charge : PNG ou JPEG uniquement." };

    const [m] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.id, lu.data)).limit(1);
    if (!m) return { erreur: "Ce modèle n'existe plus." };
    if (m.archive) return { erreur: "Ce modèle est archivé : restaurez-le pour le modifier." };

    const enregistre = await imageDepuisFormulaire(fichier, acteur.id);
    if (!enregistre) return { erreur: "Choisissez une image PNG ou JPEG." };
    const image: ImageModele = {
      fichierId: enregistre.id,
      nom: (fichier.name || "image").slice(0, 120),
      type: type === "image/png" ? "png" : "jpeg",
    };
    await db
      .update(modelesCertificat)
      .set({ images: [...m.images, image] })
      .where(eq(modelesCertificat.id, m.id));
    await journaliser({
      acteurId: acteur.id,
      action: "MODELE_CERTIFICAT_IMAGE",
      entite: "modele_certificat",
      entiteId: m.id,
      details: { fichierId: image.fichierId, nom: image.nom },
    });
    return { ok: true, message: "Image déposée", donnees: image };
  } catch (err) {
    if (err instanceof Error && /trop lourd/i.test(err.message)) return { erreur: err.message };
    return { erreur: messageErreur(err, "Dépôt impossible. Réessayez avec une autre image.") };
  }
}

/* ------------------------------------------------------------------ */
/* Certificats émis                                                    */
/* ------------------------------------------------------------------ */

const SchemaRevocation = z.object({
  id: idSchema,
  motif: z
    .string()
    .trim()
    .min(5, "Précisez le motif (5 caractères au moins) : il est montré au titulaire et sur la page de vérification.")
    .max(300, "Motif trop long (300 caractères)."),
});

export async function revoquerCertificatAdmin(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = SchemaRevocation.safeParse({ id: formData.get("id"), motif: formData.get("motif") ?? "" });
    if (!lu.success) {
      const erreurs = erreursZod(lu.error.issues);
      return { erreurs, erreur: Object.values(erreurs)[0] };
    }
    const c = await revoquerCertificat(lu.data.id, acteur.id, lu.data.motif);
    if (!c) return { erreur: "Ce certificat est déjà révoqué ou n'existe plus." };
    revalidatePath(LISTE);
    revalidatePath("/certificats");
    return { ok: true, message: "Certificat révoqué" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

export async function retablirCertificatAdmin(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = idSchema.safeParse(formData.get("id"));
    if (!lu.success) return { erreur: "Requête invalide." };
    const [c] = await db.select({ revoqueLe: certificats.revoqueLe }).from(certificats).where(eq(certificats.id, lu.data)).limit(1);
    if (!c) return { erreur: "Ce certificat n'existe plus." };
    if (!c.revoqueLe) return { erreur: "Ce certificat n'est pas révoqué." };
    await retablirCertificat(lu.data, acteur.id);
    revalidatePath(LISTE);
    revalidatePath("/certificats");
    return { ok: true, message: "Certificat rétabli" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

export async function regenererJetonCertificat(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("certificats", "ecrire");
    const lu = idSchema.safeParse(formData.get("id"));
    if (!lu.success) return { erreur: "Requête invalide." };
    const [c] = await db.select({ id: certificats.id }).from(certificats).where(eq(certificats.id, lu.data)).limit(1);
    if (!c) return { erreur: "Ce certificat n'existe plus." };
    await regenererJeton(c.id, acteur.id);
    revalidatePath(LISTE);
    revalidatePath("/certificats");
    return { ok: true, message: "Jeton régénéré : l'ancien QR code ne fonctionne plus" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
