import { PDFDocument, PDFImage, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { hexVersRvb } from "./charte";
import { embarquerPolices, type Polices } from "./polices";
import { replier, tronquer } from "./rendu";
import {
  largeursColonnes,
  mmEnPoints,
  nomDuBloc,
  ordonneePdf,
  parPlan,
  remplirJetons,
  valeurDuChemin,
  type Bloc,
  type BlocImage,
  type BlocLigne,
  type BlocQr,
  type BlocTableau,
  type BlocTexte,
  type Canevas,
  type Encadrement,
  type StyleTexte,
} from "./canevas";

/**
 * Rendu d'un canevas en PDF.
 *
 * Pendant du moteur en flux (`rendu.ts`), pour les documents dont la mise en
 * page est **choisie** plutôt que déduite : reçus, factures, bons de commande.
 * Les deux coexistent et partagent ce qui peut l'être — les polices, le
 * repliage du texte, la lecture des couleurs.
 *
 * Le canevas décrit des millimètres comptés depuis le haut à gauche, le PDF
 * des points comptés depuis le bas : toute la conversion est ici, et nulle
 * part ailleurs.
 */

export type ImagesDisponibles = Map<string, { octets: Uint8Array; type: "png" | "jpeg" }>;

export type OptionsRendu = {
  /** Blocs imposés dessinés sous le canevas (cadre commun des certificats). */
  fond?: Bloc[];
  /** Valeurs des jetons `{{champ}}`. */
  donnees?: Record<string, unknown>;
  /** Fichiers des blocs image, déjà lus depuis GridFS. */
  images?: ImagesDisponibles;
  /** Texte en diagonale — « Aperçu », « Annulé », « Duplicata ». */
  filigrane?: string;
  titre?: string;
};

function couleur(hex: string) {
  const { r, g, b } = hexVersRvb(hex);
  return rgb(r, g, b);
}

function policeDe(polices: Polices, style: StyleTexte): PDFFont {
  if (style.gras) return polices.grasse;
  if (style.italique) return polices.italique;
  return polices.normale;
}

/** Aplat et filet d'un bloc. Rien n'est dessiné si la charte ne le demande pas. */
function dessinerEncadrement(
  page: PDFPage,
  cadre: { x: number; y: number; largeur: number; hauteur: number },
  encadrement: Encadrement,
  hauteurPage: number
) {
  const aFond = Boolean(encadrement.fond?.trim());
  const aBordure =
    Boolean(encadrement.bordure?.trim()) && encadrement.epaisseurBordure > 0;
  if (!aFond && !aBordure) return;

  page.drawRectangle({
    x: mmEnPoints(cadre.x),
    y: ordonneePdf(cadre.y, cadre.hauteur, hauteurPage),
    width: mmEnPoints(cadre.largeur),
    height: mmEnPoints(cadre.hauteur),
    ...(aFond ? { color: couleur(encadrement.fond) } : {}),
    ...(aBordure
      ? {
          borderColor: couleur(encadrement.bordure),
          borderWidth: mmEnPoints(encadrement.epaisseurBordure),
        }
      : {}),
  });
}

/**
 * Écrit un texte dans un cadre, replié, aligné dans les deux sens.
 *
 * Le texte qui déborde par le bas est coupé plutôt que de courir sur le reste
 * du document : sur une pièce comptable, mieux vaut un libellé tronqué qu'un
 * paragraphe qui recouvre un montant.
 */
function dessinerTexte(
  page: PDFPage,
  polices: Polices,
  cadre: { x: number; y: number; largeur: number; hauteur: number },
  texte: string,
  style: StyleTexte,
  marge: number,
  hauteurPage: number
) {
  const contenu = style.majuscules ? texte.toLocaleUpperCase("fr-FR") : texte;
  if (!contenu.trim()) return;

  const police = policeDe(polices, style);
  const largeurUtile = mmEnPoints(Math.max(1, cadre.largeur - marge * 2));
  const hauteurUtile = mmEnPoints(Math.max(1, cadre.hauteur - marge * 2));
  const interligne = style.taille * style.interligne;

  const lignes = replier(contenu, police, style.taille, largeurUtile);
  const maxLignes = Math.max(1, Math.floor(hauteurUtile / interligne));
  const visibles = lignes.slice(0, maxLignes);
  if (lignes.length > maxLignes && visibles.length) {
    visibles[visibles.length - 1] = tronquer(
      `${visibles[visibles.length - 1]}…`,
      police,
      style.taille,
      largeurUtile
    );
  }

  const hauteurTexte = visibles.length * interligne;
  const hautCadre = ordonneePdf(cadre.y, cadre.hauteur, hauteurPage) + mmEnPoints(cadre.hauteur);
  const margePt = mmEnPoints(marge);

  // Décalage vertical selon l'alignement demandé, puis montée de la ligne de
  // base : pdf-lib pose le texte sur sa base, pas sur son sommet.
  const vide = hauteurUtile - hauteurTexte;
  const decalage =
    style.alignementVertical === "milieu"
      ? vide / 2
      : style.alignementVertical === "bas"
        ? vide
        : 0;
  let y = hautCadre - margePt - decalage - style.taille * 0.85;

  for (const ligne of visibles) {
    const largeurLigne = police.widthOfTextAtSize(ligne, style.taille);
    const x =
      style.alignement === "centre"
        ? mmEnPoints(cadre.x) + margePt + (largeurUtile - largeurLigne) / 2
        : style.alignement === "droite"
          ? mmEnPoints(cadre.x) + margePt + largeurUtile - largeurLigne
          : mmEnPoints(cadre.x) + margePt;

    page.drawText(ligne, {
      x,
      y,
      size: style.taille,
      font: police,
      color: couleur(style.couleur),
    });
    y -= interligne;
  }
}

function dessinerBlocTexte(
  page: PDFPage,
  polices: Polices,
  bloc: BlocTexte,
  donnees: Record<string, unknown>,
  hauteurPage: number
) {
  dessinerEncadrement(page, bloc, bloc.encadrement, hauteurPage);
  dessinerTexte(
    page,
    polices,
    bloc,
    remplirJetons(bloc.contenu, donnees),
    bloc.style,
    bloc.marge,
    hauteurPage
  );
}

async function dessinerBlocImage(
  pdf: PDFDocument,
  page: PDFPage,
  bloc: BlocImage,
  images: ImagesDisponibles,
  hauteurPage: number
) {
  const fichier = images.get(bloc.fichierId);
  if (!fichier) return;

  let image: PDFImage;
  try {
    image =
      fichier.type === "png"
        ? await pdf.embedPng(fichier.octets)
        : await pdf.embedJpg(fichier.octets);
  } catch {
    // Image illisible : le document sort sans elle plutôt que pas du tout.
    return;
  }

  const cadreL = mmEnPoints(bloc.largeur);
  const cadreH = mmEnPoints(bloc.hauteur);
  const basCadre = ordonneePdf(bloc.y, bloc.hauteur, hauteurPage);

  // « Contenir » garde les proportions et centre dans le cadre ; « remplir »
  // occupe tout, quitte à déformer. Une signature déformée se voit tout de
  // suite, d'où le premier par défaut.
  let largeur = cadreL;
  let hauteur = cadreH;
  if (bloc.ajustement === "contenir") {
    const facteur = Math.min(cadreL / image.width, cadreH / image.height);
    largeur = image.width * facteur;
    hauteur = image.height * facteur;
  }

  page.drawImage(image, {
    x: mmEnPoints(bloc.x) + (cadreL - largeur) / 2,
    y: basCadre + (cadreH - hauteur) / 2,
    width: largeur,
    height: hauteur,
    opacity: Math.min(1, Math.max(0, bloc.opacite)),
  });
}

/**
 * QR code : l'URL est lue dans les données au moment du rendu (jamais stockée
 * dans le modèle). Sans URL — un aperçu de modèle — on dessine un QR factice
 * qui montre l'emplacement sans rien certifier.
 */
async function dessinerBlocQr(
  pdf: PDFDocument,
  page: PDFPage,
  bloc: BlocQr,
  donnees: Record<string, unknown>,
  hauteurPage: number
) {
  const url = String(valeurDuChemin(donnees, bloc.champ || "lienVerification") ?? "");
  const contenu = url || "Cursus — aperçu du modèle";
  const png = await QRCode.toBuffer(contenu, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 512,
    color: { dark: bloc.couleur || "#0f1226", light: "#ffffff" },
  });
  const image = await pdf.embedPng(png);
  const cote = Math.min(bloc.largeur, bloc.hauteur);
  page.drawImage(image, {
    x: mmEnPoints(bloc.x + (bloc.largeur - cote) / 2),
    y: ordonneePdf(bloc.y + (bloc.hauteur - cote) / 2, cote, hauteurPage),
    width: mmEnPoints(cote),
    height: mmEnPoints(cote),
  });
}

/**
 * Trait. L'épaisseur se règle à part de la taille du cadre : un trait de
 * 0,3 mm dans un bloc de 10 mm de haut reste un trait de 0,3 mm, centré.
 */
function dessinerBlocLigne(
  page: PDFPage,
  bloc: BlocLigne,
  hauteurPage: number
) {
  const epaisseur = Math.max(0.05, bloc.epaisseur);
  const horizontale = bloc.orientation === "horizontale";

  const largeur = horizontale ? bloc.largeur : epaisseur;
  const hauteur = horizontale ? epaisseur : bloc.hauteur;
  const x = bloc.x + (horizontale ? 0 : (bloc.largeur - epaisseur) / 2);
  const y = bloc.y + (horizontale ? (bloc.hauteur - epaisseur) / 2 : 0);

  page.drawRectangle({
    x: mmEnPoints(x),
    y: ordonneePdf(y, hauteur, hauteurPage),
    width: mmEnPoints(largeur),
    height: mmEnPoints(hauteur),
    color: couleur(bloc.couleur),
  });
}

/**
 * Tableau à lignes variables.
 *
 * Les lignes viennent d'un tableau de données (`source`) : c'est ce qui permet
 * à une facture d'avoir une ou douze prestations sans que le modèle change.
 * Au-delà de ce que le bloc peut contenir, on s'arrête — un tableau qui
 * déborderait sur la signature ferait une pièce illisible.
 */
function dessinerBlocTableau(
  page: PDFPage,
  polices: Polices,
  bloc: BlocTableau,
  donnees: Record<string, unknown>,
  hauteurPage: number
) {
  // Deux sources possibles : les données, pour le détail d'une facture dont
  // on ignore le nombre de lignes, ou la grille saisie à la main, pour un
  // tableau dont le contenu ne bouge pas.
  const brut = bloc.source ? valeurDuChemin(donnees, bloc.source) : null;
  const depuisDonnees = Array.isArray(brut)
    ? (brut as Record<string, unknown>[])
    : null;
  const lignes: Record<string, unknown>[] =
    depuisDonnees ??
    bloc.lignesManuelles.map((ligne) =>
      Object.fromEntries(
        bloc.colonnes.map((c, i) => [c.champ || `c${i}`, ligne[i] ?? ""])
      )
    );

  const largeurs = largeursColonnes(bloc);
  // Les filets intérieurs sont ceux du tableau ; l'encadrement des cellules
  // ne porte que leur fond, sans quoi les deux se superposeraient.
  const filet: Partial<Encadrement> = bloc.bordure
    ? { bordure: bloc.bordure, epaisseurBordure: bloc.epaisseurBordure }
    : {};

  const avecEntete = bloc.hauteurEntete > 0;
  if (avecEntete) {
    let x = bloc.x;
    bloc.colonnes.forEach((colonne, i) => {
      const cadre = { x, y: bloc.y, largeur: largeurs[i], hauteur: bloc.hauteurEntete };
      dessinerEncadrement(
        page,
        cadre,
        { ...bloc.encadrementEntete, ...filet },
        hauteurPage
      );
      dessinerTexte(
        page,
        polices,
        cadre,
        remplirJetons(colonne.entete, donnees),
        { ...bloc.styleEntete, alignement: colonne.alignement },
        1.5,
        hauteurPage
      );
      x += largeurs[i];
    });
  }

  const hautCorps = bloc.y + (avecEntete ? bloc.hauteurEntete : 0);
  const place = Math.max(0, bloc.hauteur - (avecEntete ? bloc.hauteurEntete : 0));
  const maxLignes = Math.floor(place / Math.max(1, bloc.hauteurLigne));

  lignes.slice(0, maxLignes).forEach((ligne, rang) => {
    let x = bloc.x;
    const y = hautCorps + rang * bloc.hauteurLigne;
    const fond =
      bloc.zebrure && rang % 2 === 1 ? bloc.zebrure : bloc.encadrementCorps.fond;

    bloc.colonnes.forEach((colonne, i) => {
      const cadre = { x, y, largeur: largeurs[i], hauteur: bloc.hauteurLigne };
      dessinerEncadrement(
        page,
        cadre,
        { ...bloc.encadrementCorps, ...filet, fond },
        hauteurPage
      );
      // Une cellule manuelle peut elle aussi porter un jeton : on remplit
      // d'abord depuis la ligne, puis depuis les données du document.
      const cle = colonne.champ || `c${i}`;
      dessinerTexte(
        page,
        polices,
        cadre,
        remplirJetons(remplirJetons(`{{${cle}}}`, ligne), donnees),
        { ...bloc.styleCorps, alignement: colonne.alignement },
        1.5,
        hauteurPage
      );
      x += largeurs[i];
    });
  });
}

export async function rendreCanevas(
  canevas: Canevas,
  options: OptionsRendu = {}
): Promise<Uint8Array> {
  const donnees = options.donnees ?? {};
  const images = options.images ?? new Map();

  const pdf = await PDFDocument.create();
  pdf.setProducer("Cursus");
  pdf.setCreator("Cursus");
  if (options.titre) pdf.setTitle(options.titre);

  const polices = await embarquerPolices(pdf);
  const page = pdf.addPage([
    mmEnPoints(canevas.largeur),
    mmEnPoints(canevas.hauteur),
  ]);

  for (const bloc of [...(options.fond ?? []), ...parPlan(canevas.blocs)]) {
    if (bloc.masque) continue;
    switch (bloc.type) {
      case "RECTANGLE":
        dessinerEncadrement(page, bloc, bloc.encadrement, canevas.hauteur);
        break;
      case "TEXTE":
        dessinerBlocTexte(page, polices, bloc, donnees, canevas.hauteur);
        break;
      case "IMAGE":
        await dessinerBlocImage(pdf, page, bloc, images, canevas.hauteur);
        break;
      case "TABLEAU":
        dessinerBlocTableau(page, polices, bloc, donnees, canevas.hauteur);
        break;
      case "LIGNE":
        dessinerBlocLigne(page, bloc, canevas.hauteur);
        break;
      case "QRCODE":
        await dessinerBlocQr(pdf, page, bloc, donnees, canevas.hauteur);
        break;
    }
  }

  if (options.filigrane) {
    page.drawText(options.filigrane.toLocaleUpperCase("fr-FR"), {
      x: mmEnPoints(35),
      y: mmEnPoints(95),
      size: 62,
      font: polices.grasse,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.12,
      rotate: degrees(38),
    });
  }

  return pdf.save();
}

/** Blocs d'un canevas qui réclament un fichier image, pour aller les lire. */
export function imagesRequises(canevas: Canevas): { id: string; nom: string }[] {
  return canevas.blocs
    .filter((b): b is BlocImage => b.type === "IMAGE" && Boolean(b.fichierId))
    .map((b) => ({ id: b.fichierId, nom: nomDuBloc(b) }));
}

export type { Bloc, Canevas };
