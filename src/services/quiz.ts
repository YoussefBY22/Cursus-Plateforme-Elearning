/**
 * Quiz intégrés et quiz final — logique pure, testée.
 *
 * Règles retenues (voir DECISIONS.md) :
 *  - un point de quiz intégré est **bloquant** : la lecture ne peut pas le
 *    dépasser tant qu'il n'a pas été soumis une fois. Le score ne bloque pas
 *    (on corrige et on explique) : le but est l'ancrage, pas la sanction ;
 *  - le quiz final doit atteindre un seuil (50 % par défaut, paramétrable),
 *    sinon on le repasse ;
 *  - pour le calcul des compétences, seule la **première tentative** compte :
 *    repasser un quiz jusqu'à 100 % ne gonfle pas le niveau.
 */

export type OptionQuestion = { id: string; texte: string; correcte: boolean };

export type QuestionQuiz = {
  id: string;
  type: "CHOIX_UNIQUE" | "CHOIX_MULTIPLE" | "VRAI_FAUX";
  enonce: string;
  options: OptionQuestion[];
  explication?: string | null;
  competenceId?: string | null;
};

export type Reponses = Record<string, string[]>;

export type ResultatQuestion = {
  questionId: string;
  correcte: boolean;
  /** Part de la question réussie, 0–1 (crédit partiel en choix multiple). */
  credit: number;
  bonnes: string[];
};

/**
 * Note une question.
 *
 * Choix multiple : crédit = (bonnes cochées − mauvaises cochées) / bonnes,
 * borné à 0. Cocher toutes les cases ne rapporte donc rien.
 */
export function noterQuestion(question: QuestionQuiz, choisies: string[] = []): ResultatQuestion {
  const bonnes = question.options.filter((o) => o.correcte).map((o) => o.id);
  const choix = new Set(choisies);

  if (question.type !== "CHOIX_MULTIPLE") {
    const correcte = choix.size === 1 && bonnes.includes([...choix][0]);
    return { questionId: question.id, correcte, credit: correcte ? 1 : 0, bonnes };
  }

  const justes = bonnes.filter((b) => choix.has(b)).length;
  const fausses = [...choix].filter((c) => !bonnes.includes(c)).length;
  const credit = bonnes.length ? Math.max(0, (justes - fausses) / bonnes.length) : 0;
  return {
    questionId: question.id,
    correcte: justes === bonnes.length && fausses === 0,
    credit,
    bonnes,
  };
}

export type ResultatQuiz = {
  score: number;
  bonnes: number;
  total: number;
  details: ResultatQuestion[];
};

export function noterQuiz(questions: QuestionQuiz[], reponses: Reponses): ResultatQuiz {
  const details = questions.map((q) => noterQuestion(q, reponses[q.id] ?? []));
  const total = questions.length;
  const somme = details.reduce((s, d) => s + d.credit, 0);
  return {
    score: total ? somme / total : 0,
    bonnes: details.filter((d) => d.correcte).length,
    total,
    details,
  };
}

/** Score par compétence (questions étiquetées), pour le calcul du niveau. */
export function scoresParCompetence(
  questions: QuestionQuiz[],
  reponses: Reponses
): Record<string, { credit: number; total: number }> {
  const parCompetence: Record<string, { credit: number; total: number }> = {};
  for (const q of questions) {
    if (!q.competenceId) continue;
    const r = noterQuestion(q, reponses[q.id] ?? []);
    const cumul = (parCompetence[q.competenceId] ??= { credit: 0, total: 0 });
    cumul.credit += r.credit;
    cumul.total += 1;
  }
  return parCompetence;
}

/* ------------------------------------------------------------------ */
/* Points de quiz sur la ligne de temps                                */
/* ------------------------------------------------------------------ */

export type PointTemporel = { id: string; tempsSec: number };

/**
 * Premier point de quiz non réalisé — la « barrière » de la lecture.
 * Tout ce qui est au-delà reste inaccessible.
 */
export function prochaineBarriere(
  points: PointTemporel[],
  realises: Set<string>
): PointTemporel | null {
  return (
    [...points]
      .sort((a, b) => a.tempsSec - b.tempsSec)
      .find((p) => !realises.has(p.id)) ?? null
  );
}

/**
 * Où la lecture a-t-elle le droit d'aller ? Une demande de saut au-delà de
 * la barrière est ramenée sur la barrière, qui déclenche alors son quiz.
 */
export function positionAutorisee(
  demandee: number,
  points: PointTemporel[],
  realises: Set<string>
): { position: number; quizId: string | null } {
  const barriere = prochaineBarriere(points, realises);
  if (barriere && demandee >= barriere.tempsSec) {
    return { position: barriere.tempsSec, quizId: barriere.id };
  }
  return { position: demandee, quizId: null };
}

/** Valide la liste des points d'une formation à l'enregistrement. */
export function verifierPoints(
  points: { tempsSec: number; nbQuestions: number }[],
  dureeSec: number
): string[] {
  const erreurs: string[] = [];
  const tries = [...points].sort((a, b) => a.tempsSec - b.tempsSec);
  tries.forEach((p, i) => {
    if (p.tempsSec <= 0 || p.tempsSec >= dureeSec) {
      erreurs.push(`Le point n° ${i + 1} doit se situer entre le début et la fin de la vidéo.`);
    }
    if (i > 0 && p.tempsSec - tries[i - 1].tempsSec < 30) {
      erreurs.push(`Les points n° ${i} et ${i + 1} sont à moins de 30 s l'un de l'autre.`);
    }
    if (p.nbQuestions < 1) erreurs.push(`Le point n° ${i + 1} n'a aucune question.`);
    if (p.nbQuestions > 10) erreurs.push(`Le point n° ${i + 1} dépasse 10 questions.`);
  });
  return erreurs;
}

export const MAX_QUESTIONS_FINAL = 50;

/**
 * Une question est-elle complète (énoncé, ≥ 2 options, au moins une bonne) ?
 * L'identifiant des options n'entre pas dans le contrôle : le studio peut
 * donc vérifier une question avant même de l'avoir enregistrée.
 */
export function questionValide(q: {
  enonce: string;
  type: QuestionQuiz["type"];
  options: readonly { id?: string; texte: string; correcte: boolean }[];
}): string | null {
  if (!q.enonce.trim()) return "Énoncé vide.";
  if (q.options.length < 2) return "Il faut au moins deux réponses.";
  if (q.options.some((o) => !o.texte.trim())) return "Une réponse est vide.";
  const bonnes = q.options.filter((o) => o.correcte).length;
  if (bonnes === 0) return "Aucune bonne réponse cochée.";
  if (q.type !== "CHOIX_MULTIPLE" && bonnes > 1) return "Une seule bonne réponse pour ce type.";
  return null;
}
