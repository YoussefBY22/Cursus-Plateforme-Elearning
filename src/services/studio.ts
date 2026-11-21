/**
 * Espace formateur — logique pure, testée.
 *
 * Un contenu se construit en plusieurs passes : on enregistre un brouillon
 * incomplet sans être bloqué, et c'est la *soumission* qui exige que tout
 * soit là. Ces fonctions disent ce qui manque encore, en une phrase par
 * manque, pour que l'écran l'affiche comme une liste à cocher plutôt que
 * comme un refus sec.
 */

import { MAX_QUESTIONS_FINAL, questionValide, verifierPoints } from "./quiz";

export const STATUTS_CONTENU = ["BROUILLON", "EN_VALIDATION", "PUBLIE", "REFUSE", "ARCHIVE"] as const;
export type StatutContenu = (typeof STATUTS_CONTENU)[number];

export const LIBELLES_STATUT: Record<StatutContenu, string> = {
  BROUILLON: "Brouillon",
  EN_VALIDATION: "En validation",
  PUBLIE: "Publiée",
  REFUSE: "À corriger",
  ARCHIVE: "Archivée",
};

/** Ton de pastille associé au statut (voir components/ui/pastille). */
export const TONS_STATUT: Record<StatutContenu, "neutre" | "primaire" | "succes" | "alerte" | "danger"> = {
  BROUILLON: "neutre",
  EN_VALIDATION: "alerte",
  PUBLIE: "succes",
  REFUSE: "danger",
  ARCHIVE: "neutre",
};

export function estStatutContenu(v: unknown): v is StatutContenu {
  return typeof v === "string" && (STATUTS_CONTENU as readonly string[]).includes(v);
}

/** Un contenu est-il modifiable par son auteur dans cet état ? */
export function modifiable(statut: StatutContenu): boolean {
  return statut !== "EN_VALIDATION" && statut !== "ARCHIVE";
}

export const RESUME_MIN = 40;
export const DESCRIPTION_MIN = 120;
export const OBJECTIFS_MIN = 2;
export const DUREE_MIN_SEC = 60;

export type FormationASoumettre = {
  titre: string;
  resume: string;
  description: string;
  objectifs: string[];
  referenceVideo: string;
  dureeSec: number;
  competences: { id: string }[];
  points: {
    type: "INTEGRE" | "FINAL";
    tempsSec: number | null;
    questions: { enonce: string; type: "CHOIX_UNIQUE" | "CHOIX_MULTIPLE" | "VRAI_FAUX"; options: { texte: string; correcte: boolean }[] }[];
  }[];
};

/**
 * Ce qui manque pour qu'une formation puisse partir en validation.
 * Liste vide = prête. L'ordre suit celui des onglets de l'éditeur.
 */
export function manquesFormation(f: FormationASoumettre): string[] {
  const m: string[] = [];

  if (f.titre.trim().length < 5) m.push("Donnez un titre d'au moins 5 caractères.");
  if (f.resume.trim().length < RESUME_MIN) m.push(`Le résumé fait moins de ${RESUME_MIN} caractères : c'est lui qui s'affiche dans le catalogue.`);
  if (f.description.trim().length < DESCRIPTION_MIN) m.push(`La description fait moins de ${DESCRIPTION_MIN} caractères.`);
  const objectifs = f.objectifs.filter((o) => o.trim().length > 0);
  if (objectifs.length < OBJECTIFS_MIN) m.push(`Annoncez au moins ${OBJECTIFS_MIN} objectifs d'apprentissage.`);

  if (!f.referenceVideo.trim()) m.push("Renseignez la vidéo de la formation.");
  if (f.dureeSec < DUREE_MIN_SEC) m.push("Indiquez la durée réelle de la vidéo (une minute au moins).");

  if (f.competences.length === 0) {
    m.push("Rattachez au moins une compétence : sans elle, la formation ne fait progresser personne.");
  }

  const finals = f.points.filter((p) => p.type === "FINAL");
  if (finals.length === 0) m.push("Ajoutez le quiz final : il conditionne la fin de la formation.");
  if (finals.length > 1) m.push("Il ne peut y avoir qu'un seul quiz final.");

  const integres = f.points.filter((p) => p.type === "INTEGRE");
  if (f.dureeSec >= DUREE_MIN_SEC) {
    m.push(
      ...verifierPoints(
        integres.map((p) => ({ tempsSec: p.tempsSec ?? 0, nbQuestions: p.questions.length })),
        f.dureeSec
      )
    );
  }

  for (const p of finals) {
    if (p.questions.length === 0) m.push("Le quiz final n'a aucune question.");
    if (p.questions.length > MAX_QUESTIONS_FINAL) m.push(`Le quiz final dépasse ${MAX_QUESTIONS_FINAL} questions.`);
  }

  // Une question bancale bloque la publication : le signaler par son numéro
  // évite de chercher à l'aveugle dans un long quiz.
  f.points.forEach((p, i) => {
    const ou = p.type === "FINAL" ? "quiz final" : `point n° ${i + 1}`;
    p.questions.forEach((q, j) => {
      const souci = questionValide(q);
      if (souci) m.push(`${ou}, question ${j + 1} : ${souci}`);
    });
  });

  return m;
}

export type ParcoursASoumettre = {
  titre: string;
  description: string;
  etapes: { formationStatut: StatutContenu }[];
};

export const ETAPES_MIN = 2;

/** Ce qui manque pour qu'un parcours puisse partir en validation. */
export function manquesParcours(p: ParcoursASoumettre): string[] {
  const m: string[] = [];
  if (p.titre.trim().length < 5) m.push("Donnez un titre d'au moins 5 caractères.");
  if (p.description.trim().length < DESCRIPTION_MIN) m.push(`La description fait moins de ${DESCRIPTION_MIN} caractères.`);
  if (p.etapes.length < ETAPES_MIN) m.push(`Un parcours compte au moins ${ETAPES_MIN} étapes — en dessous, publiez une formation seule.`);
  const nonPubliees = p.etapes.filter((e) => e.formationStatut !== "PUBLIE").length;
  if (nonPubliees > 0) {
    m.push(
      nonPubliees === 1
        ? "Une étape renvoie à une formation qui n'est pas publiée."
        : `${nonPubliees} étapes renvoient à des formations qui ne sont pas publiées.`
    );
  }
  return m;
}

/** Position d'un marqueur de quiz sur la frise de la vidéo, en pourcentage. */
export function positionMarqueur(tempsSec: number, dureeSec: number): number {
  if (dureeSec <= 0) return 0;
  return Math.min(100, Math.max(0, (tempsSec / dureeSec) * 100));
}

/** « 1:05:30 » / « 4:32 » → secondes. Null si la saisie n'est pas un temps. */
export function lireTemps(saisie: string): number | null {
  const s = saisie.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const morceaux = s.split(":");
  if (morceaux.length < 2 || morceaux.length > 3) return null;
  if (!morceaux.every((p) => /^\d{1,3}$/.test(p.trim()))) return null;
  const n = morceaux.map((p) => Number(p.trim()));
  const [h, mi, se] = n.length === 3 ? n : [0, n[0], n[1]];
  if (mi > 59 || se > 59) return null;
  return h * 3600 + mi * 60 + se;
}

/** Secondes → « 4:32 » ou « 1:05:30 ». */
export function ecrireTemps(secondes: number): string {
  const t = Math.max(0, Math.round(secondes));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const deux = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${deux(m)}:${deux(s)}` : `${m}:${deux(s)}`;
}
