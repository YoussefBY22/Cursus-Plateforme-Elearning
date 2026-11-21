/**
 * Identité commune des certificats de la plateforme — logique pure.
 *
 * Tous les certificats se ressemblent : on doit reconnaître d'un coup d'œil
 * qu'ils viennent de la plateforme. Le cadre central (double filet bleu nuit,
 * point d'accent, mention de vérification) est donc IMPOSÉ : il est dessiné
 * sous le canevas de chaque modèle et n'est pas modifiable dans l'éditeur.
 * Seule la bordure extérieure prend la couleur de la thématique
 * (marketing bleu, RSE vert…).
 */
import {
  A4_PAYSAGE,
  ENCADREMENT_DEFAUT,
  STYLE_TEXTE_DEFAUT,
  type Bloc,
  type Canevas,
} from "../canevas/canevas";

export const NUIT = "#0f1226";
export const ACCENT = "#4f46e5";

export function cadreCommun(couleurTheme: string): Bloc[] {
  const L = A4_PAYSAGE.largeur;
  const H = A4_PAYSAGE.hauteur;
  const v = { verrouille: true as const };
  return [
    {
      id: "cadre-fond",
      type: "RECTANGLE",
      x: 0,
      y: 0,
      largeur: L,
      hauteur: H,
      plan: -100,
      nom: "Bordure thématique",
      encadrement: { ...ENCADREMENT_DEFAUT, fond: couleurTheme },
      ...v,
    },
    {
      id: "cadre-page",
      type: "RECTANGLE",
      x: 7,
      y: 7,
      largeur: L - 14,
      hauteur: H - 14,
      plan: -99,
      nom: "Page",
      encadrement: { ...ENCADREMENT_DEFAUT, fond: "#ffffff" },
      ...v,
    },
    {
      id: "cadre-filet-ext",
      type: "RECTANGLE",
      x: 12,
      y: 12,
      largeur: L - 24,
      hauteur: H - 24,
      plan: -98,
      nom: "Filet extérieur",
      encadrement: { fond: "", bordure: NUIT, epaisseurBordure: 0.8 },
      ...v,
    },
    {
      id: "cadre-filet-int",
      type: "RECTANGLE",
      x: 14,
      y: 14,
      largeur: L - 28,
      hauteur: H - 28,
      plan: -97,
      nom: "Filet intérieur",
      encadrement: { fond: "", bordure: NUIT, epaisseurBordure: 0.25 },
      ...v,
    },
    {
      id: "cadre-point",
      type: "RECTANGLE",
      x: L / 2 - 3,
      y: 11,
      largeur: 6,
      hauteur: 6,
      plan: -96,
      nom: "Point de marque",
      encadrement: { ...ENCADREMENT_DEFAUT, fond: ACCENT },
      ...v,
    },
    {
      id: "cadre-mention",
      type: "TEXTE",
      x: 20,
      y: H - 22,
      largeur: L - 40,
      hauteur: 6,
      plan: -95,
      nom: "Mention de vérification",
      contenu:
        "Certificat délivré par Cursus · Authenticité vérifiable par QR code · N° {{numero}}",
      style: { ...STYLE_TEXTE_DEFAUT, taille: 6.5, couleur: "#5a5f80", alignement: "centre", alignementVertical: "milieu" },
      encadrement: { ...ENCADREMENT_DEFAUT },
      marge: 0.5,
      ...v,
    },
  ];
}

/** Champs proposés dans la palette de l'éditeur, avec un exemple lisible. */
export const CHAMPS_CERTIFICAT: { jeton: string; exemple: string }[] = [
  { jeton: "apprenant", exemple: "Yasmine Ben Ali" },
  { jeton: "parcours", exemple: "Pitcher avec impact" },
  { jeton: "intitule", exemple: "pour avoir suivi l'intégralité du parcours…" },
  { jeton: "domaine", exemple: "Développement commercial" },
  { jeton: "je", exemple: "Aurora Conseil" },
  { jeton: "dateObtention", exemple: "7 octobre 2026" },
  { jeton: "heures", exemple: "4 h 30" },
  { jeton: "numero", exemple: "CUR-2026-000042" },
  { jeton: "signataire1", exemple: "Direction" },
  { jeton: "signataire1Titre", exemple: "Directeur·rice" },
  { jeton: "signataire2", exemple: "Équipe pédagogique" },
  { jeton: "signataire2Titre", exemple: "Responsable pédagogique" },
];

export function donneesExemple(): Record<string, string> {
  return Object.fromEntries(CHAMPS_CERTIFICAT.map((c) => [c.jeton, c.exemple]));
}

const texte = (
  id: string,
  contenu: string,
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
  style: Partial<typeof STYLE_TEXTE_DEFAUT>,
  plan: number
): Bloc => ({
  id,
  type: "TEXTE",
  x,
  y,
  largeur,
  hauteur,
  plan,
  contenu,
  style: { ...STYLE_TEXTE_DEFAUT, alignement: "centre", alignementVertical: "milieu", couleur: NUIT, ...style },
  encadrement: { ...ENCADREMENT_DEFAUT },
  marge: 0.5,
});

/** Modèle de départ, éditable : tout ce qui n'est pas le cadre commun. */
export function canevasParDefaut(couleurTheme: string = ACCENT): Canevas {
  const L = A4_PAYSAGE.largeur;
  return {
    largeur: A4_PAYSAGE.largeur,
    hauteur: A4_PAYSAGE.hauteur,
    blocs: [
      texte("logo", "Cursus", 22, 22, 70, 10, { taille: 15, gras: true, alignement: "gauche" }, 1),
      texte("titre", "Certificat de réussite", 40, 44, L - 80, 18, { taille: 34, gras: true }, 2),
      {
        id: "trait-titre",
        type: "LIGNE",
        x: L / 2 - 20,
        y: 64,
        largeur: 40,
        hauteur: 3,
        plan: 3,
        orientation: "horizontale",
        couleur: couleurTheme,
        epaisseur: 1.2,
      },
      texte("decerne", "décerné à", 40, 72, L - 80, 8, { taille: 11, couleur: "#5a5f80", italique: true }, 4),
      texte("nom", "{{apprenant}}", 30, 81, L - 60, 18, { taille: 30, gras: true }, 5),
      texte("intitule", "{{intitule}}", 50, 101, L - 100, 16, { taille: 11, couleur: "#484d70", interligne: 1.35 }, 6),
      texte("parcours", "{{parcours}}", 40, 118, L - 80, 12, { taille: 17, gras: true, couleur: couleurTheme }, 7),
      texte("meta", "{{domaine}} · {{heures}} de formation · {{je}}", 40, 131, L - 80, 7, { taille: 9.5, couleur: "#5a5f80" }, 8),
      texte("date", "Délivré le {{dateObtention}}", 40, 139, L - 80, 7, { taille: 9.5, couleur: "#5a5f80" }, 9),
      {
        id: "sig1-trait",
        type: "LIGNE",
        x: 40,
        y: 166,
        largeur: 62,
        hauteur: 2,
        plan: 10,
        orientation: "horizontale",
        couleur: NUIT,
        epaisseur: 0.3,
      },
      texte("sig1", "{{signataire1}}\n{{signataire1Titre}}", 34, 168, 74, 11, { taille: 8.5, gras: false, interligne: 1.3 }, 11),
      {
        id: "sig2-trait",
        type: "LIGNE",
        x: L - 102,
        y: 166,
        largeur: 62,
        hauteur: 2,
        plan: 12,
        orientation: "horizontale",
        couleur: NUIT,
        epaisseur: 0.3,
      },
      texte("sig2", "{{signataire2}}\n{{signataire2Titre}}", L - 108, 168, 74, 11, { taille: 8.5, interligne: 1.3 }, 13),
      { id: "qr", type: "QRCODE", x: L / 2 - 12, y: 150, largeur: 24, hauteur: 24, plan: 14, champ: "lienVerification", couleur: NUIT },
    ],
  };
}

/** Intitulé par défaut, si le parcours n'en a pas défini. */
export function intituleParDefaut(): string {
  return "pour avoir suivi l'intégralité de ce parcours certifiant, réussi ses évaluations et démontré sa progression.";
}
