/**
 * Échelle du rendu HTML des certificats — logique pure.
 *
 * Le PDF compte en millimètres et en points ; l'écran en pixels. Le rendu
 * HTML exprime tout en **unités de conteneur** (`cqw`) rapportées à la
 * largeur de la page : une miniature de 280 px et la page de vérification
 * en plein écran sortent du même balisage, sans mesure en JavaScript.
 * L'éditeur, qui a besoin de pixels pour suivre la souris, mesure l'échelle
 * avec un ResizeObserver (`pxParMm`).
 */
import type { Bloc, Canevas } from "../canevas/canevas";

/** Un point typographique vaut 25,4 / 72 ≈ 0,3528 mm. */
export const PT_EN_MM = 25.4 / 72;

/** Métriques verticales de Montserrat (table hhea / OS/2, en em). */
export const ASCENDANTE_MONTSERRAT = 0.968;
export const DESCENDANTE_MONTSERRAT = 0.251;
/** Le moteur PDF pose la première ligne de base à 0,85 em sous le haut du cadre utile. */
export const LIGNE_DE_BASE_PDF = 0.85;

/** Pixels par millimètre pour une page affichée sur `largeurPx` pixels. Nul si la mesure est inutilisable. */
export function pxParMm(largeurPx: number, largeurMm: number): number | null {
  if (!Number.isFinite(largeurPx) || !Number.isFinite(largeurMm) || largeurPx <= 0 || largeurMm <= 0) return null;
  return largeurPx / largeurMm;
}

/** Convertit une position écran (px, relative à la page) en millimètres. */
export function pxEnMm(px: number, echelle: number): number {
  return echelle > 0 ? px / echelle : 0;
}

function arrondi(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** `mm` exprimé en `cqw` d'un conteneur qui représente toute la largeur de la page. */
export function enCqw(mm: number, largeurCanevas: number): string {
  return `${arrondi((mm / largeurCanevas) * 100)}cqw`;
}

/** Taille de police : des points convertis en millimètres, puis en `cqw`. */
export function taillePoliceCqw(taillePt: number, largeurCanevas: number): string {
  return enCqw(taillePt * PT_EN_MM, largeurCanevas);
}

/** Cadre d'un bloc en pourcentages de la page (indépendant de la taille d'affichage). */
export function positionBloc(
  bloc: Pick<Bloc, "x" | "y" | "largeur" | "hauteur">,
  canevas: Pick<Canevas, "largeur" | "hauteur">
): { left: string; top: string; width: string; height: string } {
  const pct = (v: number, total: number) => `${arrondi((v / total) * 100)}%`;
  return {
    left: pct(bloc.x, canevas.largeur),
    top: pct(bloc.y, canevas.hauteur),
    width: pct(bloc.largeur, canevas.largeur),
    height: pct(bloc.hauteur, canevas.hauteur),
  };
}

/**
 * Décalage (en em, vers le haut) qui aligne la première ligne de base HTML
 * sur celle du PDF.
 *
 * Le navigateur centre le glyphe dans sa boîte de ligne : la ligne de base
 * tombe à demi-interlignage + ascendante. Le moteur PDF, lui, la pose à
 * 0,85 em sous le haut du cadre. Sans correction, le texte HTML descendrait
 * d'environ un dixième de corps — visible sur un titre en 34 pt.
 */
export function decalageLigneDeBase(interligne: number): number {
  const contenu = ASCENDANTE_MONTSERRAT + DESCENDANTE_MONTSERRAT;
  const baseHtml = (interligne - contenu) / 2 + ASCENDANTE_MONTSERRAT;
  return arrondi(baseHtml - LIGNE_DE_BASE_PDF);
}

/** Le QR code est toujours carré, centré dans son cadre (comme au rendu PDF). */
export function carreQr(bloc: Pick<Bloc, "x" | "y" | "largeur" | "hauteur">): {
  x: number;
  y: number;
  cote: number;
} {
  const cote = Math.min(bloc.largeur, bloc.hauteur);
  return { x: bloc.x + (bloc.largeur - cote) / 2, y: bloc.y + (bloc.hauteur - cote) / 2, cote };
}

/** Pas d'aimantation de l'éditeur, en millimètres. */
export const PAS_AIMANTATION = 0.5;

export function aimanter(valeur: number, pas: number = PAS_AIMANTATION): number {
  return Math.round(valeur / pas) * pas;
}
