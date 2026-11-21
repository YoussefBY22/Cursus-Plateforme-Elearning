import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  autoEvaluations,
  competences,
  domaines,
  formations,
  formationsCompetences,
  formationsExternes,
  formationsExternesCompetences,
  gainsFormation,
  historiqueNiveaux,
  juniorEntreprises,
  niveauxCompetence,
  participationsExternes,
  progressions,
  utilisateurs,
} from "@/db/schema";
import { ErreurMetier } from "@/lib/resultat";
import { aEvalueDomaine, referentielEffectif } from "@/server/moteur/competences";
import { lireParametres } from "@/server/parametres";
import {
  libelleQuestion,
  QUESTIONS_MAX,
  type ContexteAutoEvaluation,
  type QuestionAutoEvaluation,
} from "@/services/auto-evaluation";
import { competencesPrioritaires, noteGenerale, palier, progression } from "@/services/competences";

/*
 * Lecture du module « Mes compétences ». Tout passe par le référentiel
 * EFFECTIF du membre (celui de son organisation si elle l'a adapté, sinon celui de la
 * Plateforme) : un niveau mesuré sur une compétence commune compte
 * pour son adaptation locale (lien `sourceId`), les niveaux restent donc
 * comparables d'une organisation à l'autre.
 */

const arrondi1 = (v: number) => Math.round(v * 10) / 10;
const moyenne = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);

/** Chemin de la page d'une formation du catalogue (une seule définition). */
export function cheminFormation(slug: string): string {
  return `/formations/${slug}`;
}

/** Miniature d'une formation : image dédiée, sinon miniature YouTube. */
export function miniatureFormation(f: { imageUrl: string | null; fournisseurVideo: string; referenceVideo: string }): string | null {
  if (f.imageUrl) return f.imageUrl;
  if (f.fournisseurVideo === "YOUTUBE" && /^[\w-]{6,20}$/.test(f.referenceVideo)) {
    return `https://i.ytimg.com/vi/${f.referenceVideo}/hqdefault.jpg`;
  }
  return null;
}

type Membre = { id: string; prenom: string; nom: string; photoUrl: string | null; xp: number; jeId: string | null; masquerStats: boolean };

async function lireMembre(utilisateurId: string): Promise<Membre | null> {
  const [u] = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      photoUrl: utilisateurs.photoUrl,
      xp: utilisateurs.xp,
      jeId: utilisateurs.jeId,
      masquerStats: utilisateurs.masquerStats,
    })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, utilisateurId))
    .limit(1);
  return u ?? null;
}

type CompetenceRef = Awaited<ReturnType<typeof referentielEffectif>>[number];
type NiveauLu = { niveau: number; niveauInitial: number; competenceId: string };

/**
 * Niveau d'un membre sur une compétence effective : le sien, sinon celui de
 * la compétence commune d'origine.
 */
function niveauDe(c: CompetenceRef, niveaux: Map<string, NiveauLu>): NiveauLu | null {
  return niveaux.get(c.id) ?? (c.sourceId ? (niveaux.get(c.sourceId) ?? null) : null);
}

/** Domaines + référentiels effectifs + niveaux d'un membre, en une passe. */
async function socle(utilisateurId: string, jeId: string | null, domaineIds?: string[]) {
  const listeDomaines = await db
    .select()
    .from(domaines)
    .where(domaineIds ? inArray(domaines.id, domaineIds) : undefined)
    .orderBy(asc(domaines.ordre), asc(domaines.nom));
  const [referentiels, lignesNiveaux] = await Promise.all([
    Promise.all(listeDomaines.map((d) => referentielEffectif(d.id, jeId))),
    db
      .select({
        competenceId: niveauxCompetence.competenceId,
        niveau: niveauxCompetence.niveau,
        niveauInitial: niveauxCompetence.niveauInitial,
      })
      .from(niveauxCompetence)
      .where(eq(niveauxCompetence.utilisateurId, utilisateurId)),
  ]);
  const niveaux = new Map(lignesNiveaux.map((n) => [n.competenceId, n]));
  return { listeDomaines, referentiels, niveaux };
}

/* ------------------------------------------------------------------ */
/* Profil (carte joueur + radar)                                       */
/* ------------------------------------------------------------------ */

export type DomaineProfil = {
  id: string;
  code: string;
  nom: string;
  couleur: string;
  icone: string;
  /** Moyenne des compétences mesurées (0–99, arrondie), null si aucune. */
  niveau: number | null;
  /** Même moyenne sur les niveaux initiaux (auto-évaluation de départ). */
  niveauInitial: number | null;
  mesurees: number;
  /** Nombre de compétences du référentiel effectif du membre. */
  total: number;
};

export type ProfilCompetences = {
  domaines: DomaineProfil[];
  /** Note générale « OVR » 0–99 sur les domaines mesurés (0 si aucun). */
  noteGenerale: number;
  palier: { code: string; libelle: string };
  /** Auto-évaluations terminées. */
  autoEvaluations: number;
  /** Vrai dès qu'une compétence est mesurée. */
  aDesMesures: boolean;
};

/**
 * Profil de compétences d'un membre : un domaine par axe du radar (ordre
 * `domaine.ordre`), sa note générale et son palier. Réutilisable par toute
 * page qui affiche une carte joueur ou un radar (profil, annuaire…) ; la
 * visibilité doit avoir été vérifiée par l'appelant.
 */
export async function profilCompetences(utilisateurId: string): Promise<ProfilCompetences> {
  const membre = await lireMembre(utilisateurId);
  const { listeDomaines, referentiels, niveaux } = await socle(utilisateurId, membre?.jeId ?? null);
  const [{ n: nbAutoEvaluations }] = await db
    .select({ n: count() })
    .from(autoEvaluations)
    .where(and(eq(autoEvaluations.utilisateurId, utilisateurId), isNotNull(autoEvaluations.termineeLe)));

  const domainesProfil: DomaineProfil[] = listeDomaines.map((d, i) => {
    const mesures = referentiels[i].map((c) => niveauDe(c, niveaux)).filter((n): n is NiveauLu => !!n);
    const niveau = moyenne(mesures.map((m) => m.niveau));
    const initial = moyenne(mesures.map((m) => m.niveauInitial));
    return {
      id: d.id,
      code: d.code,
      nom: d.nom,
      couleur: d.couleur,
      icone: d.icone,
      niveau: niveau === null ? null : Math.round(niveau),
      niveauInitial: initial === null ? null : Math.round(initial),
      mesurees: mesures.length,
      total: referentiels[i].length,
    };
  });
  const mesures = domainesProfil.filter((d) => d.niveau !== null).map((d) => d.niveau as number);
  const note = noteGenerale(mesures);
  return {
    domaines: domainesProfil,
    noteGenerale: note,
    palier: palier(note),
    autoEvaluations: nbAutoEvaluations,
    aDesMesures: mesures.length > 0,
  };
}

/** Identité affichée sur la carte joueur. */
export async function identiteJoueur(utilisateurId: string) {
  const [u] = await db
    .select({
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      photoUrl: utilisateurs.photoUrl,
      xp: utilisateurs.xp,
      jeNom: juniorEntreprises.nom,
      jeSigle: juniorEntreprises.sigle,
    })
    .from(utilisateurs)
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .where(eq(utilisateurs.id, utilisateurId))
    .limit(1);
  if (!u) return null;
  return {
    nom: `${u.prenom} ${u.nom}`.trim(),
    photo: u.photoUrl,
    je: u.jeSigle ?? u.jeNom ?? null,
    xp: u.xp,
  };
}

/* ------------------------------------------------------------------ */
/* Zoom sur un domaine                                                 */
/* ------------------------------------------------------------------ */

export type PointHistorique = { niveau: number; variation: number; source: string; libelle: string | null; le: Date };

export type CompetenceDetail = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  pistes: string | null;
  niveau: number | null;
  niveauInitial: number | null;
  /** Points gagnés depuis le niveau initial (null si jamais mesurée). */
  progression: number | null;
  historique: PointHistorique[];
};

export type FormationRecommandee = {
  slug: string;
  titre: string;
  resume: string;
  dureeSec: number;
  niveau: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  imageUrl: string | null;
  fournisseur: string;
  reference: string;
  miniature: string | null;
  enCours: boolean;
  /** Compétences du membre que la formation travaille, les plus faibles d'abord. */
  cible: string[];
};

export type DetailDomaine = {
  domaine: DomaineProfil & { description: string | null };
  competences: CompetenceDetail[];
  /** Les compétences les plus faibles (jamais mesurées en tête). */
  prioritaires: CompetenceDetail[];
  formations: FormationRecommandee[];
  /** Le membre a-t-il terminé une auto-évaluation (initiale ou libre) du domaine ? */
  aEvalue: boolean;
};

async function details(utilisateurId: string, domaineIds?: string[]): Promise<DetailDomaine[]> {
  const membre = await lireMembre(utilisateurId);
  const { listeDomaines, referentiels, niveaux } = await socle(utilisateurId, membre?.jeId ?? null, domaineIds);
  if (!listeDomaines.length) return [];

  const toutes = referentiels.flat();
  const idsHistorique = [...new Set(toutes.flatMap((c) => (c.sourceId ? [c.id, c.sourceId] : [c.id])))];
  const ids = listeDomaines.map((d) => d.id);

  const [infos, historique, catalogue, terminees, evaluations] = await Promise.all([
    toutes.length
      ? db
          .select({ id: competences.id, description: competences.description, pistes: competences.pistes })
          .from(competences)
          .where(inArray(competences.id, toutes.map((c) => c.id)))
      : Promise.resolve([]),
    idsHistorique.length
      ? db
          .select({
            competenceId: historiqueNiveaux.competenceId,
            niveau: historiqueNiveaux.niveau,
            variation: historiqueNiveaux.variation,
            source: historiqueNiveaux.source,
            libelle: historiqueNiveaux.libelle,
            le: historiqueNiveaux.creeLe,
          })
          .from(historiqueNiveaux)
          .where(and(eq(historiqueNiveaux.utilisateurId, utilisateurId), inArray(historiqueNiveaux.competenceId, idsHistorique)))
          .orderBy(asc(historiqueNiveaux.creeLe))
      : Promise.resolve([]),
    db
      .select({
        id: formations.id,
        slug: formations.slug,
        titre: formations.titre,
        resume: formations.resume,
        dureeSec: formations.dureeSec,
        niveau: formations.niveau,
        imageUrl: formations.imageUrl,
        fournisseurVideo: formations.fournisseurVideo,
        referenceVideo: formations.referenceVideo,
        domaineId: formations.domaineId,
        publieLe: formations.publieLe,
      })
      .from(formations)
      .where(and(inArray(formations.domaineId, ids), eq(formations.statut, "PUBLIE"), eq(formations.visibleCatalogue, true)))
      .orderBy(desc(formations.publieLe)),
    db
      .select({ formationId: progressions.formationId, statut: progressions.statut })
      .from(progressions)
      .where(eq(progressions.utilisateurId, utilisateurId)),
    db
      .select({ domaineId: autoEvaluations.domaineId })
      .from(autoEvaluations)
      .where(
        and(
          eq(autoEvaluations.utilisateurId, utilisateurId),
          inArray(autoEvaluations.domaineId, ids),
          isNotNull(autoEvaluations.termineeLe),
          ne(autoEvaluations.contexte, "FINALE")
        )
      ),
  ]);

  const formationIds = catalogue.map((f) => f.id);
  const liens = formationIds.length
    ? await db
        .select({ formationId: formationsCompetences.formationId, competenceId: formationsCompetences.competenceId, poids: formationsCompetences.poids })
        .from(formationsCompetences)
        .where(inArray(formationsCompetences.formationId, formationIds))
    : [];

  const iInfos = new Map(infos.map((c) => [c.id, c]));
  const statuts = new Map(terminees.map((p) => [p.formationId, p.statut]));
  const evalues = new Set(evaluations.map((e) => e.domaineId));

  return listeDomaines.map((d, i) => {
    const ref = referentiels[i];
    const comps: CompetenceDetail[] = ref.map((c) => {
      const n = niveauDe(c, niveaux);
      const info = iInfos.get(c.id);
      return {
        id: c.id,
        code: c.code,
        nom: c.nom,
        description: info?.description ?? null,
        pistes: info?.pistes?.trim() || null,
        niveau: n ? arrondi1(n.niveau) : null,
        niveauInitial: n ? arrondi1(n.niveauInitial) : null,
        progression: n ? progression(n.niveauInitial, n.niveau) : null,
        historique: historique
          .filter((h) => h.competenceId === c.id || (c.sourceId !== null && h.competenceId === c.sourceId))
          .map((h) => ({ niveau: arrondi1(h.niveau), variation: arrondi1(h.variation), source: h.source, libelle: h.libelle, le: h.le })),
      };
    });

    // Une formation vise des compétences communes ou locales : on les
    // ramène à la compétence effective du membre pour lire son niveau.
    const versEffective = new Map<string, CompetenceDetail>();
    ref.forEach((c, k) => {
      versEffective.set(c.id, comps[k]);
      if (c.sourceId) versEffective.set(c.sourceId, comps[k]);
    });

    const recommandees = catalogue
      .filter((f) => f.domaineId === d.id && statuts.get(f.id) !== "TERMINEE")
      .map((f) => {
        const visees = liens
          .filter((l) => l.formationId === f.id)
          .map((l) => ({ c: versEffective.get(l.competenceId), poids: l.poids }))
          .filter((x): x is { c: CompetenceDetail; poids: number } => !!x.c);
        // Faiblesse : 1 pour une compétence jamais mesurée, (99 − niveau)/99 sinon.
        const score = visees.reduce((s, v) => s + v.poids * (v.c.niveau === null ? 1 : (99 - v.c.niveau) / 99), 0);
        const cible = [...visees].sort((a, b) => (a.c.niveau ?? -1) - (b.c.niveau ?? -1)).map((v) => v.c.nom);
        return { f, score, cible: [...new Set(cible)] };
      })
      .sort((a, b) => b.score - a.score || (b.f.publieLe?.getTime() ?? 0) - (a.f.publieLe?.getTime() ?? 0))
      .slice(0, 6)
      .map(({ f, cible }) => ({
        slug: f.slug,
        titre: f.titre,
        resume: f.resume,
        dureeSec: f.dureeSec,
        niveau: f.niveau,
        imageUrl: f.imageUrl,
        fournisseur: f.fournisseurVideo,
        reference: f.referenceVideo,
        miniature: miniatureFormation(f),
        enCours: statuts.get(f.id) === "EN_COURS" || statuts.get(f.id) === "ENQUETE_REQUISE",
        cible,
      }));

    const mesures = comps.filter((c) => c.niveau !== null);
    const niveau = moyenne(mesures.map((c) => c.niveau as number));
    const initial = moyenne(mesures.map((c) => c.niveauInitial as number));
    return {
      domaine: {
        id: d.id,
        code: d.code,
        nom: d.nom,
        couleur: d.couleur,
        icone: d.icone,
        description: d.description,
        niveau: niveau === null ? null : Math.round(niveau),
        niveauInitial: initial === null ? null : Math.round(initial),
        mesurees: mesures.length,
        total: comps.length,
      },
      competences: comps,
      prioritaires: competencesPrioritaires(comps, 3),
      formations: recommandees,
      aEvalue: evalues.has(d.id),
    };
  });
}

/**
 * Zoom sur un domaine pour un membre : ses compétences (référentiel effectif
 * via son organisation) avec niveau, niveau initial, progression, pistes et historique ;
 * les pistes prioritaires ; et jusqu'à six formations recommandées (publiées,
 * au catalogue, du domaine, pas encore terminées), classées pour cibler ses
 * compétences les plus faibles. Null si le domaine n'existe pas.
 */
export async function detailDomaine(utilisateurId: string, domaineId: string): Promise<DetailDomaine | null> {
  const [d] = await details(utilisateurId, [domaineId]);
  return d ?? null;
}

/** Tous les domaines d'un coup (page « Mes compétences » : zoom instantané). */
export async function detailsDomaines(utilisateurId: string): Promise<DetailDomaine[]> {
  return details(utilisateurId);
}

/* ------------------------------------------------------------------ */
/* Formations externes                                                 */
/* ------------------------------------------------------------------ */

/** Auto-évaluation terminée ? (id d'une auto-évaluation → date de fin) */
async function finsAutoEvaluations(ids: (string | null)[]): Promise<Map<string, Date | null>> {
  const propres = ids.filter((x): x is string => !!x);
  if (!propres.length) return new Map();
  const r = await db
    .select({ id: autoEvaluations.id, termineeLe: autoEvaluations.termineeLe })
    .from(autoEvaluations)
    .where(inArray(autoEvaluations.id, propres));
  return new Map(r.map((x) => [x.id, x.termineeLe]));
}

export type ExterneAEvaluer = {
  id: string;
  titre: string;
  date: Date;
  domaine: string;
  couleur: string;
  initialeFaite: boolean;
  finaleFaite: boolean;
};

/** Formations externes OUVERTES du membre où une auto-évaluation manque encore. */
export async function formationsExternesAEvaluer(utilisateurId: string): Promise<ExterneAEvaluer[]> {
  const lignes = await db
    .select({
      id: formationsExternes.id,
      titre: formationsExternes.titre,
      date: formationsExternes.date,
      domaine: domaines.nom,
      couleur: domaines.couleur,
      initialeId: participationsExternes.autoEvalInitialeId,
      finaleId: participationsExternes.autoEvalFinaleId,
    })
    .from(participationsExternes)
    .innerJoin(formationsExternes, eq(formationsExternes.id, participationsExternes.formationExterneId))
    .innerJoin(domaines, eq(domaines.id, formationsExternes.domaineId))
    .where(and(eq(participationsExternes.utilisateurId, utilisateurId), eq(formationsExternes.statut, "OUVERTE")))
    .orderBy(asc(formationsExternes.date));
  const fins = await finsAutoEvaluations(lignes.flatMap((l) => [l.initialeId, l.finaleId]));
  return lignes
    .map((l) => ({
      id: l.id,
      titre: l.titre,
      date: l.date,
      domaine: l.domaine,
      couleur: l.couleur,
      initialeFaite: !!(l.initialeId && fins.get(l.initialeId)),
      finaleFaite: !!(l.finaleId && fins.get(l.finaleId)),
    }))
    .filter((l) => !l.initialeFaite || !l.finaleFaite);
}

export type GainExterne = {
  competenceId: string;
  nom: string;
  niveauAvant: number;
  niveauApres: number;
  gainApplique: number;
  gainEnAttente: number;
  consolide: boolean;
};

/**
 * Page « formation externe » d'un participant. Null si le membre n'y
 * participe pas (la page affiche alors un accès refusé).
 */
export async function participationExterne(utilisateurId: string, formationExterneId: string) {
  const [l] = await db
    .select({
      participationId: participationsExternes.id,
      initialeId: participationsExternes.autoEvalInitialeId,
      finaleId: participationsExternes.autoEvalFinaleId,
      calculeLe: participationsExternes.calculeLe,
      id: formationsExternes.id,
      titre: formationsExternes.titre,
      description: formationsExternes.description,
      formateurInterne: formationsExternes.formateurInterne,
      date: formationsExternes.date,
      dureeHeures: formationsExternes.dureeHeures,
      statut: formationsExternes.statut,
      domaineId: domaines.id,
      domaineCode: domaines.code,
      domaine: domaines.nom,
      couleur: domaines.couleur,
      icone: domaines.icone,
      jeNom: juniorEntreprises.nom,
      jeSigle: juniorEntreprises.sigle,
    })
    .from(participationsExternes)
    .innerJoin(formationsExternes, eq(formationsExternes.id, participationsExternes.formationExterneId))
    .innerJoin(domaines, eq(domaines.id, formationsExternes.domaineId))
    .innerJoin(juniorEntreprises, eq(juniorEntreprises.id, formationsExternes.jeId))
    .where(and(eq(participationsExternes.formationExterneId, formationExterneId), eq(participationsExternes.utilisateurId, utilisateurId)))
    .limit(1);
  if (!l) return null;

  const [visees, fins, gains] = await Promise.all([
    db
      .select({ id: competences.id, nom: competences.nom })
      .from(formationsExternesCompetences)
      .innerJoin(competences, eq(competences.id, formationsExternesCompetences.competenceId))
      .where(eq(formationsExternesCompetences.formationExterneId, formationExterneId))
      .orderBy(asc(competences.ordre), asc(competences.nom)),
    finsAutoEvaluations([l.initialeId, l.finaleId]),
    db
      .select({
        competenceId: gainsFormation.competenceId,
        nom: competences.nom,
        niveauAvant: gainsFormation.niveauAvant,
        gainApplique: gainsFormation.gainApplique,
        gainEnAttente: gainsFormation.gainEnAttente,
        consolideLe: gainsFormation.consolideLe,
      })
      .from(gainsFormation)
      .innerJoin(competences, eq(competences.id, gainsFormation.competenceId))
      .where(and(eq(gainsFormation.formationExterneId, formationExterneId), eq(gainsFormation.utilisateurId, utilisateurId)))
      .orderBy(asc(competences.ordre)),
  ]);

  return {
    participationId: l.participationId,
    formation: {
      id: l.id,
      titre: l.titre,
      description: l.description,
      formateurInterne: l.formateurInterne,
      date: l.date,
      dureeHeures: l.dureeHeures,
      statut: l.statut as "OUVERTE" | "CLOTUREE",
      je: l.jeSigle ?? l.jeNom,
      domaine: { id: l.domaineId, code: l.domaineCode, nom: l.domaine, couleur: l.couleur, icone: l.icone },
    },
    competences: visees,
    initiale: { faite: !!(l.initialeId && fins.get(l.initialeId)), le: l.initialeId ? (fins.get(l.initialeId) ?? null) : null },
    finale: { faite: !!(l.finaleId && fins.get(l.finaleId)), le: l.finaleId ? (fins.get(l.finaleId) ?? null) : null },
    gains: gains.map(
      (g): GainExterne => ({
        competenceId: g.competenceId,
        nom: g.nom,
        niveauAvant: arrondi1(g.niveauAvant),
        niveauApres: arrondi1(Math.min(99, Math.max(0, g.niveauAvant + g.gainApplique))),
        gainApplique: arrondi1(g.gainApplique),
        gainEnAttente: arrondi1(g.gainEnAttente),
        consolide: !!g.consolideLe,
      })
    ),
  };
}

export type ParticipationExterne = NonNullable<Awaited<ReturnType<typeof participationExterne>>>;

/* ------------------------------------------------------------------ */
/* Préparation d'une auto-évaluation                                   */
/* ------------------------------------------------------------------ */

export type PreparationAutoEvaluation = {
  domaine: { id: string; code: string; nom: string; couleur: string; icone: string };
  /** Contexte effectif (INITIALE devient LIBRE si le domaine a déjà été évalué). */
  contexte: ContexteAutoEvaluation;
  secondesParQuestion: number;
  questions: QuestionAutoEvaluation[];
  formation: { id: string; slug: string; titre: string } | null;
  externe: { id: string; titre: string; participationId: string } | null;
};

/**
 * Prépare une auto-évaluation : domaine, questions (référentiel effectif du
 * membre, ≤ 20 ; pour une formation externe, uniquement ses compétences
 * visées) et délai par question. Lève `ErreurMetier` si la demande n'a pas
 * de sens (domaine inconnu, formation externe dont le membre n'est pas
 * participant, déjà faite ou clôturée…). Sert à l'écran d'introduction ET à
 * l'action de démarrage : les deux voient exactement la même chose.
 */
export async function preparerAutoEvaluation(
  utilisateurId: string,
  demande: { domaineCode: string; contexte: ContexteAutoEvaluation; formationSlug?: string | null; formationExterneId?: string | null }
): Promise<PreparationAutoEvaluation> {
  const membre = await lireMembre(utilisateurId);
  if (!membre) throw new ErreurMetier("Compte introuvable.");
  const [d] = await db
    .select({ id: domaines.id, code: domaines.code, nom: domaines.nom, couleur: domaines.couleur, icone: domaines.icone })
    .from(domaines)
    .where(eq(domaines.code, demande.domaineCode))
    .limit(1);
  if (!d) throw new ErreurMetier("Ce domaine n'existe pas ou plus.");

  const p = await lireParametres();
  const secondesParQuestion = p["autoEvaluation.secondesParQuestion"];
  const referentiel = await referentielEffectif(d.id, membre.jeId);
  let contexte = demande.contexte;
  let formation: PreparationAutoEvaluation["formation"] = null;
  let externe: PreparationAutoEvaluation["externe"] = null;
  let retenues = referentiel;

  if (demande.formationExterneId) {
    const part = await participationExterne(utilisateurId, demande.formationExterneId);
    if (!part) throw new ErreurMetier("Vous ne participez pas à cette formation externe.");
    if (part.formation.domaine.id !== d.id) throw new ErreurMetier("Cette formation externe relève d'un autre domaine.");
    if (part.formation.statut !== "OUVERTE") throw new ErreurMetier("Cette formation externe est clôturée : ses mesures sont terminées.");
    if (contexte === "LIBRE") throw new ErreurMetier("Précisez s'il s'agit de l'auto-évaluation d'avant ou d'après la formation.");
    const etape = contexte === "FINALE" ? part.finale : part.initiale;
    if (etape.faite) {
      throw new ErreurMetier(
        contexte === "FINALE"
          ? "Vous avez déjà fait l'auto-évaluation d'après la formation."
          : "Vous avez déjà fait l'auto-évaluation d'avant la formation."
      );
    }
    // Uniquement les compétences visées par la formation — et seulement
    // celles que le moteur acceptera (référentiel effectif du membre).
    const visees = new Set(part.competences.map((c) => c.id));
    retenues = referentiel.filter((c) => visees.has(c.id));
    if (!retenues.length) {
      throw new ErreurMetier(
        "Les compétences de cette formation ne font plus partie du référentiel de votre organisation. Prévenez votre responsable RH."
      );
    }
    externe = { id: part.formation.id, titre: part.formation.titre, participationId: part.participationId };
  } else if (demande.formationSlug) {
    const [f] = await db
      .select({ id: formations.id, slug: formations.slug, titre: formations.titre, domaineId: formations.domaineId })
      .from(formations)
      .where(and(eq(formations.slug, demande.formationSlug), eq(formations.statut, "PUBLIE")))
      .limit(1);
    if (!f) throw new ErreurMetier("Cette formation n'est pas disponible.");
    if (f.domaineId !== d.id) throw new ErreurMetier("Cette formation relève d'un autre domaine.");
    formation = { id: f.id, slug: f.slug, titre: f.titre };
  }

  // Une seule auto-évaluation INITIALE par domaine : les suivantes sont libres.
  if (contexte === "INITIALE" && (await aEvalueDomaine(utilisateurId, d.id))) contexte = "LIBRE";

  return {
    domaine: d,
    contexte,
    secondesParQuestion,
    questions: retenues.slice(0, QUESTIONS_MAX).map((c) => ({
      competenceId: c.id,
      nom: c.nom,
      question: libelleQuestion(c.nom, c.question),
    })),
    formation,
    externe,
  };
}
