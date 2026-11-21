/**
 * Charte graphique d'un document — logique pure, testée.
 *
 * Le moteur de rendu portait la charte en dur : bordeaux `#8e172c`, nom de la
 * organisation, slogan, mentions de pied. Changer une couleur demandait de toucher au
 * code, ce qu'une organisation ne peut évidemment pas faire à chaque
 * refonte de son identité — et ce que le mandat suivant ne saura pas faire du
 * tout.
 *
 * La charte devient donc une donnée : un administrateur la compose, la
 * voit rendue sur un document d'exemple, et l'affecte aux familles de pièces
 * qu'elle habille. Les gabarits, eux, ne changent pas : ils décrivent du
 * contenu, jamais une couleur.
 *
 * Ce qui reste hors de portée, volontairement : la **référence** et la
 * numérotation. Elles ne se personnalisent pas — c'est la piste d'audit.
 */

export type CouleurRvb = { r: number; g: number; b: number };

export type ChartePdf = {
  /** Raison sociale affichée dans le bandeau. */
  nomEmetteur: string;
  slogan?: string;
  /** Lignes du pied de page : adresse, matricule fiscal, contact… */
  mentions?: string[];
  /** Aplat du bandeau, titres, totaux et traits de séparation. */
  couleurPrimaire: string;
  /** Texte courant du corps. */
  couleurTexte: string;
  /** Texte secondaire : libellés, mentions, pied de page. */
  couleurSecondaire: string;
  /** Texte posé sur l'aplat du bandeau. */
  couleurSurPrimaire: string;
  /** Hauteur du bandeau haut, en points. */
  hauteurBandeau: number;
  afficherSlogan: boolean;
  /** Barre colorée en bas de page, en écho au bandeau haut. */
  bandeauPied: boolean;
  /** « Document produit par Cursus » au centre du pied. */
  afficherMention: boolean;
  /** Logo du bandeau, déjà décodé. PNG ou JPEG. */
  logo?: { octets: Uint8Array; type: "png" | "jpeg" };
  /** Remplace le titre du gabarit quand l'organisation emploie un autre mot. */
  titre?: string;
};

/**
 * La charte livrée par défaut — celle qui était en dur jusqu'ici. Elle reste
 * le repli : sans charte enregistrée, les documents sortent exactement comme
 * avant.
 */
export const CHARTE_DEFAUT: ChartePdf = {
  nomEmetteur: "CURSUS",
  slogan: "Apprendre, mesurer, progresser",
  couleurPrimaire: "#0f1226",
  couleurTexte: "#102a30",
  couleurSecondaire: "#6b6b6b",
  couleurSurPrimaire: "#ffffff",
  hauteurBandeau: 46,
  afficherSlogan: true,
  bandeauPied: false,
  afficherMention: true,
};

/** Bornes du bandeau : au-delà, le titre du document passe sous la page. */
export const HAUTEUR_BANDEAU = { min: 28, max: 90 };

const HEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** `#8e172c` → composantes 0–1 attendues par pdf-lib. Tolère la forme courte. */
export function hexVersRvb(hex: string, repli = "#000000"): CouleurRvb {
  const valide = HEX.test(hex.trim()) ? hex.trim() : repli;
  let corps = valide.replace("#", "");
  if (corps.length === 3) {
    corps = corps
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return {
    r: parseInt(corps.slice(0, 2), 16) / 255,
    g: parseInt(corps.slice(2, 4), 16) / 255,
    b: parseInt(corps.slice(4, 6), 16) / 255,
  };
}

export function estCouleurValide(hex: string): boolean {
  return HEX.test(hex.trim());
}

/**
 * Luminance perçue (Rec. 709). Sert à décider si un texte posé sur un aplat
 * doit être clair ou sombre — un bandeau jaune avec du texte blanc est
 * illisible, et personne ne pense à le corriger à la main.
 */
export function luminance(hex: string): number {
  const { r, g, b } = hexVersRvb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texte lisible sur un aplat donné : blanc sur foncé, noir sur clair. */
export function texteLisibleSur(hex: string): string {
  return luminance(hex) > 0.55 ? "#1a1a1a" : "#ffffff";
}

/**
 * Complète une charte partielle venue de la base. Chaque champ absent
 * retombe sur le défaut : une charte à moitié remplie doit produire un
 * document présentable, pas un document blanc.
 */
export function completerCharte(
  partielle: Partial<ChartePdf> | null | undefined
): ChartePdf {
  const base = { ...CHARTE_DEFAUT, ...(partielle ?? {}) };
  const primaire = estCouleurValide(base.couleurPrimaire)
    ? base.couleurPrimaire
    : CHARTE_DEFAUT.couleurPrimaire;

  return {
    ...base,
    couleurPrimaire: primaire,
    couleurTexte: estCouleurValide(base.couleurTexte)
      ? base.couleurTexte
      : CHARTE_DEFAUT.couleurTexte,
    couleurSecondaire: estCouleurValide(base.couleurSecondaire)
      ? base.couleurSecondaire
      : CHARTE_DEFAUT.couleurSecondaire,
    // Sans choix explicite, on déduit la couleur du texte du bandeau plutôt
    // que d'imposer du blanc sur un aplat clair.
    couleurSurPrimaire: estCouleurValide(base.couleurSurPrimaire)
      ? base.couleurSurPrimaire
      : texteLisibleSur(primaire),
    hauteurBandeau: Math.min(
      HAUTEUR_BANDEAU.max,
      Math.max(HAUTEUR_BANDEAU.min, base.hauteurBandeau)
    ),
    mentions: (base.mentions ?? []).filter((m) => m.trim().length > 0),
  };
}

/**
 * Charte à retenir pour un modèle donné.
 *
 * Une charte déclare les familles qu'elle habille ; celle marquée par défaut
 * ramasse le reste. La plus spécifique gagne — sans quoi affecter une charte
 * aux seules factures serait sans effet dès qu'une charte par défaut existe.
 */
export function charteApplicable<T extends { modeles: string[]; parDefaut: boolean }>(
  chartes: T[],
  modele: string
): T | null {
  return (
    chartes.find((c) => c.modeles.includes(modele)) ??
    chartes.find((c) => c.parDefaut) ??
    null
  );
}
