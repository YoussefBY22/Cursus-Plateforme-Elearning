/**
 * Montée en compétences — la méthode standardisée, logique pure et testée.
 *
 * C'est le cœur du produit : la même fonction calcule le niveau d'un membre
 * après une formation Cursus **et** après une formation externe saisie
 * par le responsable RH d'une organisation. Les deux sont donc comparables.
 *
 * Échelle : 0 à 99, comme une note FIFA. L'auto-évaluation se fait de 1 à 10.
 *
 * ── La formule, en clair ──────────────────────────────────────────────
 *
 *  1. Niveau de départ L₀ : auto-évaluation initiale (v × 9,9), ou le niveau
 *     courant si le membre a déjà été mesuré sur la compétence.
 *
 *  2. Niveau observé O = moyenne pondérée des mesures disponibles :
 *       Q  quiz (1re tentative, questions de la compétence)   poids 0,50
 *       F  évaluation du membre par le formateur              poids 0,30
 *       S  réévaluation finale par le membre (1–10)           poids 0,20
 *     Une mesure absente est retirée et les poids restants renormalisés.
 *
 *  3. Écart Δ = O − L₀.
 *       Δ > 0 : gain = min(Δ × 0,6 , plafond 15)      (apprentissage progressif)
 *       Δ < 0 : gain = max(Δ × 0,25, −8)              (une mauvaise journée ne
 *                                                       détruit pas un acquis)
 *
 *  4. Le gain positif est appliqué à 80 % tout de suite ; les 20 % restants
 *     ne sont acquis qu'à l'évaluation à froid, si le membre déclare avoir
 *     mis en pratique (≥ 3/5). Sinon ils sont abandonnés.
 *
 * ── Garde-fous contre les gains artificiels ──────────────────────────
 *
 *  - S est plafonnée à (mesure objective + 20) : se surnoter ne paie pas ;
 *  - sans aucune mesure objective (ni quiz ni formateur), le plafond de gain
 *    est divisé par deux ;
 *  - seule la 1re tentative de chaque quiz compte ;
 *  - une même formation ne fait gagner qu'une fois (contrainte d'unicité) ;
 *  - rendement décroissant au sommet : le plafond fond quand L₀ approche 99.
 *
 * Toutes les pondérations sont paramétrables par le super admin
 * (`competences.ponderations`) ; ce fichier ne contient que les défauts.
 */

export const NIVEAU_MAX = 99;

export type Ponderations = {
  quiz: number;
  formateur: number;
  reevaluation: number;
  tauxApprentissage: number;
  tauxRecul: number;
  plafondGain: number;
  plafondRecul: number;
  partProvisoire: number;
  margeAutoEvaluation: number;
  seuilMiseEnPratique: number;
};

export const PONDERATIONS_DEFAUT: Ponderations = {
  quiz: 0.5,
  formateur: 0.3,
  reevaluation: 0.2,
  tauxApprentissage: 0.6,
  tauxRecul: 0.25,
  plafondGain: 15,
  plafondRecul: 8,
  partProvisoire: 0.8,
  margeAutoEvaluation: 20,
  seuilMiseEnPratique: 3,
};

const borner = (v: number, min = 0, max = NIVEAU_MAX) => Math.min(max, Math.max(min, v));
const arrondi1 = (v: number) => Math.round(v * 10) / 10;

/** Auto-évaluation 1–10 → 0–99. « Je ne connais pas » / temps écoulé → 0. */
export function autoEvaluationVersNiveau(valeur: number | null | undefined): number {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return 0;
  return arrondi1(borner(valeur, 0, 10) * 9.9);
}

/** Score 0–1 (quiz) → 0–99. */
export function scoreVersNiveau(score: number): number {
  return arrondi1(borner(score, 0, 1) * NIVEAU_MAX);
}

export type Mesures = {
  /** Score de quiz 0–1 (première tentative), si la formation en comporte. */
  quiz?: number | null;
  /** Évaluation du membre par le formateur, 1–10. */
  formateur?: number | null;
  /** Réévaluation finale du membre, 1–10 (null = « je ne connais pas »). */
  reevaluation?: number | null;
};

export type ResultatGain = {
  niveauAvant: number;
  niveauObserve: number;
  gainTotal: number;
  gainApplique: number;
  gainEnAttente: number;
  niveauApres: number;
  detail: {
    quiz: number | null;
    formateur: number | null;
    reevaluation: number | null;
    reevaluationPlafonnee: boolean;
    poids: { quiz: number; formateur: number; reevaluation: number };
    sansMesureObjective: boolean;
  };
};

/** Le calcul standardisé — utilisé pour Cursus comme pour l'externe. */
export function calculerGain(
  niveauAvant: number,
  mesures: Mesures,
  p: Ponderations = PONDERATIONS_DEFAUT
): ResultatGain {
  const L0 = borner(niveauAvant);
  const Q = mesures.quiz !== null && mesures.quiz !== undefined ? scoreVersNiveau(mesures.quiz) : null;
  const F =
    mesures.formateur !== null && mesures.formateur !== undefined
      ? autoEvaluationVersNiveau(mesures.formateur)
      : null;
  const Sbrut =
    mesures.reevaluation !== undefined ? autoEvaluationVersNiveau(mesures.reevaluation) : null;

  // Garde-fou n° 1 : la réévaluation ne peut pas dépasser l'objectif + marge.
  const objectif = Q ?? F;
  let S = Sbrut;
  let reevaluationPlafonnee = false;
  if (S !== null && objectif !== null && S > objectif + p.margeAutoEvaluation) {
    S = borner(objectif + p.margeAutoEvaluation);
    reevaluationPlafonnee = true;
  }

  const poids = {
    quiz: Q !== null ? p.quiz : 0,
    formateur: F !== null ? p.formateur : 0,
    reevaluation: S !== null ? p.reevaluation : 0,
  };
  const somme = poids.quiz + poids.formateur + poids.reevaluation;
  const sansMesureObjective = Q === null && F === null;

  if (somme === 0) {
    return {
      niveauAvant: L0,
      niveauObserve: L0,
      gainTotal: 0,
      gainApplique: 0,
      gainEnAttente: 0,
      niveauApres: L0,
      detail: { quiz: Q, formateur: F, reevaluation: S, reevaluationPlafonnee, poids, sansMesureObjective },
    };
  }

  const O =
    ((Q ?? 0) * poids.quiz + (F ?? 0) * poids.formateur + (S ?? 0) * poids.reevaluation) / somme;
  const delta = O - L0;

  // Garde-fou n° 2 et rendement décroissant.
  let plafond = p.plafondGain * (1 - (L0 / NIVEAU_MAX) * 0.5);
  if (sansMesureObjective) plafond /= 2;

  let gain: number;
  if (delta >= 0) gain = Math.min(delta * p.tauxApprentissage, plafond);
  else gain = Math.max(delta * p.tauxRecul, -p.plafondRecul);
  gain = Math.min(gain, NIVEAU_MAX - L0);

  const gainApplique = gain > 0 ? gain * p.partProvisoire : gain;
  const gainEnAttente = gain > 0 ? gain - gainApplique : 0;

  return {
    niveauAvant: arrondi1(L0),
    niveauObserve: arrondi1(O),
    gainTotal: arrondi1(gain),
    gainApplique: arrondi1(gainApplique),
    gainEnAttente: arrondi1(gainEnAttente),
    niveauApres: arrondi1(borner(L0 + gainApplique)),
    detail: {
      quiz: Q,
      formateur: F,
      reevaluation: S,
      reevaluationPlafonnee,
      poids: {
        quiz: arrondi1((poids.quiz / somme) * 100) / 100,
        formateur: arrondi1((poids.formateur / somme) * 100) / 100,
        reevaluation: arrondi1((poids.reevaluation / somme) * 100) / 100,
      },
      sansMesureObjective,
    },
  };
}

/**
 * Consolidation à froid : la part provisoire est acquise si la mise en
 * pratique déclarée atteint le seuil, sinon elle est abandonnée.
 */
export function consolider(
  gainEnAttente: number,
  miseEnPratique: number,
  p: Ponderations = PONDERATIONS_DEFAUT
): number {
  if (gainEnAttente <= 0) return 0;
  return miseEnPratique >= p.seuilMiseEnPratique ? arrondi1(gainEnAttente) : 0;
}

/* ------------------------------------------------------------------ */
/* Agrégats pour le radar                                               */
/* ------------------------------------------------------------------ */

export type NiveauCompetenceSimple = { competenceId: string; domaineId: string; niveau: number };

/** Niveau d'un domaine = moyenne des compétences mesurées (null si aucune). */
export function niveauxParDomaine(
  niveaux: NiveauCompetenceSimple[]
): Record<string, { niveau: number; mesurees: number }> {
  const acc: Record<string, { somme: number; n: number }> = {};
  for (const n of niveaux) {
    const a = (acc[n.domaineId] ??= { somme: 0, n: 0 });
    a.somme += n.niveau;
    a.n += 1;
  }
  return Object.fromEntries(
    Object.entries(acc).map(([d, { somme, n }]) => [d, { niveau: Math.round(somme / n), mesurees: n }])
  );
}

/**
 * Note générale « OVR » : moyenne des domaines mesurés, légèrement tirée
 * vers les meilleurs (comme un profil de joueur, on valorise les points forts).
 */
export function noteGenerale(niveauxDomaines: number[]): number {
  if (!niveauxDomaines.length) return 0;
  const tries = [...niveauxDomaines].sort((a, b) => b - a);
  const poids = tries.map((_, i) => 1 / (1 + i * 0.35));
  const somme = poids.reduce((s, w) => s + w, 0);
  return Math.round(tries.reduce((s, v, i) => s + v * poids[i], 0) / somme);
}

/** Palier lisible d'un niveau 0–99. */
export function palier(niveau: number): { code: string; libelle: string } {
  if (niveau >= 85) return { code: "EXPERT", libelle: "Expert" };
  if (niveau >= 70) return { code: "CONFIRME", libelle: "Confirmé" };
  if (niveau >= 50) return { code: "OPERATIONNEL", libelle: "Opérationnel" };
  if (niveau >= 30) return { code: "INITIE", libelle: "Initié" };
  if (niveau > 0) return { code: "DECOUVERTE", libelle: "Découverte" };
  return { code: "NON_EVALUE", libelle: "À découvrir" };
}

/** Progression depuis le niveau initial, en points. */
export function progression(niveauInitial: number, niveau: number): number {
  return arrondi1(niveau - niveauInitial);
}

/**
 * Pistes d'amélioration : les compétences du domaine les plus faibles
 * d'abord, celles jamais mesurées en tête.
 */
export function competencesPrioritaires<T extends { niveau: number | null }>(liste: T[], n = 3): T[] {
  return [...liste]
    .sort((a, b) => (a.niveau ?? -1) - (b.niveau ?? -1))
    .slice(0, n);
}
