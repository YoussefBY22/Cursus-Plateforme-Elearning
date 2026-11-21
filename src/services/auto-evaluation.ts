/**
 * Auto-évaluation chronométrée — logique pure et testée (côté client comme
 * côté serveur). Le serveur garde le dernier mot sur les délais
 * (`terminerAutoEvaluation`) ; ces fonctions servent l'interface.
 */

import { autoEvaluationVersNiveau } from "@/services/competences";

export const CONTEXTES = ["INITIALE", "LIBRE", "FINALE"] as const;
export type ContexteAutoEvaluation = (typeof CONTEXTES)[number];

/** Nombre maximal de questions d'un questionnaire. */
export const QUESTIONS_MAX = 20;

export type QuestionAutoEvaluation = { competenceId: string; nom: string; question: string };

/** Réponse envoyée au serveur (même forme que `ReponseSaisie` du moteur). */
export type ReponseAutoEvaluation = { competenceId: string; valeur: number | null; inconnu: boolean; dureeMs: number };

export type DemarrageAutoEvaluation = {
  id: string;
  contexte: ContexteAutoEvaluation;
  secondesParQuestion: number;
  questions: QuestionAutoEvaluation[];
};

export type ResultatCompetence = {
  competenceId: string;
  nom: string;
  /** Réponse retenue par le serveur (1–10), null si inconnue ou temps écoulé. */
  valeur: number | null;
  inconnu: boolean;
  expire: boolean;
  /** Niveau déclaré converti en 0–99 (null si temps écoulé). */
  niveauDeclare: number | null;
  /** Niveau mesuré de la compétence après l'envoi (null si jamais mesurée). */
  niveauActuel: number | null;
  /** Vrai si cette auto-évaluation a fixé le niveau de départ. */
  niveauFixe: boolean;
};

export type FinAutoEvaluation = { contexte: ContexteAutoEvaluation; resultats: ResultatCompetence[] };

/** Contexte lu dans l'URL ; tout le reste vaut LIBRE. */
export function lireContexte(v: unknown): ContexteAutoEvaluation {
  return typeof v === "string" && (CONTEXTES as readonly string[]).includes(v) ? (v as ContexteAutoEvaluation) : "LIBRE";
}

/**
 * Chemin de retour sûr : uniquement un chemin relatif à l'application
 * (commence par « / », pas par « // » ni « /\ »), sans caractère de contrôle.
 * Tout le reste est refusé (redirection ouverte).
 */
export function cheminRetourSur(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) return null;
  if (s.length > 300 || /[\u0000-\u001f\u007f\\]/.test(s)) return null;
  return s;
}

/** Touche clavier → réponse : 1–9, 0 = 10, N = « Je ne connais pas ». */
export function toucheVersReponse(touche: string): number | "inconnu" | null {
  if (/^[1-9]$/.test(touche)) return Number(touche);
  if (touche === "0") return 10;
  if (touche === "n" || touche === "N") return "inconnu";
  return null;
}

/** Libellé de la question : celui du référentiel, sinon la formule standard. */
export function libelleQuestion(nom: string, question?: string | null): string {
  const q = question?.trim();
  if (q) return q;
  const n = nom.trim();
  // « Négociation » → « négociation », mais « RSE » ou « SEO » restent tels quels.
  const minuscule = n.length > 1 && n[1] === n[1].toLowerCase() ? n[0].toLowerCase() + n.slice(1) : n;
  return `De 1 à 10, comment qualifiez-vous votre compétence en ${minuscule} ?`;
}

/** Part du temps restant (1 → 0). */
export function fractionRestante(ecouleMs: number, delaiMs: number): number {
  if (delaiMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - ecouleMs / delaiMs));
}

/** Secondes restantes affichées (arrondi supérieur : « 1 » jusqu'au bout). */
export function secondesRestantes(ecouleMs: number, delaiMs: number): number {
  return Math.max(0, Math.ceil((delaiMs - ecouleMs) / 1000));
}

/** Durée maximale du questionnaire, en minutes arrondies (pour l'introduction). */
export function dureeMaxMinutes(nbQuestions: number, secondesParQuestion: number): number {
  return Math.max(1, Math.ceil((nbQuestions * secondesParQuestion) / 60));
}

/** Réponse comptée « temps écoulé ». */
export function reponseExpiree(competenceId: string, delaiMs: number): ReponseAutoEvaluation {
  return { competenceId, valeur: null, inconnu: false, dureeMs: Math.round(delaiMs) };
}

/** Niveau déclaré 0–99 d'une réponse (null si le temps est écoulé). */
export function niveauDeclare(r: { valeur: number | null; inconnu: boolean; expire: boolean }): number | null {
  if (r.expire) return null;
  return autoEvaluationVersNiveau(r.inconnu ? 0 : r.valeur);
}

/** Bilan d'un questionnaire : réponses données, « je ne connais pas », temps écoulés. */
export function bilanReponses(reponses: readonly { valeur: number | null; inconnu: boolean; expire: boolean }[]) {
  return {
    repondues: reponses.filter((r) => !r.expire && !r.inconnu && r.valeur !== null).length,
    inconnues: reponses.filter((r) => r.inconnu).length,
    expirees: reponses.filter((r) => r.expire).length,
  };
}

/** Étape d'une formation externe à laquelle une auto-évaluation se rattache. */
export function etapeExterne(contexte: ContexteAutoEvaluation): "initiale" | "finale" {
  return contexte === "FINALE" ? "finale" : "initiale";
}
