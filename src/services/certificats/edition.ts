/**
 * Opérations de l'éditeur de modèles de certificat — logique pure.
 */
import type { Bloc, Canevas } from "../canevas/canevas";
import { aimanter } from "./echelle";

/** Teintes proposées pour la bordure thématique d'un modèle. */
export const COULEURS_THEME: { hex: string; nom: string }[] = [
  { hex: "#4f46e5", nom: "Indigo Cursus" },
  { hex: "#2563EB", nom: "Bleu marketing" },
  { hex: "#12A150", nom: "Vert RSE" },
  { hex: "#0f1226", nom: "Encre" },
  { hex: "#C77C00", nom: "Ambre" },
  { hex: "#C2417A", nom: "Framboise" },
];

export const HEX_COULEUR = /^#[0-9a-fA-F]{6}$/;

function memeCouleur(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Change la couleur de thème d'un canevas : tout ce qui portait l'ancienne
 * teinte (filet sous le titre, nom du parcours…) prend la nouvelle. Les
 * autres couleurs, choisies à part, ne bougent pas.
 */
export function recolorer(canevas: Canevas, ancienne: string, nouvelle: string): Canevas {
  if (!HEX_COULEUR.test(ancienne) || !HEX_COULEUR.test(nouvelle) || memeCouleur(ancienne, nouvelle)) return canevas;
  const c = (v: string) => (v && memeCouleur(v, ancienne) ? nouvelle : v);
  return {
    ...canevas,
    blocs: canevas.blocs.map((b): Bloc => {
      switch (b.type) {
        case "TEXTE":
          return {
            ...b,
            style: { ...b.style, couleur: c(b.style.couleur) },
            encadrement: { ...b.encadrement, fond: c(b.encadrement.fond), bordure: c(b.encadrement.bordure) },
          };
        case "RECTANGLE":
          return { ...b, encadrement: { ...b.encadrement, fond: c(b.encadrement.fond), bordure: c(b.encadrement.bordure) } };
        case "LIGNE":
        case "QRCODE":
          return { ...b, couleur: c(b.couleur) };
        default:
          return b;
      }
    }),
  };
}

/** Centre un bloc horizontalement sur la page (les certificats sont symétriques). */
export function centrerHorizontalement<T extends Bloc>(bloc: T, canevas: Pick<Canevas, "largeur">): T {
  return { ...bloc, x: aimanter((canevas.largeur - bloc.largeur) / 2) };
}

/** Redimensionne un bloc à la souris ; le QR code reste carré. */
export function redimensionner<T extends Bloc>(origine: T, dx: number, dy: number, minimum = 3): T {
  if (origine.type === "QRCODE") {
    const cote = aimanter(Math.max(minimum * 3, Math.max(origine.largeur + dx, origine.hauteur + dy)));
    return { ...origine, largeur: cote, hauteur: cote };
  }
  return {
    ...origine,
    largeur: aimanter(Math.max(minimum, origine.largeur + dx)),
    hauteur: aimanter(Math.max(minimum, origine.hauteur + dy)),
  };
}

/** Le cadre commun n'est jamais enregistré dans un modèle : il est imposé au rendu. */
export function sansBlocsVerrouilles(canevas: Canevas): Canevas {
  return { ...canevas, blocs: canevas.blocs.filter((b) => !b.verrouille) };
}

/** Identifiants d'images employés par le canevas qui ne figurent pas parmi celles du modèle. */
export function imagesInconnues(canevas: Canevas, connues: readonly string[]): string[] {
  const ok = new Set(connues);
  return [
    ...new Set(
      canevas.blocs.filter((b) => b.type === "IMAGE" && !ok.has(b.fichierId)).map((b) => (b.type === "IMAGE" ? b.fichierId : ""))
    ),
  ];
}

/** Copie d'un bloc légèrement décalée, devant tout le reste. */
export function dupliquerBloc(bloc: Bloc, nouvelId: string, plan: number, canevas: Pick<Canevas, "largeur" | "hauteur">): Bloc {
  const x = Math.min(bloc.x + 5, canevas.largeur - bloc.largeur);
  const y = Math.min(bloc.y + 5, canevas.hauteur - bloc.hauteur);
  return { ...bloc, id: nouvelId, x: Math.max(0, x), y: Math.max(0, y), plan, verrouille: undefined };
}

/** Avertissements affichés dans l'éditeur, du plus grave au plus anodin. */
export function avertissementsModele(canevas: Canevas): string[] {
  const visibles = canevas.blocs.filter((b) => !b.masque);
  const avertissements: string[] = [];
  if (!visibles.some((b) => b.type === "QRCODE")) {
    avertissements.push("Aucun QR code : le certificat ne pourra pas être vérifié en le scannant.");
  }
  if (!visibles.some((b) => b.type === "TEXTE" && /\{\{\s*apprenant\s*\}\}/.test(b.contenu))) {
    avertissements.push("Le nom du titulaire {{apprenant}} n'apparaît nulle part.");
  }
  return avertissements;
}
