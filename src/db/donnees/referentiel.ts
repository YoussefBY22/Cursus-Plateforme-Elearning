/**
 * Référentiel de compétences proposé par la plateforme — un domaine par
 * département d'organisation. Chaque organisation peut l'adapter (voir l'espace
 * RH) : sa version devient alors son standard, reliée à celle-ci pour que
 * les mesures restent comparables.
 *
 * `question` : formulation de l'auto-évaluation (« de 1 à 10, … »).
 */

export type DomaineSemence = {
  code: string;
  nom: string;
  description: string;
  couleur: string;
  icone: string;
  competences: { code: string; nom: string; question?: string; pistes?: string }[];
};

export const REFERENTIEL: DomaineSemence[] = [
  {
    code: "DEVCO",
    nom: "Développement commercial",
    description: "Prospecter, convaincre et fidéliser les clients de l'organisation.",
    couleur: "#E5484D",
    icone: "Handshake",
    competences: [
      { code: "DEVCO_PROSPECTION", nom: "Prospection", pistes: "Constituez un fichier de 30 cibles qualifiées et suivez vos relances dans un CRM." },
      { code: "DEVCO_NEGOCIATION", nom: "Négociation", pistes: "Préparez chaque rendez-vous avec votre point de rupture et trois concessions possibles." },
      { code: "DEVCO_PRISE_PAROLE", nom: "Prise de parole en public", pistes: "Filmez-vous pendant un pitch de 2 minutes, puis réécoutez-vous sans le son." },
      { code: "DEVCO_ARGUMENTATION", nom: "Argumentation", pistes: "Structurez chaque argument en caractéristique → avantage → bénéfice client." },
      { code: "DEVCO_PITCH", nom: "Pitch de l'offre", pistes: "Commencez par le pourquoi : la raison d'être de l'organisation avant ses prestations." },
      { code: "DEVCO_ECOUTE", nom: "Écoute active et découverte du besoin" },
      { code: "DEVCO_PROPOSITION", nom: "Rédaction de propositions commerciales" },
      { code: "DEVCO_OBJECTIONS", nom: "Traitement des objections" },
      { code: "DEVCO_RELATION", nom: "Relation et fidélisation client" },
      { code: "DEVCO_CRM", nom: "Suivi du pipeline (CRM)" },
    ],
  },
  {
    code: "MARKETING",
    nom: "Marketing & communication",
    description: "Faire connaître l'organisation, ses missions et ses valeurs.",
    couleur: "#2563EB",
    icone: "Megaphone",
    competences: [
      { code: "MKT_STRATEGIE", nom: "Stratégie marketing", pistes: "Formulez un positionnement en une phrase : pour qui, quoi, contre qui, pourquoi nous." },
      { code: "MKT_INBOUND", nom: "Inbound marketing", pistes: "Publiez un contenu utile par semaine plutôt qu'une promotion." },
      { code: "MKT_RESEAUX", nom: "Gestion des réseaux sociaux" },
      { code: "MKT_CONTENU", nom: "Création de contenu" },
      { code: "MKT_IDENTITE", nom: "Identité de marque" },
      { code: "MKT_EVENEMENTIEL", nom: "Communication événementielle" },
      { code: "MKT_ANALYSE", nom: "Analyse des performances (KPI)" },
      { code: "MKT_VIRAL", nom: "Diffusion et adoption des idées" },
    ],
  },
  {
    code: "MANAGEMENT",
    nom: "Management & leadership",
    description: "Piloter une équipe, des projets et un mandat.",
    couleur: "#64748B",
    icone: "Compass",
    competences: [
      { code: "MGT_MOTIVATION", nom: "Motivation d'équipe", pistes: "Donnez de l'autonomie, un sens et l'occasion de progresser (autonomie, maîtrise, finalité)." },
      { code: "MGT_DELEGATION", nom: "Délégation" },
      { code: "MGT_GESTION_PROJET", nom: "Gestion de projet" },
      { code: "MGT_TEMPS", nom: "Gestion du temps et des priorités", pistes: "Découpez les échéances lointaines en jalons hebdomadaires visibles de tous." },
      { code: "MGT_DECISION", nom: "Prise de décision" },
      { code: "MGT_COLLABORATION", nom: "Collaboration et intelligence collective" },
      { code: "MGT_FEEDBACK", nom: "Feedback et entretiens" },
      { code: "MGT_STRATEGIE", nom: "Pensée stratégique" },
      { code: "MGT_PROTOTYPAGE", nom: "Itération et prototypage" },
    ],
  },
  {
    code: "FINANCE",
    nom: "Finance & trésorerie",
    description: "Tenir les comptes, budgéter et rester en règle avec le fisc.",
    couleur: "#C77C00",
    icone: "Coins",
    competences: [
      { code: "FIN_CAISSE", nom: "Tenue de caisse et rapprochements" },
      { code: "FIN_FACTURATION", nom: "Facturation et pièces justificatives" },
      { code: "FIN_FISCALITE", nom: "Obligations fiscales et déclaratives" },
      { code: "FIN_BUDGET", nom: "Budget prévisionnel" },
      { code: "FIN_REPORTING", nom: "Reporting financier" },
      { code: "FIN_TARIFICATION", nom: "Chiffrage et tarification d'une mission" },
    ],
  },
  {
    code: "RSE",
    nom: "RSE & impact",
    description: "Engager l'organisation dans une démarche durable et mesurée.",
    couleur: "#12A150",
    icone: "Leaf",
    competences: [
      { code: "RSE_ODD", nom: "Connaissance des ODD" },
      { code: "RSE_IMPACT", nom: "Mesure d'impact" },
      { code: "RSE_ENGAGEMENT", nom: "Projets solidaires et engagement" },
      { code: "RSE_ECORESPONSABLE", nom: "Pratiques écoresponsables" },
      { code: "RSE_RECIT", nom: "Communication d'impact" },
    ],
  },
  {
    code: "JURIDIQUE",
    nom: "Juridique & qualité",
    description: "Statuts, registres, conformité et démarche qualité.",
    couleur: "#5B3A8C",
    icone: "Scale",
    competences: [
      { code: "JUR_STATUTS", nom: "Statut associatif et gouvernance" },
      { code: "JUR_REGISTRES", nom: "Registres et procès-verbaux" },
      { code: "JUR_CONTRATS", nom: "Conventions et contrats de mission" },
      { code: "JUR_QUALITE", nom: "Démarche qualité (ISO 9001)" },
      { code: "JUR_AUDIT", nom: "Préparation d'audit" },
    ],
  },
  {
    code: "DIGITAL",
    nom: "Digital & tech",
    description: "Outils numériques, données et projets techniques.",
    couleur: "#1E7A86",
    icone: "Code2",
    competences: [
      { code: "DIG_OUTILS", nom: "Outils collaboratifs" },
      { code: "DIG_DONNEES", nom: "Analyse de données (tableur)" },
      { code: "DIG_WEB", nom: "Conception web" },
      { code: "DIG_AUTOMATISATION", nom: "Automatisation de tâches" },
      { code: "DIG_IA", nom: "Usage responsable de l'IA" },
      { code: "DIG_SECURITE", nom: "Sécurité et données personnelles" },
    ],
  },
  {
    code: "RH",
    nom: "Ressources humaines",
    description: "Recruter, intégrer, faire grandir et fidéliser les membres.",
    couleur: "#C2417A",
    icone: "Users",
    competences: [
      { code: "RH_RECRUTEMENT", nom: "Recrutement" },
      { code: "RH_INTEGRATION", nom: "Intégration des nouveaux membres" },
      { code: "RH_BIEN_ETRE", nom: "Bien-être et engagement", pistes: "Commencez chaque réunion par une réussite de la semaine : l'humeur précède la performance." },
      { code: "RH_DEVELOPPEMENT", nom: "Développement des compétences" },
      { code: "RH_PERSEVERANCE", nom: "Persévérance et résilience" },
      { code: "RH_CONFIANCE", nom: "Confiance et authenticité" },
      { code: "RH_PASSATION", nom: "Passation et gestion des connaissances" },
    ],
  },
];

/** Formulation par défaut d'une question d'auto-évaluation. */
export function questionAutoEvaluation(nom: string, question?: string | null): string {
  return question ?? `De 1 à 10, comment évaluez-vous votre compétence en ${nom.charAt(0).toLowerCase()}${nom.slice(1)} ?`;
}
