import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { certificats, domaines, juniorEntreprises, modelesCertificat, parcours, utilisateurs } from "@/db/schema";
import { urlApp } from "@/server/email";
import { lienVerification } from "@/server/moteur/certificats";

/* ------------------------------------------------------------------ */
/* QR code                                                             */
/* ------------------------------------------------------------------ */

/**
 * QR code en SVG pour le rendu HTML. Le module sombre est dessiné en
 * `currentColor` : la couleur du bloc (réglée dans l'éditeur) s'applique en
 * CSS, sans regénérer le code. Mêmes réglages que le PDF (correction M,
 * sans marge, fond blanc).
 */
export async function qrSvg(contenu: string): Promise<string> {
  const svg = await QRCode.toString(contenu, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return svg.replace(/stroke="#000000(ff)?"/gi, 'stroke="currentColor"');
}

/** QR code des aperçus de modèle : il ne certifie rien, il montre la place. */
export function qrExemple(): Promise<string> {
  return qrSvg(urlApp("/v/apercu-du-modele"));
}

/* ------------------------------------------------------------------ */
/* Modèles                                                             */
/* ------------------------------------------------------------------ */

export async function listeModeles() {
  const [modeles, emis, usages] = await Promise.all([
    db
      .select({
        id: modelesCertificat.id,
        nom: modelesCertificat.nom,
        couleurTheme: modelesCertificat.couleurTheme,
        canevas: modelesCertificat.canevas,
        parDefaut: modelesCertificat.parDefaut,
        archive: modelesCertificat.archive,
        domaineId: modelesCertificat.domaineId,
        domaine: domaines.nom,
        majLe: modelesCertificat.majLe,
      })
      .from(modelesCertificat)
      .leftJoin(domaines, eq(domaines.id, modelesCertificat.domaineId))
      .orderBy(desc(modelesCertificat.parDefaut), asc(modelesCertificat.nom)),
    db.select({ id: certificats.modeleId, n: count() }).from(certificats).groupBy(certificats.modeleId),
    db
      .select({ id: parcours.modeleCertificatId, n: count() })
      .from(parcours)
      .where(sql`${parcours.modeleCertificatId} is not null`)
      .groupBy(parcours.modeleCertificatId),
  ]);
  const nEmis = new Map(emis.map((e) => [e.id, e.n]));
  const nParcours = new Map(usages.map((u) => [u.id, u.n]));
  return modeles.map((m) => ({ ...m, emis: nEmis.get(m.id) ?? 0, parcours: nParcours.get(m.id) ?? 0 }));
}

export type ModeleListe = Awaited<ReturnType<typeof listeModeles>>[number];

export async function modelePourEditeur(id: string) {
  const [m] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.id, id)).limit(1);
  return m ?? null;
}

/** Domaines, avec le modèle qui leur est déjà associé (un seul modèle actif par domaine). */
export async function domainesPourModeles() {
  const [liste, pris] = await Promise.all([
    db.select({ id: domaines.id, nom: domaines.nom, couleur: domaines.couleur }).from(domaines).orderBy(asc(domaines.ordre), asc(domaines.nom)),
    db
      .select({ domaineId: modelesCertificat.domaineId, id: modelesCertificat.id, nom: modelesCertificat.nom })
      .from(modelesCertificat)
      .where(and(eq(modelesCertificat.archive, false), sql`${modelesCertificat.domaineId} is not null`)),
  ]);
  const parDomaine = new Map(pris.map((p) => [p.domaineId, { id: p.id, nom: p.nom }]));
  return liste.map((d) => ({ ...d, modele: parDomaine.get(d.id) ?? null }));
}

/* ------------------------------------------------------------------ */
/* Certificats émis                                                    */
/* ------------------------------------------------------------------ */

export async function certificatsEmis() {
  const lignes = await db
    .select({
      id: certificats.id,
      numero: certificats.numero,
      jeton: certificats.jeton,
      emisLe: certificats.emisLe,
      revoqueLe: certificats.revoqueLe,
      motifRevocation: certificats.motifRevocation,
      consultations: certificats.consultations,
      donnees: certificats.donnees,
      utilisateurId: certificats.utilisateurId,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      jeId: utilisateurs.jeId,
      jeSigle: juniorEntreprises.sigle,
      jeNom: juniorEntreprises.nom,
      parcoursId: certificats.parcoursId,
      parcoursTitre: parcours.titre,
      modeleId: certificats.modeleId,
    })
    .from(certificats)
    .innerJoin(utilisateurs, eq(utilisateurs.id, certificats.utilisateurId))
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .innerJoin(parcours, eq(parcours.id, certificats.parcoursId))
    .orderBy(desc(certificats.emisLe));
  return lignes.map((l) => ({
    id: l.id,
    numero: l.numero,
    jeton: l.jeton,
    emisLe: l.emisLe,
    revoqueLe: l.revoqueLe,
    motifRevocation: l.motifRevocation,
    consultations: l.consultations,
    membre: `${l.prenom} ${l.nom}`.trim(),
    email: l.email,
    jeId: l.jeId,
    // L'organisation imprimée sur le certificat fait foi ; celle du compte sert au filtre.
    je: l.donnees.je || l.jeNom || "",
    jeSigle: l.jeSigle,
    parcoursId: l.parcoursId,
    parcours: l.donnees.parcours || l.parcoursTitre,
  }));
}

export type CertificatEmis = Awaited<ReturnType<typeof certificatsEmis>>[number];

/** Certificat complet par jeton de vérification (page publique). */
export async function certificatParJeton(jeton: string) {
  const [c] = await db.select().from(certificats).where(eq(certificats.jeton, jeton)).limit(1);
  return c ?? null;
}

/** Compte une consultation de la page publique, sans bloquer le rendu en cas d'échec. */
export async function compterConsultation(id: string): Promise<void> {
  try {
    await db
      .update(certificats)
      .set({ consultations: sql`${certificats.consultations} + 1` })
      .where(eq(certificats.id, id));
  } catch (err) {
    console.error("[certificats] consultation non comptée :", err);
  }
}

export async function certificatParId(id: string) {
  const [c] = await db.select().from(certificats).where(eq(certificats.id, id)).limit(1);
  return c ?? null;
}

export async function mesCertificats(utilisateurId: string) {
  const lignes = await db
    .select({
      id: certificats.id,
      numero: certificats.numero,
      jeton: certificats.jeton,
      emisLe: certificats.emisLe,
      revoqueLe: certificats.revoqueLe,
      motifRevocation: certificats.motifRevocation,
      donnees: certificats.donnees,
      canevas: certificats.canevas,
      couleurTheme: certificats.couleurTheme,
      parcoursSlug: parcours.slug,
      parcoursTitre: parcours.titre,
    })
    .from(certificats)
    .innerJoin(parcours, eq(parcours.id, certificats.parcoursId))
    .where(eq(certificats.utilisateurId, utilisateurId))
    .orderBy(desc(certificats.emisLe));
  return Promise.all(
    lignes.map(async (l) => {
      const lien = lienVerification(l.jeton);
      return { ...l, lien, qr: await qrSvg(lien) };
    })
  );
}
