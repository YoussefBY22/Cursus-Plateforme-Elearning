import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fichiers } from "@/db/schema";
import { nouvelId } from "@/lib/ids";

/**
 * Stockage des fichiers déposés (photos, images de formation, logos et
 * signatures de certificat). Interface minimale
 * (`enregistrerFichier`, `lireFichier`, `supprimerFichier`), deux pilotes :
 *
 *  - `local` (défaut) : octets dans ./uploads, fiche en base. Idéal en
 *    développement et sur un serveur classique.
 *  - `base` : octets dans la table `fichier` (base64). Aucun service en plus,
 *    adapté à un hébergement serverless (Vercel) pour des fichiers < 2 Mo.
 *
 * Les vidéos ne passent JAMAIS par ici : elles restent chez le fournisseur
 * vidéo (YouTube non répertorié par défaut), c'est le vrai poste de coût.
 * Brancher R2 / Supabase Storage = écrire un 3e pilote avec ces 3 fonctions.
 */

const DOSSIER = path.join(process.cwd(), "uploads");
const TAILLE_MAX = 5 * 1024 * 1024;
export const TYPES_IMAGES = ["image/png", "image/jpeg", "image/webp"] as const;

function pilote(): "local" | "base" {
  return process.env.STOCKAGE === "base" ? "base" : "local";
}

export async function enregistrerFichier(
  nom: string,
  type: string,
  contenu: Uint8Array,
  creeParId?: string | null
): Promise<{ id: string; url: string }> {
  if (contenu.byteLength > TAILLE_MAX) throw new Error("Fichier trop lourd (5 Mo au plus).");
  const id = nouvelId();
  if (pilote() === "base") {
    if (contenu.byteLength > 2 * 1024 * 1024) throw new Error("Fichier trop lourd pour le stockage en base (2 Mo).");
    await db.insert(fichiers).values({
      id,
      nom,
      type,
      taille: contenu.byteLength,
      contenu: Buffer.from(contenu).toString("base64"),
      creeParId: creeParId ?? null,
    });
  } else {
    await mkdir(DOSSIER, { recursive: true });
    const chemin = `${id}`;
    await writeFile(path.join(DOSSIER, chemin), contenu);
    await db.insert(fichiers).values({ id, nom, type, taille: contenu.byteLength, chemin, creeParId: creeParId ?? null });
  }
  return { id, url: `/api/fichiers/${id}` };
}

export async function lireFichier(id: string): Promise<{ octets: Buffer; type: string; nom: string } | null> {
  const [f] = await db.select().from(fichiers).where(eq(fichiers.id, id)).limit(1);
  if (!f) return null;
  if (f.contenu) return { octets: Buffer.from(f.contenu, "base64"), type: f.type, nom: f.nom };
  if (!f.chemin || f.chemin.includes("..")) return null;
  try {
    return { octets: await readFile(path.join(DOSSIER, f.chemin)), type: f.type, nom: f.nom };
  } catch {
    return null;
  }
}

export async function supprimerFichier(id: string): Promise<void> {
  const [f] = await db.select().from(fichiers).where(eq(fichiers.id, id)).limit(1);
  if (!f) return;
  if (f.chemin && !f.chemin.includes("..")) await unlink(path.join(DOSSIER, f.chemin)).catch(() => {});
  await db.delete(fichiers).where(eq(fichiers.id, id));
}

/** Lit un fichier d'image envoyé par formulaire, vérifie son type réel. */
export async function imageDepuisFormulaire(
  valeur: FormDataEntryValue | null,
  creeParId?: string | null
): Promise<{ id: string; url: string } | null> {
  if (!valeur || typeof valeur === "string" || valeur.size === 0) return null;
  const octets = new Uint8Array(await valeur.arrayBuffer());
  const type = detecterTypeImage(octets);
  if (!type) throw new Error("Image non reconnue : PNG, JPEG ou WebP uniquement.");
  return enregistrerFichier(valeur.name || "image", type, octets, creeParId);
}

/** On croit les octets, pas l'extension ni le type déclaré par le navigateur. */
export function detecterTypeImage(o: Uint8Array): (typeof TYPES_IMAGES)[number] | null {
  if (o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47) return "image/png";
  if (o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return "image/jpeg";
  if (o[0] === 0x52 && o[1] === 0x49 && o[2] === 0x46 && o[3] === 0x46 && o[8] === 0x57 && o[9] === 0x45) return "image/webp";
  return null;
}
