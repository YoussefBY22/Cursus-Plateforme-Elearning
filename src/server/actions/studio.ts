"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  competences,
  domaines,
  etapesParcours,
  formations,
  formationsCompetences,
  modelesCertificat,
  parcours,
  pointsQuiz,
  questions,
  utilisateurs,
} from "@/db/schema";
import { ErreurMetier, erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { slugifier } from "@/lib/utils";
import { journaliser } from "@/server/journal";
import { idsParRoles, notifier } from "@/server/notifications";
import { lireParametres } from "@/server/parametres";
import { exigerPermission, type Utilisateur } from "@/server/session";
import { estFournisseur, DESCRIPTEURS } from "@/components/video/fournisseurs";
import { MAX_QUESTIONS_FINAL } from "@/services/quiz";
import { manquesFormation, manquesParcours, modifiable, type StatutContenu } from "@/services/studio";
import { circuitPour, modificationRepasseEnValidation, statutApresSoumission } from "@/services/validation";

/*
 * Écritures de l'espace formateur.
 *
 * Deux temps, volontairement séparés :
 *  - « Enregistrer » accepte un contenu incomplet. On construit une formation
 *    en plusieurs séances, et perdre son travail parce qu'une question n'est
 *    pas finie serait absurde.
 *  - « Soumettre » exige que tout soit là (`manquesFormation`) et applique le
 *    circuit de validation (publication directe ou passage en validation).
 *
 * Un contenu en validation est gelé : l'auteur ne peut plus l'écraser pendant
 * qu'un validateur le lit.
 */

const Id = z.string().min(1).max(40);
const texte = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const vide = (v: FormDataEntryValue | null) => {
  const s = texte(v).trim();
  return s.length ? s : null;
};

async function parametresValidation() {
  const p = await lireParametres();
  return { pedagoPeutCreer: p["contenu.pedagoPeutCreer"], pedagoValidationRequise: p["contenu.pedagoValidationRequise"] };
}

/** Le circuit de l'auteur, ou une erreur montrable s'il n'a pas le droit de créer. */
async function exigerCircuit(u: Utilisateur) {
  const circuit = circuitPour(u.roles, await parametresValidation());
  if (circuit === "INTERDIT") {
    throw new ErreurMetier(
      "La création de contenu est réservée aux formateurs. Demandez le rôle à l'équipe pédagogique."
    );
  }
  return circuit;
}

/** Slug unique dérivé du titre (le slug est l'URL publique du contenu). */
async function slugLibre(table: typeof formations | typeof parcours, titre: string, sauf?: string): Promise<string> {
  const base = slugifier(titre).slice(0, 80) || "formation";
  for (let i = 0; i < 50; i++) {
    const essai = i === 0 ? base : `${base}-${i + 1}`;
    const [pris] = await db.select({ id: table.id }).from(table).where(eq(table.slug, essai)).limit(1);
    if (!pris || pris.id === sauf) return essai;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Contenu que l'auteur peut encore écrire. Lève sinon. */
async function exigerMien(
  table: typeof formations | typeof parcours,
  u: Utilisateur,
  id: string
): Promise<{ statut: StatutContenu; titre: string; auteurId: string; publieLe: Date | null }> {
  const [c] = await db
    .select({ statut: table.statut, titre: table.titre, auteurId: table.auteurId, publieLe: table.publieLe })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  if (!c) throw new ErreurMetier("Ce contenu n'existe plus.");
  const sien = c.auteurId === u.id;
  if (!sien && !u.roles.includes("SUPER_ADMIN") && !u.roles.includes("RESP_PEDAGO")) {
    throw new ErreurMetier("Ce contenu n'est pas le vôtre.");
  }
  const statut = c.statut as StatutContenu;
  if (!modifiable(statut)) {
    throw new ErreurMetier(
      statut === "EN_VALIDATION"
        ? "Ce contenu est en cours de validation : il se rouvre une fois la décision rendue."
        : "Ce contenu est archivé. Demandez sa republication à un administrateur."
    );
  }
  return { statut, titre: c.titre, auteurId: c.auteurId, publieLe: c.publieLe };
}

/* ------------------------------------------------------------------ */
/* Formations                                                          */
/* ------------------------------------------------------------------ */

const SchemaCreation = z.object({
  titre: z.string().trim().min(5, "Donnez un titre d'au moins 5 caractères.").max(140, "Titre trop long (140 caractères)."),
  domaineId: Id,
});

/** Crée un brouillon minimal : l'éditeur fait le reste. */
export async function creerFormation(_etat: Resultat<{ id: string }>, formData: FormData): Promise<Resultat<{ id: string }>> {
  try {
    const u = await exigerPermission("studio", "ecrire");
    await exigerCircuit(u);
    const lu = SchemaCreation.safeParse({ titre: texte(formData.get("titre")), domaineId: texte(formData.get("domaineId")) });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };

    const [d] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.id, lu.data.domaineId)).limit(1);
    if (!d) return { erreurs: { domaineId: "Choisissez un domaine." } };

    const [f] = await db
      .insert(formations)
      .values({
        slug: await slugLibre(formations, lu.data.titre),
        titre: lu.data.titre,
        resume: "",
        description: "",
        domaineId: d.id,
        referenceVideo: "",
        dureeSec: 0,
        auteurId: u.id,
        formateurId: u.roles.includes("FORMATEUR") ? u.id : null,
        statut: "BROUILLON",
      })
      .returning({ id: formations.id });

    await journaliser({ acteurId: u.id, action: "FORMATION_CREEE", entite: "formation", entiteId: f.id, details: { titre: lu.data.titre } });
    revalidatePath("/studio");
    return { ok: true, message: "Brouillon créé", donnees: { id: f.id } };
  } catch (err) {
    return { erreur: messageErreur(err, "La formation n'a pas pu être créée.") };
  }
}

const SchemaOption = z.object({
  id: z.string().min(1).max(40),
  texte: z.string().trim().max(300),
  correcte: z.boolean(),
});

const SchemaQuestion = z.object({
  id: z.string().max(40).optional(),
  type: z.enum(["CHOIX_UNIQUE", "CHOIX_MULTIPLE", "VRAI_FAUX"]),
  enonce: z.string().trim().max(500),
  explication: z.string().trim().max(600).nullable().default(null),
  competenceId: z.string().max(40).nullable().default(null),
  options: z.array(SchemaOption).min(2, "Deux réponses au moins.").max(6, "Six réponses au plus."),
});

const SchemaPoint = z.object({
  id: z.string().max(40).optional(),
  type: z.enum(["INTEGRE", "FINAL"]),
  tempsSec: z.number().int().min(0).max(86_400).nullable().default(null),
  titre: z.string().trim().max(140).default(""),
  questions: z.array(SchemaQuestion).max(MAX_QUESTIONS_FINAL),
});

const SchemaFormation = z.object({
  id: Id,
  titre: z.string().trim().min(5, "Donnez un titre d'au moins 5 caractères.").max(140, "Titre trop long (140 caractères)."),
  resume: z.string().trim().max(400, "Résumé trop long (400 caractères)."),
  description: z.string().trim().max(6000, "Description trop longue."),
  objectifs: z.array(z.string().trim().max(200)).max(10, "Dix objectifs au plus."),
  tags: z.array(z.string().trim().max(40)).max(10, "Dix mots-clés au plus."),
  domaineId: Id,
  niveau: z.enum(["DEBUTANT", "INTERMEDIAIRE", "AVANCE"]),
  imageUrl: z.string().trim().max(500).nullable(),
  fournisseurVideo: z.string().refine(estFournisseur, "Fournisseur vidéo inconnu."),
  referenceVideo: z.string().trim().max(500),
  dureeSec: z.coerce.number("Durée invalide.").int().min(0).max(86_400, "Durée trop longue."),
  formateurId: z.string().max(40).nullable(),
  visibleCatalogue: z.boolean(),
  competences: z.array(z.object({ competenceId: Id, poids: z.number().int().min(1).max(3) })).max(12, "Douze compétences au plus."),
  points: z.array(SchemaPoint).max(21),
});

function listeJson(v: FormDataEntryValue | null): unknown {
  const s = texte(v).trim();
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    throw new ErreurMetier("L'éditeur a envoyé des données illisibles. Rechargez la page puis réessayez.");
  }
}

/**
 * Enregistre tout l'éditeur d'un coup : fiche, vidéo, compétences, quiz.
 * Accepte un contenu incomplet (c'est la soumission qui exige le reste),
 * mais refuse ce qui est structurellement faux (vidéo non reconnue, poids
 * hors bornes, compétence inexistante).
 */
export async function enregistrerFormation(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerPermission("studio", "ecrire");
    await exigerCircuit(u);
    const lu = SchemaFormation.safeParse({
      id: texte(formData.get("id")),
      titre: texte(formData.get("titre")),
      resume: texte(formData.get("resume")),
      description: texte(formData.get("description")),
      objectifs: listeJson(formData.get("objectifs")),
      tags: listeJson(formData.get("tags")),
      domaineId: texte(formData.get("domaineId")),
      niveau: texte(formData.get("niveau")),
      imageUrl: vide(formData.get("imageUrl")),
      fournisseurVideo: texte(formData.get("fournisseurVideo")),
      referenceVideo: texte(formData.get("referenceVideo")),
      dureeSec: texte(formData.get("dureeSec")) || "0",
      formateurId: vide(formData.get("formateurId")),
      visibleCatalogue: formData.get("visibleCatalogue") === "on",
      competences: listeJson(formData.get("competences")),
      points: listeJson(formData.get("points")),
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;

    const avant = await exigerMien(formations, u, d.id);

    // La référence vidéo est normalisée par le descripteur du fournisseur :
    // un lien YouTube collé devient un identifiant, et une saisie qui n'est
    // pas une vidéo est refusée tout de suite.
    let reference = "";
    if (d.referenceVideo) {
      const normalisee = DESCRIPTEURS[d.fournisseurVideo as keyof typeof DESCRIPTEURS].normaliser(d.referenceVideo);
      if (!normalisee) {
        return { erreurs: { referenceVideo: DESCRIPTEURS[d.fournisseurVideo as keyof typeof DESCRIPTEURS].aide } };
      }
      reference = normalisee;
    }

    const [dom] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.id, d.domaineId)).limit(1);
    if (!dom) return { erreurs: { domaineId: "Choisissez un domaine." } };

    if (d.formateurId) {
      const [f] = await db
        .select({ id: utilisateurs.id })
        .from(utilisateurs)
        .where(and(eq(utilisateurs.id, d.formateurId), sql`'FORMATEUR' = any(${utilisateurs.roles})`))
        .limit(1);
      if (!f) return { erreurs: { formateurId: "Ce compte n'est pas formateur." } };
    }

    const idsComp = d.competences.map((c) => c.competenceId);
    if (idsComp.length) {
      const trouvees = await db
        .select({ id: competences.id })
        .from(competences)
        .where(and(inArray(competences.id, idsComp), eq(competences.active, true)));
      if (trouvees.length !== new Set(idsComp).size) {
        return { erreurs: { competences: "Une compétence choisie n'existe plus. Rechargez la page." } };
      }
    }

    const finals = d.points.filter((p) => p.type === "FINAL");
    if (finals.length > 1) return { erreurs: { points: "Il ne peut y avoir qu'un seul quiz final." } };

    // Un contenu publié modifié par un auteur soumis à validation y repasse :
    // sinon une modification contournerait le circuit.
    const repasse = modificationRepasseEnValidation(avant.statut, u.roles, await parametresValidation());
    const statut: StatutContenu = repasse ? "EN_VALIDATION" : avant.statut === "REFUSE" ? "BROUILLON" : avant.statut;

    // Le slug suit le titre tant que le contenu n'a jamais été publié ;
    // après publication il est figé (des liens pointent dessus).
    const slug = avant.publieLe ? undefined : await slugLibre(formations, d.titre, d.id);

    await db.transaction(async (tx) => {
      await tx
        .update(formations)
        .set({
          titre: d.titre,
          slug,
          resume: d.resume,
          description: d.description,
          objectifs: d.objectifs.filter((o) => o.length > 0),
          tags: d.tags.filter((t) => t.length > 0),
          domaineId: d.domaineId,
          niveau: d.niveau,
          imageUrl: d.imageUrl,
          fournisseurVideo: d.fournisseurVideo,
          referenceVideo: reference,
          dureeSec: d.dureeSec,
          formateurId: d.formateurId,
          visibleCatalogue: d.visibleCatalogue,
          statut,
          motifRefus: avant.statut === "REFUSE" ? null : undefined,
          soumisLe: repasse ? new Date() : undefined,
          majLe: new Date(),
        })
        .where(eq(formations.id, d.id));

      await tx.delete(formationsCompetences).where(eq(formationsCompetences.formationId, d.id));
      if (d.competences.length) {
        await tx.insert(formationsCompetences).values(
          d.competences.map((c) => ({ formationId: d.id, competenceId: c.competenceId, poids: c.poids }))
        );
      }

      // Les points sont remplacés en bloc : les tentatives déjà passées
      // gardent leur score (elles ne référencent pas la question).
      await tx.delete(pointsQuiz).where(eq(pointsQuiz.formationId, d.id));
      for (const p of d.points) {
        const [cree] = await tx
          .insert(pointsQuiz)
          .values({
            formationId: d.id,
            type: p.type,
            tempsSec: p.type === "FINAL" ? null : (p.tempsSec ?? 0),
            titre: p.titre || (p.type === "FINAL" ? "Quiz final" : "Point d'étape"),
          })
          .returning({ id: pointsQuiz.id });
        if (p.questions.length) {
          await tx.insert(questions).values(
            p.questions.map((q, i) => ({
              pointQuizId: cree.id,
              type: q.type,
              enonce: q.enonce,
              options: q.options.map((o) => ({ id: o.id, texte: o.texte, correcte: o.correcte })),
              explication: q.explication,
              competenceId: q.competenceId,
              ordre: i,
            }))
          );
        }
      }
    });

    await journaliser({
      acteurId: u.id,
      action: "FORMATION_ENREGISTREE",
      entite: "formation",
      entiteId: d.id,
      details: { titre: d.titre, statut, points: d.points.length, competences: d.competences.length },
    });

    if (repasse) await previnirValidateurs(u, "formation", d.id, d.titre);

    revalidatePath("/studio");
    revalidatePath(`/studio/formations/${d.id}`);
    revalidatePath("/catalogue");
    return {
      ok: true,
      message: repasse ? "Modifications envoyées en validation" : "Formation enregistrée",
    };
  } catch (err) {
    return { erreur: messageErreur(err, "La formation n'a pas pu être enregistrée.") };
  }
}

/** Prévient ceux qui peuvent statuer (hors l'auteur lui-même). */
async function previnirValidateurs(u: Utilisateur, type: "formation" | "parcours", id: string, titre: string) {
  const destinataires = (await idsParRoles(["SUPER_ADMIN", "RESP_PEDAGO"])).filter((x) => x !== u.id);
  await notifier(destinataires, {
    type: "VALIDATION_DEMANDEE",
    titre: type === "formation" ? "Une formation attend votre validation" : "Un parcours attend votre validation",
    message: u.name ? `« ${titre} » a été soumis par ${u.name}` : `« ${titre} » attend une décision`,
    lien: "/admin/contenus",
    cle: `validation:${type}:${id}:${Date.now().toString(36)}`,
  });
}

/** Soumet la formation : refuse tant qu'il manque quelque chose. */
export async function soumettreFormation(id: string): Promise<Resultat<{ manques: string[] }>> {
  try {
    const u = await exigerPermission("studio", "ecrire");
    const circuit = await exigerCircuit(u);
    const idLu = Id.safeParse(id);
    if (!idLu.success) return { erreur: "Requête invalide." };
    const avant = await exigerMien(formations, u, idLu.data);

    const [f] = await db.select().from(formations).where(eq(formations.id, idLu.data)).limit(1);
    if (!f) return { erreur: "Ce contenu n'existe plus." };

    const [liens, points] = await Promise.all([
      db.select({ competenceId: formationsCompetences.competenceId }).from(formationsCompetences).where(eq(formationsCompetences.formationId, f.id)),
      db.select().from(pointsQuiz).where(eq(pointsQuiz.formationId, f.id)).orderBy(asc(pointsQuiz.tempsSec)),
    ]);
    const qs = points.length
      ? await db.select().from(questions).where(inArray(questions.pointQuizId, points.map((p) => p.id)))
      : [];

    const manques = manquesFormation({
      titre: f.titre,
      resume: f.resume,
      description: f.description,
      objectifs: f.objectifs,
      referenceVideo: f.referenceVideo,
      dureeSec: f.dureeSec,
      competences: liens.map((l) => ({ id: l.competenceId })),
      points: points.map((p) => ({
        type: p.type as "INTEGRE" | "FINAL",
        tempsSec: p.tempsSec,
        questions: qs
          .filter((q) => q.pointQuizId === p.id)
          .map((q) => ({ enonce: q.enonce, type: q.type as "CHOIX_UNIQUE" | "CHOIX_MULTIPLE" | "VRAI_FAUX", options: q.options })),
      })),
    });
    if (manques.length) {
      return { erreur: "Il reste des points à compléter avant de publier.", donnees: { manques } };
    }

    const statut = statutApresSoumission(circuit);
    await db
      .update(formations)
      .set({
        statut,
        soumisLe: new Date(),
        motifRefus: null,
        publieLe: statut === "PUBLIE" ? (f.publieLe ?? new Date()) : f.publieLe,
        valideParId: statut === "PUBLIE" ? u.id : null,
        majLe: new Date(),
      })
      .where(eq(formations.id, f.id));

    await journaliser({
      acteurId: u.id,
      action: statut === "PUBLIE" ? "FORMATION_PUBLIEE" : "FORMATION_SOUMISE",
      entite: "formation",
      entiteId: f.id,
      details: { titre: f.titre, statutAvant: avant.statut },
    });
    if (statut === "EN_VALIDATION") await previnirValidateurs(u, "formation", f.id, f.titre);

    revalidatePath("/studio");
    revalidatePath(`/studio/formations/${f.id}`);
    revalidatePath("/catalogue");
    revalidatePath("/admin/contenus");
    return {
      ok: true,
      message: statut === "PUBLIE" ? "Formation publiée" : "Formation envoyée en validation",
      donnees: { manques: [] },
    };
  } catch (err) {
    return { erreur: messageErreur(err, "La formation n'a pas pu être soumise.") };
  }
}

/* ------------------------------------------------------------------ */
/* Parcours                                                            */
/* ------------------------------------------------------------------ */

export async function creerParcours(_etat: Resultat<{ id: string }>, formData: FormData): Promise<Resultat<{ id: string }>> {
  try {
    const u = await exigerPermission("studio", "ecrire");
    await exigerCircuit(u);
    const lu = SchemaCreation.safeParse({ titre: texte(formData.get("titre")), domaineId: texte(formData.get("domaineId")) });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };

    const [d] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.id, lu.data.domaineId)).limit(1);
    if (!d) return { erreurs: { domaineId: "Choisissez un domaine." } };

    const [p] = await db
      .insert(parcours)
      .values({
        slug: await slugLibre(parcours, lu.data.titre),
        titre: lu.data.titre,
        description: "",
        domaineId: d.id,
        auteurId: u.id,
        statut: "BROUILLON",
      })
      .returning({ id: parcours.id });

    await journaliser({ acteurId: u.id, action: "PARCOURS_CREE", entite: "parcours", entiteId: p.id, details: { titre: lu.data.titre } });
    revalidatePath("/studio");
    return { ok: true, message: "Brouillon créé", donnees: { id: p.id } };
  } catch (err) {
    return { erreur: messageErreur(err, "Le parcours n'a pas pu être créé.") };
  }
}

const SchemaParcours = z.object({
  id: Id,
  titre: z.string().trim().min(5, "Donnez un titre d'au moins 5 caractères.").max(140, "Titre trop long (140 caractères)."),
  sousTitre: z.string().trim().max(200).nullable(),
  description: z.string().trim().max(6000, "Description trop longue."),
  imageUrl: z.string().trim().max(500).nullable(),
  domaineId: Id,
  modeleCertificatId: z.string().max(40).nullable(),
  intituleCertificat: z.string().trim().max(300).nullable(),
  etapes: z.array(z.object({ formationId: Id, titre: z.string().trim().max(140).nullable().default(null) })).max(30, "Trente étapes au plus."),
});

export async function enregistrerParcours(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerPermission("studio", "ecrire");
    await exigerCircuit(u);
    const lu = SchemaParcours.safeParse({
      id: texte(formData.get("id")),
      titre: texte(formData.get("titre")),
      sousTitre: vide(formData.get("sousTitre")),
      description: texte(formData.get("description")),
      imageUrl: vide(formData.get("imageUrl")),
      domaineId: texte(formData.get("domaineId")),
      modeleCertificatId: vide(formData.get("modeleCertificatId")),
      intituleCertificat: vide(formData.get("intituleCertificat")),
      etapes: listeJson(formData.get("etapes")),
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;

    const avant = await exigerMien(parcours, u, d.id);

    const [dom] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.id, d.domaineId)).limit(1);
    if (!dom) return { erreurs: { domaineId: "Choisissez un domaine." } };

    if (d.modeleCertificatId) {
      const [m] = await db
        .select({ id: modelesCertificat.id })
        .from(modelesCertificat)
        .where(and(eq(modelesCertificat.id, d.modeleCertificatId), eq(modelesCertificat.archive, false)))
        .limit(1);
      if (!m) return { erreurs: { modeleCertificatId: "Ce modèle de certificat n'est plus disponible." } };
    }

    const ids = d.etapes.map((e) => e.formationId);
    if (new Set(ids).size !== ids.length) {
      return { erreurs: { etapes: "Une formation apparaît deux fois dans le parcours." } };
    }
    if (ids.length) {
      const trouvees = await db.select({ id: formations.id }).from(formations).where(inArray(formations.id, ids));
      if (trouvees.length !== ids.length) return { erreurs: { etapes: "Une formation choisie n'existe plus. Rechargez la page." } };
    }

    const repasse = modificationRepasseEnValidation(avant.statut, u.roles, await parametresValidation());
    const statut: StatutContenu = repasse ? "EN_VALIDATION" : avant.statut === "REFUSE" ? "BROUILLON" : avant.statut;

    const slug = avant.publieLe ? undefined : await slugLibre(parcours, d.titre, d.id);

    await db.transaction(async (tx) => {
      await tx
        .update(parcours)
        .set({
          titre: d.titre,
          slug,
          sousTitre: d.sousTitre,
          description: d.description,
          imageUrl: d.imageUrl,
          domaineId: d.domaineId,
          modeleCertificatId: d.modeleCertificatId,
          intituleCertificat: d.intituleCertificat,
          statut,
          motifRefus: avant.statut === "REFUSE" ? null : undefined,
          soumisLe: repasse ? new Date() : undefined,
          majLe: new Date(),
        })
        .where(eq(parcours.id, d.id));

      await tx.delete(etapesParcours).where(eq(etapesParcours.parcoursId, d.id));
      if (d.etapes.length) {
        await tx.insert(etapesParcours).values(
          d.etapes.map((e, i) => ({ parcoursId: d.id, formationId: e.formationId, ordre: i + 1, titre: e.titre }))
        );
      }
    });

    await journaliser({
      acteurId: u.id,
      action: "PARCOURS_ENREGISTRE",
      entite: "parcours",
      entiteId: d.id,
      details: { titre: d.titre, statut, etapes: d.etapes.length },
    });
    if (repasse) await previnirValidateurs(u, "parcours", d.id, d.titre);

    revalidatePath("/studio");
    revalidatePath(`/studio/parcours/${d.id}`);
    revalidatePath("/parcours");
    return { ok: true, message: repasse ? "Modifications envoyées en validation" : "Parcours enregistré" };
  } catch (err) {
    return { erreur: messageErreur(err, "Le parcours n'a pas pu être enregistré.") };
  }
}

export async function soumettreParcours(id: string): Promise<Resultat<{ manques: string[] }>> {
  try {
    const u = await exigerPermission("studio", "ecrire");
    const circuit = await exigerCircuit(u);
    const idLu = Id.safeParse(id);
    if (!idLu.success) return { erreur: "Requête invalide." };
    const avant = await exigerMien(parcours, u, idLu.data);

    const [p] = await db.select().from(parcours).where(eq(parcours.id, idLu.data)).limit(1);
    if (!p) return { erreur: "Ce contenu n'existe plus." };

    const etapes = await db
      .select({ statut: formations.statut })
      .from(etapesParcours)
      .innerJoin(formations, eq(formations.id, etapesParcours.formationId))
      .where(eq(etapesParcours.parcoursId, p.id))
      .orderBy(asc(etapesParcours.ordre));

    const manques = manquesParcours({
      titre: p.titre,
      description: p.description,
      etapes: etapes.map((e) => ({ formationStatut: e.statut as StatutContenu })),
    });
    if (manques.length) return { erreur: "Il reste des points à compléter avant de publier.", donnees: { manques } };

    const statut = statutApresSoumission(circuit);
    await db
      .update(parcours)
      .set({
        statut,
        soumisLe: new Date(),
        motifRefus: null,
        publieLe: statut === "PUBLIE" ? (p.publieLe ?? new Date()) : p.publieLe,
        valideParId: statut === "PUBLIE" ? u.id : null,
        majLe: new Date(),
      })
      .where(eq(parcours.id, p.id));

    await journaliser({
      acteurId: u.id,
      action: statut === "PUBLIE" ? "PARCOURS_PUBLIE" : "PARCOURS_SOUMIS",
      entite: "parcours",
      entiteId: p.id,
      details: { titre: p.titre, statutAvant: avant.statut },
    });
    if (statut === "EN_VALIDATION") await previnirValidateurs(u, "parcours", p.id, p.titre);

    revalidatePath("/studio");
    revalidatePath(`/studio/parcours/${p.id}`);
    revalidatePath("/parcours");
    revalidatePath("/admin/contenus");
    return {
      ok: true,
      message: statut === "PUBLIE" ? "Parcours publié" : "Parcours envoyé en validation",
      donnees: { manques: [] },
    };
  } catch (err) {
    return { erreur: messageErreur(err, "Le parcours n'a pas pu être soumis.") };
  }
}
