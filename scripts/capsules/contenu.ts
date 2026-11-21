/**
 * Contenu des capsules vidéo de démonstration.
 *
 * Chaque capsule est une suite de diapositives. Les durées sont calées sur
 * les points de quiz du semis (`scripts/donnees/formations.ts`) : le quiz
 * intégré apparaît à la fin de la diapositive qui précède, jamais au milieu
 * d'une explication.
 */
export type Diapositive = {
  /** Durée d'affichage, en secondes. */
  duree: number;
  /** Petit titre au-dessus (numéro de section, thème). */
  surtitre: string;
  titre: string;
  texte?: string;
};

export type Capsule = {
  /** Nom de fichier sans extension, dans public/videos. */
  fichier: string;
  /** Durée totale attendue — doit égaler la somme des durées. */
  dureeSec: number;
  diapositives: Diapositive[];
};

export const CAPSULES: Capsule[] = [
  {
    fichier: "tresorerie-caisse",
    dureeSec: 72,
    diapositives: [
      { duree: 6, surtitre: "Finance & trésorerie", titre: "Tenir sa caisse au jour le jour", texte: "Capsule Cursus" },
      {
        duree: 16,
        surtitre: "1. Le brouillard de caisse",
        titre: "Un mouvement, une ligne",
        texte: "Chaque entrée et chaque sortie d'espèces s'écrit le jour même, jamais « plus tard ».",
      },
      {
        duree: 18,
        surtitre: "2. Ce que contient une ligne",
        titre: "Quatre informations",
        texte: "La date, le libellé, le montant en entrée ou en sortie, et la pièce justificative qui le prouve.",
      },
      {
        duree: 14,
        surtitre: "3. Le comptage mensuel",
        titre: "Compter à deux, puis signer",
        texte: "Une fois par mois, deux personnes comptent les espèces devant témoin et signent le procès-verbal.",
      },
      {
        duree: 12,
        surtitre: "4. Écart et validation",
        titre: "On explique, on n'efface pas",
        texte: "Un écart se documente par écrit. Et aucune dépense ne s'engage sans validation préalable.",
      },
      { duree: 6, surtitre: "À retenir", titre: "Jour, témoin, écrit", texte: "Les trois réflexes d'une caisse sans mauvaise surprise." },
    ],
  },
  {
    fichier: "tresorerie-facturation",
    dureeSec: 72,
    diapositives: [
      { duree: 6, surtitre: "Finance & trésorerie", titre: "Facturer en règle", texte: "Capsule Cursus" },
      {
        duree: 16,
        surtitre: "1. Les mentions obligatoires",
        titre: "Ce qu'une facture doit porter",
        texte: "Un numéro unique et chronologique, l'identité des deux parties, les montants HT, taxes et TTC.",
      },
      {
        duree: 18,
        surtitre: "2. Reçu ou facture",
        titre: "Deux documents, deux rôles",
        texte: "Le reçu constate un encaissement (cotisation, don, remboursement). La facture constate une prestation vendue.",
      },
      {
        duree: 14,
        surtitre: "3. Le client conteste",
        titre: "Revenir aux pièces",
        texte: "Avant toute correction, on relit le devis signé et le bon de commande. On ne réécrit jamais un numéro.",
      },
      {
        duree: 12,
        surtitre: "4. Archiver",
        titre: "Émises et reçues",
        texte: "Les factures émises comme les factures reçues se classent dans l'ordre et se conservent.",
      },
      { duree: 6, surtitre: "À retenir", titre: "Numéroter, justifier, classer", texte: "Une facture claire se défend toute seule." },
    ],
  },
  {
    fichier: "tresorerie-cloture",
    dureeSec: 56,
    diapositives: [
      { duree: 5, surtitre: "Finance & trésorerie", titre: "La clôture mensuelle", texte: "Capsule Cursus" },
      {
        duree: 19,
        surtitre: "1. Le principe",
        titre: "Chaque mois se clôture",
        texte: "Même quand rien ne s'est passé : un mois vide se constate, il ne s'oublie pas.",
      },
      {
        duree: 14,
        surtitre: "2. Le calendrier",
        titre: "Dans les premiers jours du mois suivant",
        texte: "On clôture le mois M au début du mois M+1, tant que les pièces sont fraîches.",
      },
      {
        duree: 12,
        surtitre: "3. La préparation",
        titre: "Rapprocher les pièces",
        texte: "Chaque facture retrouve sa ligne dans le journal de trésorerie, et inversement.",
      },
      { duree: 6, surtitre: "À retenir", titre: "Un rythme régulier", texte: "Une clôture courte, chaque mois, évite la grande refonte de fin d'année." },
    ],
  },
  {
    fichier: "juridique-statut",
    dureeSec: 72,
    diapositives: [
      { duree: 6, surtitre: "Juridique & qualité", titre: "Gouvernance associative : les obligations", texte: "Capsule Cursus" },
      {
        duree: 16,
        surtitre: "1. Un statut, des règles",
        titre: "Pas de partage des bénéfices",
        texte: "Une association ne distribue pas ses excédents à ses membres : ils servent le projet.",
      },
      {
        duree: 18,
        surtitre: "2. Les registres",
        titre: "Trois registres à tenir",
        texte: "Le registre des membres, celui des délibérations, celui des aides et des dons.",
      },
      {
        duree: 14,
        surtitre: "3. Les assemblées",
        titre: "Une décision, un procès-verbal",
        texte: "Chaque décision de l'assemblée générale est consignée, datée et signée.",
      },
      {
        duree: 12,
        surtitre: "4. Le renouvellement",
        titre: "Selon les statuts",
        texte: "Le renouvellement du bureau suit les règles que les statuts ont fixées, pas l'usage.",
      },
      { duree: 6, surtitre: "À retenir", titre: "La conformité rassure", texte: "Clients, financeurs et partenaires lui font confiance." },
    ],
  },
  {
    fichier: "rse-odd",
    dureeSec: 72,
    diapositives: [
      { duree: 6, surtitre: "RSE & impact", titre: "Les ODD expliqués aux organisations", texte: "Capsule Cursus" },
      {
        duree: 16,
        surtitre: "1. Pourquoi c'est pour vous",
        titre: "Chaque mission a un impact",
        texte: "Un client, des personnes, un territoire : vos choix comptent. Autant les rendre positifs et mesurables.",
      },
      {
        duree: 18,
        surtitre: "2. Dix-sept objectifs, une échéance",
        titre: "Les ODD, à atteindre d'ici 2030",
        texte: "Les Nations unies ont fixé 17 Objectifs de développement durable : climat, éducation, égalité, travail décent…",
      },
      {
        duree: 14,
        surtitre: "3. En choisir deux ou trois",
        titre: "Ceux qui touchent votre activité",
        texte: "Viser les dix-sept, c'est n'en tenir aucun. Retenez ceux sur lesquels vous pouvez agir.",
      },
      {
        duree: 12,
        surtitre: "4. Passer à l'action",
        titre: "Action, indicateur, responsable",
        texte: "Pour chaque objectif retenu : une action concrète, un indicateur chiffré et une personne qui en répond.",
      },
      { duree: 6, surtitre: "À retenir", titre: "Peu d'objectifs, bien suivis", texte: "La crédibilité vient de la constance, pas du nombre." },
    ],
  },
  {
    fichier: "rse-impact",
    dureeSec: 56,
    diapositives: [
      { duree: 5, surtitre: "RSE & impact", titre: "Mesurer son impact", texte: "Capsule Cursus" },
      {
        duree: 19,
        surtitre: "1. Pourquoi chiffrer",
        titre: "Ce qui ne se mesure pas ne se pilote pas",
        texte: "Un chiffre transforme une intention en engagement, et un engagement en résultat.",
      },
      {
        duree: 14,
        surtitre: "2. Trois indicateurs simples",
        titre: "Accessibles à toute organisation",
        texte: "Heures de compétences offertes, papier économisé grâce au numérique, part des missions à impact social.",
      },
      {
        duree: 12,
        surtitre: "3. Le bilan",
        titre: "Le publier, chaque année",
        texte: "Un bilan d'impact à chaque fin de mandat : les chiffres, et ce qu'ils racontent.",
      },
      { duree: 6, surtitre: "À retenir", titre: "Mesurer, raconter, recommencer", texte: "Trois gestes qui rendent l'engagement crédible." },
    ],
  },
];
