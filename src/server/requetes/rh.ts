import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  autoEvaluations,
  certificats,
  competences,
  domaines,
  formations,
  formationsExternes,
  formationsExternesCompetences,
  gainsFormation,
  historiqueNiveaux,
  juniorEntreprises,
  niveauxCompetence,
  notations,
  notifications,
  participationsExternes,
  pointsQuiz,
  progressions,
  reponsesAutoEvaluation,
  tentativesQuiz,
  utilisateurs,
} from "@/db/schema";
import { versCsv } from "@/lib/csv";
import { referentielEffectif } from "@/server/moteur/competences";
import type { Utilisateur } from "@/server/session";
import { palier, progression } from "@/services/competences";
import { heuresDepuisSecondes, nombreCsv, dateIso } from "@/services/rapports";
import { libelleRole } from "@/services/rbac";
import {
  bilanCloture,
  csvMultiSections,
  dateHeureCsv,
  EXPORTS_RH,
  etatAutoEvaluation,
  niveauApres,
  origineCompetence,
  valeurAutoEvalCsv,
  type OrigineCompetence,
  type TableCsv,
  type TypeExportRh,
} from "@/services/rh";
import { etatNiveau } from "@/services/xp";

/* ------------------------------------------------------------------ */
/* Périmètre : l'organisation sur laquelle agit le responsable RH               */
/* ------------------------------------------------------------------ */

export type JeRh = { id: string; nom: string; sigle: string | null; slug: string; couleur: string };

const champsJe = {
  id: juniorEntreprises.id,
  nom: juniorEntreprises.nom,
  sigle: juniorEntreprises.sigle,
  slug: juniorEntreprises.slug,
  couleur: juniorEntreprises.couleur,
};

/**
 * organisation de l'espace RH. Le RH n'agit que sur SA organisation (lue en base, pas dans le
 * jeton de session qui peut dater) ; seul un super admin peut en choisir
 * une autre (`?je=<id>`).
 */
export async function resoudreJe(u: Utilisateur, demande?: string | null): Promise<JeRh | null> {
  if (u.roles.includes("SUPER_ADMIN") && demande) {
    const [je] = await db.select(champsJe).from(juniorEntreprises).where(eq(juniorEntreprises.id, demande)).limit(1);
    if (je) return je;
  }
  const [moi] = await db.select({ jeId: utilisateurs.jeId }).from(utilisateurs).where(eq(utilisateurs.id, u.id)).limit(1);
  const jeId = moi?.jeId ?? null;
  if (!jeId) return null;
  const [je] = await db.select(champsJe).from(juniorEntreprises).where(eq(juniorEntreprises.id, jeId)).limit(1);
  return je ?? null;
}

/** Liste des organisations, pour le sélecteur du super admin. */
export async function listeJes() {
  return db.select(champsJe).from(juniorEntreprises).orderBy(asc(juniorEntreprises.nom));
}

/* ------------------------------------------------------------------ */
/* Membres                                                             */
/* ------------------------------------------------------------------ */

async function idsMembresValides(jeId: string): Promise<string[]> {
  const l = await db
    .select({ id: utilisateurs.id })
    .from(utilisateurs)
    .where(and(eq(utilisateurs.jeId, jeId), eq(utilisateurs.rattachement, "VALIDE")));
  return l.map((x) => x.id);
}

export async function donneesMembres(jeId: string) {
  const champs = {
    id: utilisateurs.id,
    prenom: utilisateurs.prenom,
    nom: utilisateurs.nom,
    email: utilisateurs.email,
    photoUrl: utilisateurs.photoUrl,
    poste: utilisateurs.poste,
    departement: utilisateurs.departement,
    roles: utilisateurs.roles,
    actif: utilisateurs.actif,
    xp: utilisateurs.xp,
    dernierAcces: utilisateurs.dernierAcces,
    dernierBattement: utilisateurs.dernierBattement,
    creeLe: utilisateurs.creeLe,
  };
  const [enAttente, valides] = await Promise.all([
    db
      .select(champs)
      .from(utilisateurs)
      .where(and(eq(utilisateurs.jeId, jeId), eq(utilisateurs.rattachement, "EN_ATTENTE")))
      .orderBy(asc(utilisateurs.creeLe)),
    db
      .select(champs)
      .from(utilisateurs)
      .where(and(eq(utilisateurs.jeId, jeId), eq(utilisateurs.rattachement, "VALIDE")))
      .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom)),
  ]);
  const ids = valides.map((v) => v.id);
  const terminees = ids.length
    ? await db
        .select({ id: progressions.utilisateurId, n: count() })
        .from(progressions)
        .where(and(inArray(progressions.utilisateurId, ids), eq(progressions.statut, "TERMINEE")))
        .groupBy(progressions.utilisateurId)
    : [];
  const iTerm = new Map(terminees.map((t) => [t.id, t.n]));
  const derniere = (m: { dernierAcces: Date | null; dernierBattement: Date | null }) => {
    const t = Math.max(m.dernierAcces?.getTime() ?? 0, m.dernierBattement?.getTime() ?? 0);
    return t ? new Date(t) : null;
  };
  return {
    enAttente: enAttente.map((m) => ({ ...m, derniereActivite: derniere(m) })),
    valides: valides.map((m) => ({
      ...m,
      niveau: etatNiveau(m.xp),
      formationsTerminees: iTerm.get(m.id) ?? 0,
      derniereActivite: derniere(m),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Compétences de l'organisation                                                */
/* ------------------------------------------------------------------ */

const TRENTE_JOURS = 30 * 24 * 3600 * 1000;

export async function donneesCompetencesJe(jeId: string) {
  const [membres, listeDomaines] = await Promise.all([
    db
      .select({
        id: utilisateurs.id,
        prenom: utilisateurs.prenom,
        nom: utilisateurs.nom,
        photoUrl: utilisateurs.photoUrl,
        poste: utilisateurs.poste,
        actif: utilisateurs.actif,
        dernierAcces: utilisateurs.dernierAcces,
        dernierBattement: utilisateurs.dernierBattement,
      })
      .from(utilisateurs)
      .where(and(eq(utilisateurs.jeId, jeId), eq(utilisateurs.rattachement, "VALIDE")))
      .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom)),
    db
      .select({ id: domaines.id, nom: domaines.nom, code: domaines.code, couleur: domaines.couleur, icone: domaines.icone })
      .from(domaines)
      .orderBy(asc(domaines.ordre), asc(domaines.nom)),
  ]);
  const ids = membres.map((m) => m.id);
  if (!ids.length) {
    return {
      membres,
      domaines: listeDomaines,
      niveaux: [],
      indicateurs: { membres: 0, actifs: 0, formationsTerminees: 0, heuresVues: 0, certificats: 0 },
    };
  }
  const [niveaux, activite, certs] = await Promise.all([
    db
      .select({
        utilisateurId: niveauxCompetence.utilisateurId,
        competenceId: niveauxCompetence.competenceId,
        domaineId: competences.domaineId,
        niveau: niveauxCompetence.niveau,
        niveauInitial: niveauxCompetence.niveauInitial,
      })
      .from(niveauxCompetence)
      .innerJoin(competences, eq(competences.id, niveauxCompetence.competenceId))
      .where(inArray(niveauxCompetence.utilisateurId, ids)),
    db
      .select({
        secondes: sql<number>`coalesce(sum(${progressions.secondesVues}), 0)`.mapWith(Number),
        terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
      })
      .from(progressions)
      .where(inArray(progressions.utilisateurId, ids)),
    db
      .select({ n: count() })
      .from(certificats)
      .where(and(inArray(certificats.utilisateurId, ids), isNull(certificats.revoqueLe))),
  ]);
  const seuil = Date.now() - TRENTE_JOURS;
  const actifs = membres.filter(
    (m) => m.actif && Math.max(m.dernierAcces?.getTime() ?? 0, m.dernierBattement?.getTime() ?? 0) >= seuil
  ).length;
  return {
    membres,
    domaines: listeDomaines,
    niveaux,
    indicateurs: {
      membres: membres.length,
      actifs,
      formationsTerminees: activite[0]?.terminees ?? 0,
      heuresVues: heuresDepuisSecondes(activite[0]?.secondes ?? 0),
      certificats: certs[0]?.n ?? 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Référentiel de l'organisation                                                */
/* ------------------------------------------------------------------ */

export type LigneReferentielJe = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  question: string | null;
  pistes: string | null;
  active: boolean;
  origine: OrigineCompetence;
  nomSource: string | null;
};

export async function donneesReferentielJe(jeId: string) {
  const champs = {
    id: competences.id,
    code: competences.code,
    nom: competences.nom,
    description: competences.description,
    question: competences.question,
    pistes: competences.pistes,
    domaineId: competences.domaineId,
    jeId: competences.jeId,
    sourceId: competences.sourceId,
    active: competences.active,
    ordre: competences.ordre,
  };
  const [listeDomaines, confed, propres] = await Promise.all([
    db
      .select({ id: domaines.id, nom: domaines.nom, code: domaines.code, couleur: domaines.couleur, icone: domaines.icone, description: domaines.description })
      .from(domaines)
      .orderBy(asc(domaines.ordre), asc(domaines.nom)),
    db.select(champs).from(competences).where(isNull(competences.jeId)).orderBy(asc(competences.ordre), asc(competences.nom)),
    db.select(champs).from(competences).where(eq(competences.jeId, jeId)).orderBy(asc(competences.ordre), asc(competences.nom)),
  ]);
  const iConfed = new Map(confed.map((c) => [c.id, c]));

  return listeDomaines.map((d) => {
    const confedDomaine = confed.filter((c) => c.domaineId === d.id);
    const jeDomaine = propres.filter((c) => c.domaineId === d.id);
    // Même règle que `referentielEffectif` : adapté dès qu'une compétence propre à l'organisation est active.
    const adapte = jeDomaine.some((c) => c.active);
    const versLigne = (c: (typeof confed)[number]): LigneReferentielJe => {
      const source = c.sourceId ? iConfed.get(c.sourceId) : undefined;
      return {
        id: c.id,
        code: c.code,
        nom: c.nom,
        description: c.description,
        question: c.question,
        pistes: c.pistes,
        active: c.active,
        origine: origineCompetence(c, source?.nom ?? null),
        nomSource: source && source.nom !== c.nom ? source.nom : null,
      };
    };
    const reprises = new Set(jeDomaine.map((c) => c.sourceId).filter(Boolean));
    return {
      ...d,
      adapte,
      // Compétences organisation ayant existé : « Adapter » les réactivera plutôt que d'en recopier.
      dejaAdapte: jeDomaine.length > 0,
      lignes: adapte ? jeDomaine.map(versLigne) : confedDomaine.filter((c) => c.active).map(versLigne),
      /** Compétences communes actives pas encore reprises dans la version de l'organisation. */
      nonReprises: adapte
        ? confedDomaine.filter((c) => c.active && !reprises.has(c.id)).map((c) => ({ id: c.id, nom: c.nom }))
        : [],
    };
  });
}

export type DomaineReferentielJe = Awaited<ReturnType<typeof donneesReferentielJe>>[number];

/* ------------------------------------------------------------------ */
/* Formations externes                                                 */
/* ------------------------------------------------------------------ */

export async function listeFormationsExternes(jeId: string) {
  const [lignes, effectifs] = await Promise.all([
    db
      .select({
        id: formationsExternes.id,
        titre: formationsExternes.titre,
        date: formationsExternes.date,
        dureeHeures: formationsExternes.dureeHeures,
        formateurInterne: formationsExternes.formateurInterne,
        statut: formationsExternes.statut,
        domaine: domaines.nom,
        couleur: domaines.couleur,
      })
      .from(formationsExternes)
      .innerJoin(domaines, eq(domaines.id, formationsExternes.domaineId))
      .where(eq(formationsExternes.jeId, jeId))
      .orderBy(desc(formationsExternes.date)),
    db
      .select({ id: participationsExternes.formationExterneId, n: count() })
      .from(participationsExternes)
      .innerJoin(formationsExternes, eq(formationsExternes.id, participationsExternes.formationExterneId))
      .where(eq(formationsExternes.jeId, jeId))
      .groupBy(participationsExternes.formationExterneId),
  ]);
  const iEff = new Map(effectifs.map((e) => [e.id, e.n]));
  return lignes.map((l) => ({ ...l, participants: iEff.get(l.id) ?? 0 }));
}

/** Données du formulaire de création : référentiel effectif par domaine et membres validés. */
export async function donneesNouvelleFormation(jeId: string) {
  const listeDomaines = await db
    .select({ id: domaines.id, nom: domaines.nom, couleur: domaines.couleur })
    .from(domaines)
    .orderBy(asc(domaines.ordre), asc(domaines.nom));
  const referentiels = await Promise.all(listeDomaines.map((d) => referentielEffectif(d.id, jeId)));
  const membres = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      photoUrl: utilisateurs.photoUrl,
      poste: utilisateurs.poste,
      departement: utilisateurs.departement,
    })
    .from(utilisateurs)
    .where(and(eq(utilisateurs.jeId, jeId), eq(utilisateurs.rattachement, "VALIDE"), eq(utilisateurs.actif, true)))
    .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom));
  return {
    domaines: listeDomaines.map((d, i) => ({
      ...d,
      competences: referentiels[i].map((c) => ({ id: c.id, nom: c.nom, propre: !!c.jeId })),
    })),
    membres,
  };
}

/** Clé d'idempotence (sans le suffixe destinataire ajouté par `notifier`). */
export function cleDemandeAutoEval(type: "initiale" | "finale", formationExterneId: string): string {
  return `externe-${type}:${formationExterneId}`;
}

export async function detailFormationExterne(jeId: string, id: string) {
  const [fe] = await db
    .select({
      id: formationsExternes.id,
      titre: formationsExternes.titre,
      description: formationsExternes.description,
      formateurInterne: formationsExternes.formateurInterne,
      date: formationsExternes.date,
      dureeHeures: formationsExternes.dureeHeures,
      statut: formationsExternes.statut,
      creeLe: formationsExternes.creeLe,
      domaineId: formationsExternes.domaineId,
      domaine: domaines.nom,
      couleur: domaines.couleur,
    })
    .from(formationsExternes)
    .innerJoin(domaines, eq(domaines.id, formationsExternes.domaineId))
    .where(and(eq(formationsExternes.id, id), eq(formationsExternes.jeId, jeId)))
    .limit(1);
  if (!fe) return null;

  const [comps, participants, demandes, gains] = await Promise.all([
    db
      .select({ id: competences.id, nom: competences.nom, code: competences.code })
      .from(formationsExternesCompetences)
      .innerJoin(competences, eq(competences.id, formationsExternesCompetences.competenceId))
      .where(eq(formationsExternesCompetences.formationExterneId, id))
      .orderBy(asc(competences.ordre), asc(competences.nom)),
    db
      .select({
        id: participationsExternes.id,
        utilisateurId: participationsExternes.utilisateurId,
        prenom: utilisateurs.prenom,
        nom: utilisateurs.nom,
        photoUrl: utilisateurs.photoUrl,
        poste: utilisateurs.poste,
        evaluationFormateur: participationsExternes.evaluationFormateur,
        scoreTest: participationsExternes.scoreTest,
        autoEvalInitialeId: participationsExternes.autoEvalInitialeId,
        autoEvalFinaleId: participationsExternes.autoEvalFinaleId,
        calculeLe: participationsExternes.calculeLe,
      })
      .from(participationsExternes)
      .innerJoin(utilisateurs, eq(utilisateurs.id, participationsExternes.utilisateurId))
      .where(eq(participationsExternes.formationExterneId, id))
      .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom)),
    db
      .select({ cle: notifications.cleIdempotence, creeLe: notifications.creeLe })
      .from(notifications)
      .where(like(notifications.cleIdempotence, `externe-%:${id}:%`)),
    db
      .select({
        utilisateurId: gainsFormation.utilisateurId,
        competenceId: gainsFormation.competenceId,
        niveauAvant: gainsFormation.niveauAvant,
        niveauObserve: gainsFormation.niveauObserve,
        gainTotal: gainsFormation.gainTotal,
        gainApplique: gainsFormation.gainApplique,
        gainEnAttente: gainsFormation.gainEnAttente,
        detail: gainsFormation.detail,
        consolideLe: gainsFormation.consolideLe,
      })
      .from(gainsFormation)
      .where(eq(gainsFormation.formationExterneId, id)),
  ]);

  const idsAe = participants.flatMap((p) => [p.autoEvalInitialeId, p.autoEvalFinaleId]).filter((x): x is string => !!x);
  const aes = idsAe.length
    ? await db
        .select({ id: autoEvaluations.id, termineeLe: autoEvaluations.termineeLe })
        .from(autoEvaluations)
        .where(inArray(autoEvaluations.id, idsAe))
    : [];
  const iAe = new Map(aes.map((a) => [a.id, a.termineeLe]));
  const iDemandes = new Map(demandes.map((d) => [d.cle ?? "", d.creeLe]));
  const cleI = cleDemandeAutoEval("initiale", id);
  const cleF = cleDemandeAutoEval("finale", id);

  const lignes = participants.map((p) => {
    const demandeI = iDemandes.get(`${cleI}:${p.utilisateurId}`) ?? null;
    const demandeF = iDemandes.get(`${cleF}:${p.utilisateurId}`) ?? null;
    const initiale = etatAutoEvaluation({
      autoEvalId: p.autoEvalInitialeId,
      termineeLe: p.autoEvalInitialeId ? (iAe.get(p.autoEvalInitialeId) ?? null) : null,
      demandee: !!demandeI,
    });
    const finale = etatAutoEvaluation({
      autoEvalId: p.autoEvalFinaleId,
      termineeLe: p.autoEvalFinaleId ? (iAe.get(p.autoEvalFinaleId) ?? null) : null,
      demandee: !!demandeF,
    });
    return {
      ...p,
      initiale,
      finale,
      demandeInitialeLe: demandeI,
      demandeFinaleLe: demandeF,
      resultats: comps.map((c) => {
        const g = gains.find((x) => x.utilisateurId === p.utilisateurId && x.competenceId === c.id);
        return {
          competenceId: c.id,
          gain: g ? { ...g, niveauApres: niveauApres(g.niveauAvant, g.gainApplique) } : null,
        };
      }),
    };
  });

  const bilan = bilanCloture(
    lignes.map((l) => ({
      initiale: l.initiale,
      finale: l.finale,
      evaluationFormateur: l.evaluationFormateur,
      scoreTest: l.scoreTest,
    })),
    comps.map((c) => c.id)
  );

  return { formation: fe, competences: comps, participants: lignes, bilan };
}

export type DetailFormationExterne = NonNullable<Awaited<ReturnType<typeof detailFormationExterne>>>;

/* ------------------------------------------------------------------ */
/* Exports CSV                                                          */
/* ------------------------------------------------------------------ */

const nomMembre = (m: { prenom: string; nom: string }) => `${m.prenom} ${m.nom}`.trim();

async function exportMembres(jeId: string): Promise<TableCsv> {
  const lignes = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      poste: utilisateurs.poste,
      departement: utilisateurs.departement,
      rattachement: utilisateurs.rattachement,
      roles: utilisateurs.roles,
      actif: utilisateurs.actif,
      xp: utilisateurs.xp,
      tempsActifSec: utilisateurs.tempsActifSec,
      dernierAcces: utilisateurs.dernierAcces,
      creeLe: utilisateurs.creeLe,
    })
    .from(utilisateurs)
    .where(eq(utilisateurs.jeId, jeId))
    .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom));
  const ids = lignes.map((l) => l.id);
  const [act, certs] = ids.length
    ? await Promise.all([
        db
          .select({
            id: progressions.utilisateurId,
            secondes: sql<number>`coalesce(sum(${progressions.secondesVues}), 0)`.mapWith(Number),
            terminees: sql<number>`count(*) filter (where ${progressions.statut} = 'TERMINEE')`.mapWith(Number),
          })
          .from(progressions)
          .where(inArray(progressions.utilisateurId, ids))
          .groupBy(progressions.utilisateurId),
        db
          .select({ id: certificats.utilisateurId, n: count() })
          .from(certificats)
          .where(and(inArray(certificats.utilisateurId, ids), isNull(certificats.revoqueLe)))
          .groupBy(certificats.utilisateurId),
      ])
    : [[], []];
  const iAct = new Map(act.map((a) => [a.id, a]));
  const iCert = new Map(certs.map((c) => [c.id, c.n]));
  return {
    entetes: [
      "Prénom",
      "Nom",
      "E-mail",
      "Poste",
      "Département",
      "Rattachement",
      "Rôles",
      "Compte actif",
      "Niveau XP",
      "Rang",
      "XP",
      "Formations terminées",
      "Heures vues",
      "Temps actif (h)",
      "Certificats",
      "Dernier accès",
      "Inscrit le",
    ],
    lignes: lignes.map((l) => {
      const n = etatNiveau(l.xp);
      return [
        l.prenom,
        l.nom,
        l.email,
        l.poste ?? "",
        l.departement ?? "",
        l.rattachement,
        l.roles.map(libelleRole).join(" + "),
        l.actif ? "Oui" : "Non",
        n.niveau,
        n.titre,
        l.xp,
        iAct.get(l.id)?.terminees ?? 0,
        heuresDepuisSecondes(iAct.get(l.id)?.secondes ?? 0),
        heuresDepuisSecondes(l.tempsActifSec),
        iCert.get(l.id) ?? 0,
        dateHeureCsv(l.dernierAcces),
        dateIso(l.creeLe),
      ];
    }),
  };
}

async function exportNiveaux(jeId: string): Promise<TableCsv> {
  const ids = await idsMembresValides(jeId);
  const lignes = ids.length
    ? await db
        .select({
          prenom: utilisateurs.prenom,
          nom: utilisateurs.nom,
          email: utilisateurs.email,
          domaine: domaines.nom,
          code: competences.code,
          competence: competences.nom,
          jeId: competences.jeId,
          niveauInitial: niveauxCompetence.niveauInitial,
          niveau: niveauxCompetence.niveau,
          majLe: niveauxCompetence.majLe,
        })
        .from(niveauxCompetence)
        .innerJoin(utilisateurs, eq(utilisateurs.id, niveauxCompetence.utilisateurId))
        .innerJoin(competences, eq(competences.id, niveauxCompetence.competenceId))
        .innerJoin(domaines, eq(domaines.id, competences.domaineId))
        .where(inArray(niveauxCompetence.utilisateurId, ids))
        .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom), asc(domaines.ordre), asc(competences.ordre))
    : [];
  return {
    entetes: [
      "Membre",
      "E-mail",
      "Domaine",
      "Code compétence",
      "Compétence",
      "Référentiel",
      "Niveau initial",
      "Niveau actuel",
      "Progression",
      "Palier",
      "Mis à jour le",
    ],
    lignes: lignes.map((l) => [
      nomMembre(l),
      l.email,
      l.domaine,
      l.code,
      l.competence,
      l.jeId ? "Organisation" : "Plateforme",
      nombreCsv(l.niveauInitial, 1),
      nombreCsv(l.niveau, 1),
      nombreCsv(progression(l.niveauInitial, l.niveau), 1),
      palier(l.niveau).libelle,
      dateIso(l.majLe),
    ]),
  };
}

async function exportHistorique(jeId: string): Promise<TableCsv> {
  const ids = await idsMembresValides(jeId);
  const lignes = ids.length
    ? await db
        .select({
          prenom: utilisateurs.prenom,
          nom: utilisateurs.nom,
          email: utilisateurs.email,
          domaine: domaines.nom,
          code: competences.code,
          competence: competences.nom,
          creeLe: historiqueNiveaux.creeLe,
          niveau: historiqueNiveaux.niveau,
          variation: historiqueNiveaux.variation,
          source: historiqueNiveaux.source,
          libelle: historiqueNiveaux.libelle,
        })
        .from(historiqueNiveaux)
        .innerJoin(utilisateurs, eq(utilisateurs.id, historiqueNiveaux.utilisateurId))
        .innerJoin(competences, eq(competences.id, historiqueNiveaux.competenceId))
        .innerJoin(domaines, eq(domaines.id, competences.domaineId))
        .where(inArray(historiqueNiveaux.utilisateurId, ids))
        .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom), asc(competences.code), asc(historiqueNiveaux.creeLe))
    : [];
  return {
    entetes: ["Membre", "E-mail", "Domaine", "Code compétence", "Compétence", "Date", "Niveau", "Variation", "Source", "Libellé"],
    lignes: lignes.map((l) => [
      nomMembre(l),
      l.email,
      l.domaine,
      l.code,
      l.competence,
      dateHeureCsv(l.creeLe),
      nombreCsv(l.niveau, 1),
      nombreCsv(l.variation, 1),
      l.source,
      l.libelle ?? "",
    ]),
  };
}

async function exportFormationsExternes(jeId: string): Promise<TableCsv> {
  const fes = await db
    .select({
      id: formationsExternes.id,
      titre: formationsExternes.titre,
      date: formationsExternes.date,
      dureeHeures: formationsExternes.dureeHeures,
      formateurInterne: formationsExternes.formateurInterne,
      statut: formationsExternes.statut,
      domaine: domaines.nom,
    })
    .from(formationsExternes)
    .innerJoin(domaines, eq(domaines.id, formationsExternes.domaineId))
    .where(eq(formationsExternes.jeId, jeId))
    .orderBy(asc(formationsExternes.date));
  const entetes = [
    "Formation",
    "Date",
    "Durée (h)",
    "Domaine",
    "Formateur interne",
    "Statut",
    "Participant",
    "E-mail",
    "Code compétence",
    "Compétence",
    "Auto-évaluation initiale (1-10)",
    "Auto-évaluation finale (1-10)",
    "Évaluation du formateur (1-10)",
    "Test interne (0-100)",
    "Niveau avant",
    "Niveau observé",
    "Gain total",
    "Gain appliqué",
    "Gain en attente",
    "Niveau après",
    "Consolidé le",
  ];
  if (!fes.length) return { entetes, lignes: [] };
  const ids = fes.map((f) => f.id);
  const [comps, parts, gains] = await Promise.all([
    db
      .select({ feId: formationsExternesCompetences.formationExterneId, id: competences.id, code: competences.code, nom: competences.nom })
      .from(formationsExternesCompetences)
      .innerJoin(competences, eq(competences.id, formationsExternesCompetences.competenceId))
      .where(inArray(formationsExternesCompetences.formationExterneId, ids))
      .orderBy(asc(competences.ordre)),
    db
      .select({
        feId: participationsExternes.formationExterneId,
        utilisateurId: participationsExternes.utilisateurId,
        prenom: utilisateurs.prenom,
        nom: utilisateurs.nom,
        email: utilisateurs.email,
        evaluationFormateur: participationsExternes.evaluationFormateur,
        scoreTest: participationsExternes.scoreTest,
        initialeId: participationsExternes.autoEvalInitialeId,
        finaleId: participationsExternes.autoEvalFinaleId,
      })
      .from(participationsExternes)
      .innerJoin(utilisateurs, eq(utilisateurs.id, participationsExternes.utilisateurId))
      .where(inArray(participationsExternes.formationExterneId, ids))
      .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom)),
    db.select().from(gainsFormation).where(inArray(gainsFormation.formationExterneId, ids)),
  ]);
  const idsAe = parts.flatMap((p) => [p.initialeId, p.finaleId]).filter((x): x is string => !!x);
  const reponses = idsAe.length
    ? await db
        .select({
          ae: reponsesAutoEvaluation.autoEvaluationId,
          competenceId: reponsesAutoEvaluation.competenceId,
          valeur: reponsesAutoEvaluation.valeur,
          inconnu: reponsesAutoEvaluation.inconnu,
          expire: reponsesAutoEvaluation.expire,
        })
        .from(reponsesAutoEvaluation)
        .where(inArray(reponsesAutoEvaluation.autoEvaluationId, idsAe))
    : [];
  const iRep = new Map(reponses.map((r) => [`${r.ae}|${r.competenceId}`, r]));
  const iGain = new Map(gains.map((g) => [`${g.formationExterneId}|${g.utilisateurId}|${g.competenceId}`, g]));

  const lignes: TableCsv["lignes"] = [];
  for (const f of fes) {
    for (const p of parts.filter((x) => x.feId === f.id)) {
      for (const c of comps.filter((x) => x.feId === f.id)) {
        const g = iGain.get(`${f.id}|${p.utilisateurId}|${c.id}`);
        lignes.push([
          f.titre,
          dateIso(f.date),
          nombreCsv(f.dureeHeures, 1),
          f.domaine,
          f.formateurInterne,
          f.statut,
          nomMembre(p),
          p.email,
          c.code,
          c.nom,
          valeurAutoEvalCsv(p.initialeId ? iRep.get(`${p.initialeId}|${c.id}`) : undefined),
          valeurAutoEvalCsv(p.finaleId ? iRep.get(`${p.finaleId}|${c.id}`) : undefined),
          p.evaluationFormateur[c.id] ?? "",
          nombreCsv(p.scoreTest, 1),
          g ? nombreCsv(g.niveauAvant, 1) : "",
          g ? nombreCsv(g.niveauObserve, 1) : "",
          g ? nombreCsv(g.gainTotal, 1) : "",
          g ? nombreCsv(g.gainApplique, 1) : "",
          g ? nombreCsv(g.gainEnAttente, 1) : "",
          g ? nombreCsv(niveauApres(g.niveauAvant, g.gainApplique), 1) : "",
          g ? dateIso(g.consolideLe) : "",
        ]);
      }
    }
  }
  return { entetes, lignes };
}

async function exportFormations(jeId: string): Promise<TableCsv> {
  const ids = await idsMembresValides(jeId);
  const entetes = [
    "Membre",
    "E-mail",
    "Formation",
    "Domaine",
    "Démarrée le",
    "Terminée le",
    "Heures vues",
    "Quiz final, 1re tentative (%)",
    "Quiz final, meilleur score (%)",
    "Note donnée (/5)",
  ];
  if (!ids.length) return { entetes, lignes: [] };
  const lignes = await db
    .select({
      utilisateurId: progressions.utilisateurId,
      formationId: progressions.formationId,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      titre: formations.titre,
      domaine: domaines.nom,
      demarreeLe: progressions.demarreeLe,
      termineeLe: progressions.termineeLe,
      secondesVues: progressions.secondesVues,
    })
    .from(progressions)
    .innerJoin(utilisateurs, eq(utilisateurs.id, progressions.utilisateurId))
    .innerJoin(formations, eq(formations.id, progressions.formationId))
    .innerJoin(domaines, eq(domaines.id, formations.domaineId))
    .where(and(inArray(progressions.utilisateurId, ids), eq(progressions.statut, "TERMINEE")))
    .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom), asc(progressions.termineeLe));
  const [scores, notes] = await Promise.all([
    db
      .select({
        utilisateurId: tentativesQuiz.utilisateurId,
        formationId: pointsQuiz.formationId,
        premier: sql<number | null>`max(${tentativesQuiz.score}) filter (where ${tentativesQuiz.numero} = 1)`,
        meilleur: sql<number | null>`max(${tentativesQuiz.score})`,
      })
      .from(tentativesQuiz)
      .innerJoin(pointsQuiz, eq(pointsQuiz.id, tentativesQuiz.pointQuizId))
      .where(and(inArray(tentativesQuiz.utilisateurId, ids), eq(pointsQuiz.type, "FINAL")))
      .groupBy(tentativesQuiz.utilisateurId, pointsQuiz.formationId),
    db
      .select({ utilisateurId: notations.utilisateurId, formationId: notations.formationId, note: notations.note })
      .from(notations)
      .where(inArray(notations.utilisateurId, ids)),
  ]);
  const iScore = new Map(scores.map((s) => [`${s.utilisateurId}|${s.formationId}`, s]));
  const iNote = new Map(notes.map((n) => [`${n.utilisateurId}|${n.formationId}`, n.note]));
  const pct = (v: number | string | null | undefined) =>
    v === null || v === undefined ? "" : nombreCsv(Number(v) * 100, 0);
  return {
    entetes,
    lignes: lignes.map((l) => {
      const k = `${l.utilisateurId}|${l.formationId}`;
      const s = iScore.get(k);
      return [
        nomMembre(l),
        l.email,
        l.titre,
        l.domaine,
        dateIso(l.demarreeLe),
        dateIso(l.termineeLe),
        heuresDepuisSecondes(l.secondesVues),
        pct(s?.premier),
        pct(s?.meilleur),
        nombreCsv(iNote.get(k) ?? null, 2),
      ];
    }),
  };
}

const EXPORTEURS: Record<Exclude<TypeExportRh, "tout">, (jeId: string) => Promise<TableCsv>> = {
  membres: exportMembres,
  niveaux: exportNiveaux,
  historique: exportHistorique,
  "formations-externes": exportFormationsExternes,
  formations: exportFormations,
};

/** Contenu CSV (avec BOM) d'un export de l'organisation, et nombre de lignes. */
export async function contenuExportRh(jeId: string, type: TypeExportRh): Promise<{ csv: string; lignes: number }> {
  if (type !== "tout") {
    const t = await EXPORTEURS[type](jeId);
    return { csv: versCsv(t.entetes, t.lignes), lignes: t.lignes.length };
  }
  const cles = Object.keys(EXPORTEURS) as Exclude<TypeExportRh, "tout">[];
  const tables = await Promise.all(cles.map((c) => EXPORTEURS[c](jeId)));
  return {
    csv: csvMultiSections(cles.map((c, i) => ({ titre: EXPORTS_RH[c].titre, table: tables[i] }))),
    lignes: tables.reduce((s, t) => s + t.lignes.length, 0),
  };
}

/** Compteurs des onglets (demandes en attente, formations externes ouvertes). */
export async function compteursRh(jeId: string) {
  const [attente, ouvertes] = await Promise.all([
    db
      .select({ n: count() })
      .from(utilisateurs)
      .where(and(eq(utilisateurs.jeId, jeId), eq(utilisateurs.rattachement, "EN_ATTENTE"))),
    db
      .select({ n: count() })
      .from(formationsExternes)
      .where(and(eq(formationsExternes.jeId, jeId), eq(formationsExternes.statut, "OUVERTE"))),
  ]);
  return { enAttente: attente[0]?.n ?? 0, formationsOuvertes: ouvertes[0]?.n ?? 0 };
}
