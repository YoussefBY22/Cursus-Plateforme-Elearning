"use server";

import { and, eq, inArray, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  competences,
  domaines,
  formationsExternes,
  formationsExternesCompetences,
  participationsExternes,
  utilisateurs,
} from "@/db/schema";
import { ErreurMetier, erreursZod, messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { calculerFormationExterne, referentielEffectif } from "@/server/moteur/competences";
import { notifier } from "@/server/notifications";
import { cleDemandeAutoEval, detailFormationExterne, resoudreJe, type JeRh } from "@/server/requetes/rh";
import { exigerPermission } from "@/server/session";
import { codeCompetenceJe, nettoyerEvaluations } from "@/services/rh";

/*
 * Actions de l'espace RH. Chacune : permission « rh:ecrire », puis Zod, puis
 * vérification que l'objet appartient à l'organisation du responsable (un super admin
 * peut agir sur l'organisation qu'il consulte, transmise dans le champ `je`).
 */

const Id = z.string().min(1).max(40);

const vide = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

async function contexte(formData: FormData): Promise<{ acteurId: string; je: JeRh }> {
  const u = await exigerPermission("rh", "ecrire");
  const demande = vide(formData.get("je"));
  const je = await resoudreJe(u, demande);
  if (!je) throw new ErreurMetier("Rattachez d'abord votre compte à une organisation.");
  return { acteurId: u.id, je };
}

function rafraichir(formationExterneId?: string) {
  revalidatePath("/mon-organisation");
  if (formationExterneId) revalidatePath(`/mon-organisation/formations-externes/${formationExterneId}`);
}

/* ------------------------------------------------------------------ */
/* Rattachements                                                       */
/* ------------------------------------------------------------------ */

const SchemaRattachement = z.object({ membreId: Id, decision: z.enum(["accepter", "refuser"]) });

export async function deciderRattachement(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaRattachement.safeParse({ membreId: formData.get("membreId"), decision: formData.get("decision") });
    if (!lu.success) return { erreur: "Requête invalide." };
    const { membreId, decision } = lu.data;
    const accepte = decision === "accepter";

    const [maj] = await db
      .update(utilisateurs)
      .set(accepte ? { rattachement: "VALIDE" } : { rattachement: "REFUSE", jeId: null })
      .where(and(eq(utilisateurs.id, membreId), eq(utilisateurs.jeId, je.id), eq(utilisateurs.rattachement, "EN_ATTENTE")))
      .returning({ id: utilisateurs.id, prenom: utilisateurs.prenom, nom: utilisateurs.nom });
    if (!maj) return { erreur: "Cette demande a déjà été traitée ou ne concerne pas votre organisation." };

    await notifier([membreId], {
      type: "RATTACHEMENT",
      titre: accepte ? `Bienvenue chez ${je.sigle ?? je.nom}` : "Rattachement refusé",
      message: accepte
        ? `${je.nom} a confirmé votre rattachement. Vous apparaissez désormais parmi ses membres.`
        : `${je.nom} n'a pas confirmé votre rattachement. Vérifiez votre organisation dans votre profil ou contactez son responsable RH.`,
      lien: accepte ? "/accueil" : "/profil",
      email: true,
    });
    await journaliser({
      acteurId,
      action: accepte ? "RATTACHEMENT_ACCEPTE" : "RATTACHEMENT_REFUSE",
      entite: "utilisateur",
      entiteId: membreId,
      details: { jeId: je.id },
    });
    rafraichir();
    return { ok: true, message: accepte ? `Rattachement de ${maj.prenom} accepté` : `Rattachement de ${maj.prenom} refusé` };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Référentiel adapté                                                  */
/* ------------------------------------------------------------------ */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Copie les compétences communes actives du domaine dans l'organisation (même
 * code, `sourceId` vers l'original). Une copie qui existe déjà (domaine
 * adapté puis rendu à la plateforme) est réactivée, pas dupliquée.
 */
async function copierDomaine(tx: Tx, domaineId: string, jeId: string, seulement?: string): Promise<number> {
  const confed = await tx
    .select()
    .from(competences)
    .where(and(eq(competences.domaineId, domaineId), isNull(competences.jeId), eq(competences.active, true)))
    .orderBy(competences.ordre);
  const existantes = await tx.select().from(competences).where(eq(competences.jeId, jeId));
  let n = 0;
  for (const c of confed) {
    if (seulement && c.id !== seulement) continue;
    const deja = existantes.find((e) => e.sourceId === c.id) ?? existantes.find((e) => e.code === c.code);
    if (deja) {
      if (!deja.active) {
        await tx.update(competences).set({ active: true }).where(eq(competences.id, deja.id));
        n++;
      }
      continue;
    }
    await tx.insert(competences).values({
      code: c.code,
      nom: c.nom,
      description: c.description,
      question: c.question,
      pistes: c.pistes,
      domaineId,
      jeId,
      sourceId: c.id,
      ordre: c.ordre,
      active: true,
    });
    n++;
  }
  return n;
}

const SchemaDomaine = z.object({ domaineId: Id });

export async function adapterDomaine(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaDomaine.safeParse({ domaineId: formData.get("domaineId") });
    if (!lu.success) return { erreur: "Requête invalide." };
    const [d] = await db.select({ id: domaines.id, nom: domaines.nom }).from(domaines).where(eq(domaines.id, lu.data.domaineId)).limit(1);
    if (!d) return { erreur: "Ce domaine n'existe plus." };
    const n = await db.transaction((tx) => copierDomaine(tx, d.id, je.id));
    if (n === 0) return { erreur: "Aucune compétence de la plateforme à reprendre dans ce domaine." };
    await journaliser({ acteurId, action: "REFERENTIEL_ADAPTE", entite: "domaine", entiteId: d.id, details: { jeId: je.id, competences: n } });
    rafraichir();
    return { ok: true, message: `Domaine « ${d.nom} » adapté pour votre organisation` };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaReprise = z.object({ competenceId: Id });

/** Reprend dans la version de l'organisation une compétence commune ajoutée après l'adaptation. */
export async function reprendreCompetence(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaReprise.safeParse({ competenceId: formData.get("competenceId") });
    if (!lu.success) return { erreur: "Requête invalide." };
    const [c] = await db
      .select({ id: competences.id, domaineId: competences.domaineId, nom: competences.nom })
      .from(competences)
      .where(and(eq(competences.id, lu.data.competenceId), isNull(competences.jeId), eq(competences.active, true)))
      .limit(1);
    if (!c) return { erreur: "Cette compétence de la plateforme n'existe plus." };
    const n = await db.transaction((tx) => copierDomaine(tx, c.domaineId, je.id, c.id));
    if (n === 0) return { erreur: "Cette compétence figure déjà dans votre référentiel." };
    await journaliser({ acteurId, action: "COMPETENCE_REPRISE", entite: "competence", entiteId: c.id, details: { jeId: je.id } });
    rafraichir();
    return { ok: true, message: `Compétence « ${c.nom} » reprise` };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaCompetenceJe = z.object({
  id: Id.nullable(),
  domaineId: Id.nullable(),
  nom: z.string().trim().min(3, "Nom trop court (3 caractères au moins).").max(120, "Nom trop long (120 caractères)."),
  description: z.string().max(500, "Description trop longue (500 caractères).").nullable(),
  question: z.string().max(240, "Question trop longue (240 caractères).").nullable(),
  pistes: z.string().max(1500, "Pistes trop longues (1 500 caractères).").nullable(),
});

/** Modifie une compétence de l'organisation, ou en ajoute une propre à l'organisation (sans source). */
export async function enregistrerCompetenceJe(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaCompetenceJe.safeParse({
      id: vide(formData.get("id")),
      domaineId: vide(formData.get("domaineId")),
      nom: formData.get("nom") ?? "",
      description: vide(formData.get("description")),
      question: vide(formData.get("question")),
      pistes: vide(formData.get("pistes")),
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;
    const valeurs = { nom: d.nom, description: d.description, question: d.question, pistes: d.pistes };

    if (d.id) {
      const [maj] = await db
        .update(competences)
        .set(valeurs)
        .where(and(eq(competences.id, d.id), eq(competences.jeId, je.id)))
        .returning({ id: competences.id });
      if (!maj) return { erreur: "Cette compétence n'appartient pas au référentiel de votre organisation." };
      await journaliser({ acteurId, action: "COMPETENCE_JE_MODIFIEE", entite: "competence", entiteId: d.id, details: { jeId: je.id, ...valeurs } });
      rafraichir();
      return { ok: true, message: "Compétence enregistrée" };
    }

    if (!d.domaineId) return { erreur: "Domaine manquant." };
    const [domaine] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.id, d.domaineId)).limit(1);
    if (!domaine) return { erreur: "Ce domaine n'existe plus." };

    const resultat = await db.transaction(async (tx) => {
      // Une compétence propre dans un domaine non adapté remplacerait tout le
      // référentiel commun : on adapte d'abord le domaine.
      const [active] = await tx
        .select({ id: competences.id })
        .from(competences)
        .where(and(eq(competences.domaineId, domaine.id), eq(competences.jeId, je.id), eq(competences.active, true)))
        .limit(1);
      const adapte = active ? 0 : await copierDomaine(tx, domaine.id, je.id);
      const codes = await tx.select({ code: competences.code }).from(competences).where(eq(competences.jeId, je.id));
      const code = codeCompetenceJe(je.sigle ?? je.slug, d.nom, codes.map((c) => c.code));
      const [ordre] = await tx
        .select({ m: max(competences.ordre) })
        .from(competences)
        .where(and(eq(competences.domaineId, domaine.id), eq(competences.jeId, je.id)));
      const [cree] = await tx
        .insert(competences)
        .values({ ...valeurs, code, domaineId: domaine.id, jeId: je.id, sourceId: null, ordre: (ordre?.m ?? 0) + 1 })
        .returning({ id: competences.id });
      return { id: cree.id, code, adapte };
    });
    await journaliser({
      acteurId,
      action: "COMPETENCE_JE_CREEE",
      entite: "competence",
      entiteId: resultat.id,
      details: { jeId: je.id, code: resultat.code, domaineAdapte: resultat.adapte > 0, ...valeurs },
    });
    rafraichir();
    return {
      ok: true,
      message: resultat.adapte > 0 ? "Compétence ajoutée — le domaine est maintenant adapté pour votre organisation" : "Compétence ajoutée",
    };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}

const SchemaActivation = z.object({ id: Id, active: z.enum(["true", "false"]) });

export async function changerActivationCompetenceJe(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaActivation.safeParse({ id: formData.get("id"), active: formData.get("active") });
    if (!lu.success) return { erreur: "Requête invalide." };
    const active = lu.data.active === "true";
    const [maj] = await db
      .update(competences)
      .set({ active })
      .where(and(eq(competences.id, lu.data.id), eq(competences.jeId, je.id)))
      .returning({ id: competences.id, nom: competences.nom });
    if (!maj) return { erreur: "Cette compétence n'appartient pas au référentiel de votre organisation." };
    await journaliser({
      acteurId,
      action: active ? "COMPETENCE_JE_REACTIVEE" : "COMPETENCE_JE_DESACTIVEE",
      entite: "competence",
      entiteId: maj.id,
      details: { jeId: je.id },
    });
    rafraichir();
    return { ok: true, message: active ? "Compétence réactivée" : "Compétence désactivée" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/** Désactive toutes les compétences propres à l'organisation dans le domaine : le référentiel commun redevient la norme. */
export async function revenirReferentielCommun(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaDomaine.safeParse({ domaineId: formData.get("domaineId") });
    if (!lu.success) return { erreur: "Requête invalide." };
    const maj = await db
      .update(competences)
      .set({ active: false })
      .where(and(eq(competences.domaineId, lu.data.domaineId), eq(competences.jeId, je.id), eq(competences.active, true)))
      .returning({ id: competences.id });
    if (!maj.length) return { erreur: "Ce domaine suit déjà le référentiel commun." };
    await journaliser({
      acteurId,
      action: "REFERENTIEL_COMMUN_RETABLI",
      entite: "domaine",
      entiteId: lu.data.domaineId,
      details: { jeId: je.id, desactivees: maj.length },
    });
    rafraichir();
    return { ok: true, message: "Référentiel commun rétabli" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Formations externes                                                 */
/* ------------------------------------------------------------------ */

const SchemaFormationExterne = z.object({
  titre: z.string().trim().min(5, "Titre trop court (5 caractères au moins).").max(160, "Titre trop long (160 caractères)."),
  description: z.string().max(2000, "Description trop longue (2 000 caractères).").nullable(),
  domaineId: z.string().min(1, "Choisissez un domaine.").max(40),
  formateurInterne: z.string().trim().min(3, "Indiquez le formateur interne.").max(120, "Nom trop long (120 caractères)."),
  date: z.iso.date("Date invalide."),
  dureeHeures: z.coerce
    .number("Durée invalide.")
    .min(0.5, "Durée minimale : 30 minutes.")
    .max(200, "Durée maximale : 200 heures."),
  competences: z.array(Id).min(1, "Cochez au moins une compétence visée.").max(40),
  participants: z.array(Id).min(1, "Cochez au moins un participant.").max(300),
});

export async function creerFormationExterne(_etat: Resultat<{ id: string }>, formData: FormData): Promise<Resultat<{ id: string }>> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaFormationExterne.safeParse({
      titre: formData.get("titre") ?? "",
      description: vide(formData.get("description")),
      domaineId: formData.get("domaineId") ?? "",
      formateurInterne: formData.get("formateurInterne") ?? "",
      date: formData.get("date") ?? "",
      dureeHeures: formData.get("dureeHeures") ?? "",
      competences: [...new Set(formData.getAll("competences").map(String))],
      participants: [...new Set(formData.getAll("participants").map(String))],
    });
    if (!lu.success) return { erreurs: erreursZod(lu.error.issues) };
    const d = lu.data;

    const referentiel = await referentielEffectif(d.domaineId, je.id);
    if (!referentiel.length) return { erreurs: { domaineId: "Ce domaine n'a aucune compétence active." } };
    const autorisees = new Set(referentiel.map((c) => c.id));
    if (d.competences.some((c) => !autorisees.has(c))) {
      return { erreurs: { competences: "Une compétence cochée ne fait pas partie du référentiel de votre organisation pour ce domaine." } };
    }
    const membres = await db
      .select({ id: utilisateurs.id })
      .from(utilisateurs)
      .where(and(inArray(utilisateurs.id, d.participants), eq(utilisateurs.jeId, je.id), eq(utilisateurs.rattachement, "VALIDE")));
    if (membres.length !== d.participants.length) {
      return { erreurs: { participants: "Un participant coché n'est pas (ou plus) membre validé de votre organisation." } };
    }

    const id = await db.transaction(async (tx) => {
      const [fe] = await tx
        .insert(formationsExternes)
        .values({
          jeId: je.id,
          domaineId: d.domaineId,
          titre: d.titre,
          description: d.description,
          formateurInterne: d.formateurInterne,
          date: new Date(`${d.date}T12:00:00Z`),
          dureeHeures: d.dureeHeures,
          creeParId: acteurId,
          statut: "OUVERTE",
        })
        .returning({ id: formationsExternes.id });
      await tx.insert(formationsExternesCompetences).values(d.competences.map((competenceId) => ({ formationExterneId: fe.id, competenceId })));
      await tx.insert(participationsExternes).values(d.participants.map((utilisateurId) => ({ formationExterneId: fe.id, utilisateurId })));
      return fe.id;
    });
    await journaliser({
      acteurId,
      action: "FORMATION_EXTERNE_CREEE",
      entite: "formation_externe",
      entiteId: id,
      details: { jeId: je.id, titre: d.titre, competences: d.competences.length, participants: d.participants.length },
    });
    rafraichir();
    return { ok: true, message: "Formation externe créée", donnees: { id } };
  } catch (err) {
    return { erreur: messageErreur(err, "Création impossible. Réessayez.") };
  }
}

/** Formation externe de l'organisation, encore ouverte ; lève une erreur montrable sinon. */
async function formationOuverte(jeId: string, id: string) {
  const [fe] = await db
    .select({ id: formationsExternes.id, titre: formationsExternes.titre, statut: formationsExternes.statut })
    .from(formationsExternes)
    .where(and(eq(formationsExternes.id, id), eq(formationsExternes.jeId, jeId)))
    .limit(1);
  if (!fe) throw new ErreurMetier("Cette formation externe n'appartient pas à votre organisation.");
  if (fe.statut !== "OUVERTE") throw new ErreurMetier("Cette formation est clôturée : ses mesures ne se modifient plus.");
  return fe;
}

const SchemaEvaluations = z.object({
  formationExterneId: Id,
  evaluations: z.record(
    Id,
    z.object({
      notes: z.record(Id, z.number().int().min(1).max(10).nullable()),
      scoreTest: z.number().min(0, "Score de test entre 0 et 100.").max(100, "Score de test entre 0 et 100.").nullable(),
    })
  ),
});

/** Enregistre la grille « participant × compétence » du formateur interne et les scores de test. */
export async function enregistrerEvaluations(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    let brut: unknown;
    try {
      brut = JSON.parse(String(formData.get("evaluations") ?? "{}"));
    } catch {
      return { erreur: "Grille d'évaluation illisible." };
    }
    const lu = SchemaEvaluations.safeParse({ formationExterneId: formData.get("formationExterneId"), evaluations: brut });
    if (!lu.success) return { erreur: lu.error.issues[0]?.message ?? "Grille d'évaluation invalide." };
    const fe = await formationOuverte(je.id, lu.data.formationExterneId);

    const [parts, comps] = await Promise.all([
      db.select({ id: participationsExternes.id }).from(participationsExternes).where(eq(participationsExternes.formationExterneId, fe.id)),
      db
        .select({ id: formationsExternesCompetences.competenceId })
        .from(formationsExternesCompetences)
        .where(eq(formationsExternesCompetences.formationExterneId, fe.id)),
    ]);
    const propres = nettoyerEvaluations(
      lu.data.evaluations,
      parts.map((p) => p.id),
      comps.map((c) => c.id)
    );
    await db.transaction(async (tx) => {
      for (const [pid, v] of Object.entries(propres)) {
        await tx
          .update(participationsExternes)
          .set({ evaluationFormateur: v.notes, scoreTest: v.scoreTest })
          .where(and(eq(participationsExternes.id, pid), eq(participationsExternes.formationExterneId, fe.id)));
      }
    });
    await journaliser({
      acteurId,
      action: "FORMATION_EXTERNE_EVALUEE",
      entite: "formation_externe",
      entiteId: fe.id,
      details: { jeId: je.id, evaluations: propres },
    });
    rafraichir(fe.id);
    return { ok: true, message: "Évaluations enregistrées" };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}

const SchemaDemande = z.object({ formationExterneId: Id, type: z.enum(["initiale", "finale"]) });

/** Envoie la demande d'auto-évaluation (notification + e-mail) aux participants qui ne l'ont pas terminée. */
export async function demanderAutoEvaluation(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaDemande.safeParse({ formationExterneId: formData.get("formationExterneId"), type: formData.get("type") });
    if (!lu.success) return { erreur: "Requête invalide." };
    const { type } = lu.data;
    const fe = await formationOuverte(je.id, lu.data.formationExterneId);
    const detail = await detailFormationExterne(je.id, fe.id);
    if (!detail) return { erreur: "Formation introuvable." };

    const cibles = detail.participants
      .filter((p) => (type === "initiale" ? p.initiale : p.finale) !== "TERMINEE")
      .map((p) => p.utilisateurId);
    if (!cibles.length) return { erreur: `Tous les participants ont déjà terminé leur auto-évaluation ${type}.` };

    const envoyees = await notifier(cibles, {
      type: "AUTO_EVALUATION",
      titre: type === "initiale" ? "Auto-évaluation avant la formation" : "Auto-évaluation après la formation",
      message:
        type === "initiale"
          ? `Avant « ${fe.titre} », évaluez-vous sur les compétences visées : quelques questions chronométrées, deux minutes au plus.`
          : `« ${fe.titre} » est terminée : réévaluez-vous sur les mêmes compétences pour mesurer votre progression.`,
      lien: `/competences/externe/${fe.id}`,
      donnees: { formationExterneId: fe.id, contexte: type === "initiale" ? "INITIALE" : "FINALE" },
      email: true,
      cle: cleDemandeAutoEval(type, fe.id),
    });
    await journaliser({
      acteurId,
      action: type === "initiale" ? "AUTO_EVAL_INITIALE_DEMANDEE" : "AUTO_EVAL_FINALE_DEMANDEE",
      entite: "formation_externe",
      entiteId: fe.id,
      details: { jeId: je.id, envoyees, cibles: cibles.length },
    });
    rafraichir(fe.id);
    if (envoyees === 0) {
      return { ok: true, message: "Demande déjà envoyée à ces participants : rien de renvoyé" };
    }
    return { ok: true, message: `Demande envoyée à ${envoyees} participant${envoyees > 1 ? "s" : ""}` };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const SchemaCloture = z.object({ formationExterneId: Id });

/** Calcule les gains avec la méthode standardisée, puis clôture la formation. */
export async function cloturerFormationExterne(formData: FormData): Promise<Resultat> {
  try {
    const { acteurId, je } = await contexte(formData);
    const lu = SchemaCloture.safeParse({ formationExterneId: formData.get("formationExterneId") });
    if (!lu.success) return { erreur: "Requête invalide." };
    const fe = await formationOuverte(je.id, lu.data.formationExterneId);
    const detail = await detailFormationExterne(je.id, fe.id);
    if (!detail) return { erreur: "Formation introuvable." };
    if (!detail.bilan.possible) {
      return {
        erreur:
          "Aucune mesure pour l'instant : saisissez l'évaluation du formateur, un score de test, ou attendez les auto-évaluations finales.",
      };
    }

    const calcules = await calculerFormationExterne(fe.id);
    const [maj] = await db
      .update(formationsExternes)
      .set({ statut: "CLOTUREE" })
      .where(and(eq(formationsExternes.id, fe.id), eq(formationsExternes.statut, "OUVERTE")))
      .returning({ id: formationsExternes.id });

    if (maj) {
      await notifier(
        detail.participants.map((p) => p.utilisateurId),
        {
          type: "NIVEAU",
          titre: "Vos niveaux ont été mis à jour",
          message: `La formation « ${fe.titre} » est clôturée : votre progression est calculée avec la méthode Cursus.`,
          lien: "/competences",
          cle: `externe-cloture:${fe.id}`,
        }
      );
    }
    await journaliser({
      acteurId,
      action: "FORMATION_EXTERNE_CLOTUREE",
      entite: "formation_externe",
      entiteId: fe.id,
      details: { jeId: je.id, participantsCalcules: calcules, avertissements: detail.bilan.avertissements },
    });
    rafraichir(fe.id);
    return { ok: true, message: `Formation clôturée : ${calcules} participant${calcules > 1 ? "s" : ""} calculé${calcules > 1 ? "s" : ""}` };
  } catch (err) {
    return { erreur: messageErreur(err, "Clôture impossible. Réessayez.") };
  }
}
