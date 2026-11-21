import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  certificats,
  domaines,
  etapesParcours,
  formations,
  juniorEntreprises,
  modelesCertificat,
  parcours,
  utilisateurs,
  type DonneesCertificat,
} from "@/db/schema";
import { jetonAleatoire } from "@/lib/ids";
import { formaterDuree } from "@/services/visionnage";
import { cadreCommun, canevasParDefaut, intituleParDefaut } from "@/services/certificats/cadre";
import { imagesRequises, rendreCanevas, type ImagesDisponibles } from "@/services/canevas/rendu-canevas";
import type { Canevas } from "@/services/canevas/canevas";
import { remplirJetons } from "@/services/canevas/canevas";
import { urlApp } from "@/server/email";
import { lireFichier } from "@/server/stockage";
import { lireParametres } from "@/server/parametres";
import { notifier } from "@/server/notifications";
import { journaliser } from "@/server/journal";
import { verifierBadgesSansErreur } from "@/server/moteur/gamification";

/** Modèle à appliquer : celui du parcours, sinon celui du domaine, sinon le défaut. */
async function modelePour(parcoursId: string) {
  const [p] = await db.select().from(parcours).where(eq(parcours.id, parcoursId)).limit(1);
  if (!p) throw new Error("Parcours introuvable.");
  if (p.modeleCertificatId) {
    const [m] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.id, p.modeleCertificatId)).limit(1);
    if (m) return { p, m };
  }
  const [parDomaine] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.domaineId, p.domaineId)).limit(1);
  if (parDomaine) return { p, m: parDomaine };
  const [defaut] = await db.select().from(modelesCertificat).where(eq(modelesCertificat.parDefaut, true)).limit(1);
  if (defaut) return { p, m: defaut };
  const [cree] = await db
    .insert(modelesCertificat)
    .values({ nom: "Modèle Plateforme", canevas: canevasParDefaut(), parDefaut: true })
    .returning();
  return { p, m: cree };
}

/**
 * Émet le certificat d'un parcours terminé. Idempotent : un membre n'a
 * qu'un certificat par parcours. Le contenu est figé à l'émission
 * (instantané des données ET du canevas) : modifier le modèle ensuite ne
 * réécrit pas les certificats déjà délivrés.
 */
export async function emettreCertificat(utilisateurId: string, parcoursId: string) {
  const [existant] = await db
    .select()
    .from(certificats)
    .where(and(eq(certificats.utilisateurId, utilisateurId), eq(certificats.parcoursId, parcoursId)))
    .limit(1);
  if (existant) return existant;

  const { p, m } = await modelePour(parcoursId);
  const [u] = await db.select().from(utilisateurs).where(eq(utilisateurs.id, utilisateurId)).limit(1);
  if (!u) throw new Error("Membre introuvable.");
  const [je] = u.jeId
    ? await db.select({ nom: juniorEntreprises.nom }).from(juniorEntreprises).where(eq(juniorEntreprises.id, u.jeId)).limit(1)
    : [];
  const [dom] = await db.select({ nom: domaines.nom }).from(domaines).where(eq(domaines.id, p.domaineId)).limit(1);
  const etapes = await db
    .select({ duree: formations.dureeSec })
    .from(etapesParcours)
    .innerJoin(formations, eq(formations.id, etapesParcours.formationId))
    .where(eq(etapesParcours.parcoursId, parcoursId));
  const totalSec = etapes.reduce((s, e) => s + e.duree, 0);
  const params = await lireParametres();
  const [s1, s2] = params["certificat.signataires"];

  const annee = new Date().getFullYear();
  const [{ n }] = await db.select({ n: count() }).from(certificats);
  const apprenant = `${u.prenom} ${u.nom}`;
  const base = {
    apprenant,
    parcours: p.titre,
    domaine: dom?.nom ?? "",
    je: je?.nom ?? "Membre de la plateforme",
    dateObtention: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    heures: formaterDuree(totalSec),
  };

  // Le numéro est séquentiel et lisible ; la collision (deux émissions
  // simultanées) se règle en réessayant avec le suivant.
  for (let essai = 0; essai < 5; essai++) {
    const numero = `CUR-${annee}-${String(n + 1 + essai).padStart(6, "0")}`;
    const donnees: DonneesCertificat & Record<string, string> = {
      ...base,
      numero,
      intitule: remplirJetons(p.intituleCertificat || intituleParDefaut(), { ...base, numero }),
      signataire1: s1?.nom ?? "",
      signataire1Titre: s1?.titre ?? "",
      signataire2: s2?.nom ?? "",
      signataire2Titre: s2?.titre ?? "",
    };
    try {
      const [cert] = await db
        .insert(certificats)
        .values({
          numero,
          jeton: jetonAleatoire(32),
          utilisateurId,
          parcoursId,
          modeleId: m.id,
          donnees,
          canevas: m.canevas,
          couleurTheme: m.couleurTheme,
        })
        .returning();
      await notifier([utilisateurId], {
        type: "CERTIFICAT",
        titre: "Certificat obtenu",
        message: `Félicitations ! Votre certificat « ${p.titre} » est prêt à être téléchargé et partagé.`,
        lien: "/certificats",
        email: true,
        cle: `certificat:${cert.id}`,
      });
      await journaliser({ acteurId: utilisateurId, action: "EMISSION", entite: "certificat", entiteId: cert.id, details: { numero } });
      await verifierBadgesSansErreur(utilisateurId);
      return cert;
    } catch (err) {
      const message = String((err as Error)?.message ?? "");
      const dejaEmis = await db
        .select()
        .from(certificats)
        .where(and(eq(certificats.utilisateurId, utilisateurId), eq(certificats.parcoursId, parcoursId)))
        .limit(1);
      if (dejaEmis[0]) return dejaEmis[0];
      if (!message.includes("certificat_numero_unique") && !message.includes("duplicate")) throw err;
    }
  }
  throw new Error("Impossible d'attribuer un numéro de certificat.");
}

/** Images (logos, signatures) d'un canevas, lues dans le stockage. */
export async function chargerImages(canevas: Canevas): Promise<ImagesDisponibles> {
  const images: ImagesDisponibles = new Map();
  for (const { id } of imagesRequises(canevas)) {
    const f = await lireFichier(id);
    if (!f) continue;
    if (f.type === "image/png") images.set(id, { octets: new Uint8Array(f.octets), type: "png" });
    else if (f.type === "image/jpeg") images.set(id, { octets: new Uint8Array(f.octets), type: "jpeg" });
  }
  return images;
}

export function lienVerification(jeton: string): string {
  return urlApp(`/v/${jeton}`);
}

/** PDF d'un certificat émis (ou d'un aperçu de modèle si `jeton` est nul). */
export async function pdfCertificat(options: {
  canevas: Canevas;
  couleurTheme: string;
  donnees: Record<string, unknown>;
  jeton: string | null;
  filigrane?: string;
}): Promise<Uint8Array> {
  return rendreCanevas(options.canevas, {
    fond: cadreCommun(options.couleurTheme),
    donnees: { ...options.donnees, lienVerification: options.jeton ? lienVerification(options.jeton) : "" },
    images: await chargerImages(options.canevas),
    filigrane: options.filigrane,
    titre: `Certificat ${String(options.donnees.numero ?? "")}`.trim(),
  });
}

export async function revoquerCertificat(id: string, acteurId: string, motif: string) {
  const [c] = await db
    .update(certificats)
    .set({ revoqueLe: new Date(), motifRevocation: motif, revoqueParId: acteurId })
    .where(and(eq(certificats.id, id), isNull(certificats.revoqueLe)))
    .returning();
  if (c) {
    await journaliser({ acteurId, action: "REVOCATION", entite: "certificat", entiteId: id, details: { motif } });
    await notifier([c.utilisateurId], {
      type: "CERTIFICAT",
      titre: "Certificat révoqué",
      message: `Votre certificat ${c.numero} a été révoqué. Motif : ${motif}`,
      lien: "/certificats",
      email: true,
      cle: `revocation:${id}`,
    });
  }
  return c;
}

export async function retablirCertificat(id: string, acteurId: string) {
  await db.update(certificats).set({ revoqueLe: null, motifRevocation: null, revoqueParId: null }).where(eq(certificats.id, id));
  await journaliser({ acteurId, action: "RETABLISSEMENT", entite: "certificat", entiteId: id });
}

/** Nouveau jeton : l'ancien QR code cesse immédiatement de fonctionner. */
export async function regenererJeton(id: string, acteurId: string) {
  await db.update(certificats).set({ jeton: jetonAleatoire(32) }).where(eq(certificats.id, id));
  await journaliser({ acteurId, action: "REGENERATION_JETON", entite: "certificat", entiteId: id });
}

export async function idsParcoursContenant(formationId: string): Promise<string[]> {
  const lignes = await db
    .select({ id: etapesParcours.parcoursId })
    .from(etapesParcours)
    .innerJoin(parcours, eq(parcours.id, etapesParcours.parcoursId))
    .where(and(eq(etapesParcours.formationId, formationId), inArray(parcours.statut, ["PUBLIE"])));
  return [...new Set(lignes.map((l) => l.id))];
}
