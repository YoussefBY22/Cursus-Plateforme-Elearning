/**
 * Fournisseurs vidéo — la partie déclarative (pure, isomorphe) de
 * l'abstraction `VideoProvider`.
 *
 * Le coût de stockage et de bande passante est le vrai risque budgétaire
 * d'une plateforme de formation : par défaut, les vidéos sont des YouTube
 * non répertoriées (gratuites, servies par Google). Les capsules courtes
 * peuvent être des fichiers servis par la plateforme ou un stockage objet.
 *
 * Ajouter un fournisseur (Vimeo, Cloudflare Stream, R2…) =
 *   1. un descripteur ici (normalisation de la référence, miniature) ;
 *   2. un pilote dans `pilotes.ts` (lecture, pause, position, vitesse).
 * Rien d'autre ne change : le lecteur, le suivi du visionnage et les quiz
 * ne parlent qu'à l'interface `ControleVideo`.
 */

export const FOURNISSEURS = ["YOUTUBE", "MP4"] as const;
export type CodeFournisseur = (typeof FOURNISSEURS)[number];

export type DescripteurFournisseur = {
  code: CodeFournisseur;
  libelle: string;
  aide: string;
  /** Référence canonique à stocker, ou null si la saisie est invalide. */
  normaliser(saisie: string): string | null;
  miniature(reference: string): string | null;
};

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

/** Accepte un identifiant ou toutes les formes d'URL YouTube courantes. */
export function idYoutube(saisie: string): string | null {
  const s = saisie.trim();
  if (ID_YOUTUBE.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const hote = url.hostname.replace(/^www\.|^m\./, "");
    if (hote === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return ID_YOUTUBE.test(id) ? id : null;
    }
    if (hote.endsWith("youtube.com") || hote.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && ID_YOUTUBE.test(v)) return v;
      const morceaux = url.pathname.split("/").filter(Boolean);
      const i = morceaux.findIndex((m) => ["embed", "shorts", "live", "v"].includes(m));
      if (i >= 0 && ID_YOUTUBE.test(morceaux[i + 1] ?? "")) return morceaux[i + 1];
    }
  } catch {
    return null;
  }
  return null;
}

/** Fichier vidéo : chemin local (/videos/…) ou URL https d'un stockage objet. */
export function referenceFichier(saisie: string): string | null {
  const s = saisie.trim();
  if (!/\.(mp4|webm)(\?.*)?$/i.test(s)) return null;
  if (s.startsWith("/") && !s.includes("..")) return s;
  try {
    const url = new URL(s);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const DESCRIPTEURS: Record<CodeFournisseur, DescripteurFournisseur> = {
  YOUTUBE: {
    code: "YOUTUBE",
    libelle: "YouTube (non répertoriée)",
    aide: "Collez le lien de la vidéo YouTube. Publiez-la en « non répertoriée » : elle reste invisible des recherches.",
    normaliser: idYoutube,
    miniature: (ref) => `https://i.ytimg.com/vi/${ref}/hqdefault.jpg`,
  },
  MP4: {
    code: "MP4",
    libelle: "Fichier vidéo",
    aide: "Chemin d'un fichier servi par la plateforme (/videos/…) ou lien https d'un stockage objet (R2, Supabase…). MP4 ou WebM.",
    normaliser: referenceFichier,
    miniature: () => null,
  },
};

export function estFournisseur(v: unknown): v is CodeFournisseur {
  return typeof v === "string" && (FOURNISSEURS as readonly string[]).includes(v);
}

/** Sources à proposer au navigateur pour un fichier : WebM d'abord, puis MP4. */
export function sourcesFichier(reference: string): { src: string; type: string }[] {
  const base = reference.replace(/\.(mp4|webm)(\?.*)?$/i, "");
  const local = reference.startsWith("/");
  if (!local) {
    const type = /\.webm/i.test(reference) ? "video/webm" : "video/mp4";
    return [{ src: reference, type }];
  }
  // Les capsules locales existent dans les deux formats : Chrome, Firefox et
  // Edge lisent le WebM libre ; Safari prend le MP4.
  return [
    { src: `${base}.webm`, type: "video/webm" },
    { src: `${base}.mp4`, type: "video/mp4" },
  ];
}
