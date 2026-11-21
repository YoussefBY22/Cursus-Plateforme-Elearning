/**
 * Représentation **déclarative** d'un document, indépendante du rendu.
 *
 * C'est la pièce centrale de la brique « moteur de documents » : un gabarit ne
 * dessine pas, il décrit. Le rendu PDF (`rendu.ts`) est le seul à connaître les
 * coordonnées, les polices et la charte. Conséquences :
 *   - un gabarit est une fonction **pure** donc testable sans PDF ;
 *   - changer la charte se fait à un seul endroit, pour tous les modèles ;
 *   - on pourra ajouter un autre moteur de sortie (HTML d'aperçu, DOCX pour un
 *     tiers) sans réécrire un seul gabarit.
 */

export type AlignementColonne = "gauche" | "droite" | "centre";

export type ColonneTableau = {
  libelle: string;
  /** Part de la largeur utile (les parts sont normalisées au rendu). */
  largeur: number;
  alignement?: AlignementColonne;
};

export type BlocDocument =
  /** Texte courant, replié automatiquement sur la largeur utile. */
  | { type: "paragraphe"; texte: string; italique?: boolean }
  /** Titre de section. */
  | { type: "section"; titre: string }
  /** Couples libellé / valeur, sur une à trois colonnes. */
  | {
      type: "champs";
      colonnes?: 1 | 2 | 3;
      items: { label: string; valeur: string }[];
    }
  /** Tableau à en-tête, avec zébrage. */
  | { type: "tableau"; colonnes: ColonneTableau[]; lignes: string[][] }
  /** Bloc de totaux aligné à droite. */
  | { type: "total"; items: { label: string; valeur: string; fort?: boolean }[] }
  /** Encadré de mise en avant (mention légale, avertissement…). */
  | { type: "encadre"; titre?: string; texte: string }
  /** Cases de signature côte à côte. */
  | { type: "signatures"; cases: { role: string; nom?: string }[] }
  /** Respiration verticale explicite, en points. */
  | { type: "espace"; hauteur: number };

export type StructureDocument = {
  titre: string;
  sousTitre?: string;
  /** Référence du document (ex. numéro de certificat) — reprise en pied de page. */
  reference: string;
  /** Date déjà formatée pour l'affichage. */
  date: string;
  blocs: BlocDocument[];
  /** Mention répétée en pied de page (mentions légales, identifiant de l'émetteur…). */
  mentionPied?: string;
  /** Filigrane diagonal — utilisé pour les brouillons et les annulations. */
  filigrane?: string;
  /**
   * `paysage` pour les tableaux à beaucoup de colonnes (budget mensuel,
   * export multi-mois) : au-delà de 6-7 colonnes, le portrait A4 ne laisse
   * plus assez de place pour des montants lisibles. Par défaut `portrait`.
   */
  orientation?: "portrait" | "paysage";
};
