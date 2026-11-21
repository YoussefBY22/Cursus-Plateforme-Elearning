/**
 * Catalogue de badges semé au démarrage — entièrement modifiable ensuite par
 * le super admin et le responsable pédagogique. Chaque badge repose sur un critère
 * calculable (services/badges.ts) : rien n'est attribué à la main.
 */

export type BadgeSemence = {
  code: string;
  nom: string;
  description: string;
  couleur: string;
  forme: "ROND" | "CARRE" | "HEXAGONE" | "BOUCLIER" | "ETOILE" | "DIAMANT";
  matiere: "BRONZE" | "ARGENT" | "OR" | "PLATINE" | "DIAMANT";
  rarete: "COMMUN" | "RARE" | "EPIQUE" | "LEGENDAIRE" | "MYTHIQUE";
  effet: "AUCUN" | "BRILLANCE" | "FLAMME" | "ELECTRICITE" | "NATURE" | "GIVRE" | "COSMOS";
  icone: string;
  critere: string;
  seuil: number;
  /** Code de domaine ou clé de parcours, résolu en identifiant au semis. */
  parametre?: string;
  xpBonus: number;
  secret?: boolean;
};

export const BADGES: BadgeSemence[] = [
  // Premiers pas
  { code: "EMAIL_VERIFIE", nom: "Identité vérifiée", description: "Vous avez confirmé votre adresse e-mail.", couleur: "#1e7a86", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "MailCheck", critere: "EMAIL_VERIFIE", seuil: 1, xpBonus: 10 },
  { code: "PROFIL_COMPLET", nom: "Carte de visite", description: "Photo, poste, bio, LinkedIn, département et organisation : votre profil est complet.", couleur: "#0f1226", forme: "CARRE", matiere: "ARGENT", rarete: "COMMUN", effet: "AUCUN", icone: "UserCheck", critere: "PROFIL_COMPLET", seuil: 1, xpBonus: 25 },
  { code: "PREMIERE_FORMATION", nom: "Premiers pas", description: "Votre première formation terminée, quiz et enquête compris.", couleur: "#4f46e5", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Footprints", critere: "FORMATIONS_TERMINEES", seuil: 1, xpBonus: 20 },
  { code: "LUCIDE", nom: "Lucidité", description: "Votre première auto-évaluation, honnête et chronométrée.", couleur: "#5b3a8c", forme: "HEXAGONE", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Eye", critere: "AUTO_EVALUATIONS", seuil: 1, xpBonus: 10 },

  // Temps passé
  { code: "HEURE_1", nom: "Première heure", description: "Votre première heure passée à apprendre sur Cursus.", couleur: "#c77c00", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Clock", critere: "HEURES_PLATEFORME", seuil: 1, xpBonus: 10 },
  { code: "HEURE_10", nom: "Habitué", description: "10 heures actives sur la plateforme.", couleur: "#c77c00", forme: "ROND", matiere: "ARGENT", rarete: "RARE", effet: "BRILLANCE", icone: "Hourglass", critere: "HEURES_PLATEFORME", seuil: 10, xpBonus: 50 },
  { code: "HEURE_50", nom: "Pilier de l'Academy", description: "50 heures actives : la formation fait partie de votre semaine.", couleur: "#c77c00", forme: "HEXAGONE", matiere: "OR", rarete: "EPIQUE", effet: "ELECTRICITE", icone: "Timer", critere: "HEURES_PLATEFORME", seuil: 50, xpBonus: 150 },
  { code: "HEURE_100", nom: "Centurion", description: "100 heures actives. Respect.", couleur: "#4f46e5", forme: "BOUCLIER", matiere: "PLATINE", rarete: "LEGENDAIRE", effet: "FLAMME", icone: "Crown", critere: "HEURES_PLATEFORME", seuil: 100, xpBonus: 400 },

  // Visionnage
  { code: "VISION_5H", nom: "Ciné-club", description: "5 heures de vidéo réellement regardées.", couleur: "#1e7a86", forme: "CARRE", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "CirclePlay", critere: "HEURES_VISIONNAGE", seuil: 5, xpBonus: 25 },
  { code: "VISION_25H", nom: "Grand écran", description: "25 heures de vidéo réellement regardées.", couleur: "#1e7a86", forme: "CARRE", matiere: "OR", rarete: "EPIQUE", effet: "BRILLANCE", icone: "CirclePlay", critere: "HEURES_VISIONNAGE", seuil: 25, xpBonus: 120 },
  { code: "VIDEOS_20", nom: "Vingt sur vingt", description: "20 vidéos vues jusqu'au seuil de visionnage.", couleur: "#0f1226", forme: "ETOILE", matiere: "ARGENT", rarete: "RARE", effet: "BRILLANCE", icone: "Star", critere: "FORMATIONS_VISIONNEES", seuil: 20, xpBonus: 80 },

  // Formations
  { code: "FORMATIONS_5", nom: "Assidu", description: "5 formations terminées.", couleur: "#4f46e5", forme: "ROND", matiere: "ARGENT", rarete: "RARE", effet: "AUCUN", icone: "BookOpen", critere: "FORMATIONS_TERMINEES", seuil: 5, xpBonus: 50 },
  { code: "FORMATIONS_20", nom: "Marathonien du savoir", description: "20 formations terminées.", couleur: "#4f46e5", forme: "HEXAGONE", matiere: "OR", rarete: "EPIQUE", effet: "ELECTRICITE", icone: "Library", critere: "FORMATIONS_TERMINEES", seuil: 20, xpBonus: 200 },
  { code: "FORMATIONS_50", nom: "Encyclopédie vivante", description: "50 formations terminées. Il n'y a plus grand-chose à vous apprendre.", couleur: "#5b3a8c", forme: "DIAMANT", matiere: "DIAMANT", rarete: "MYTHIQUE", effet: "COSMOS", icone: "Brain", critere: "FORMATIONS_TERMINEES", seuil: 50, xpBonus: 600 },

  // Quiz
  { code: "QUIZ_10", nom: "Esprit vif", description: "10 quiz réussis.", couleur: "#2563eb", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Zap", critere: "QUIZ_REUSSIS", seuil: 10, xpBonus: 20 },
  { code: "QUIZ_50", nom: "Machine à quiz", description: "50 quiz réussis.", couleur: "#2563eb", forme: "HEXAGONE", matiere: "OR", rarete: "EPIQUE", effet: "ELECTRICITE", icone: "Bolt", critere: "QUIZ_REUSSIS", seuil: 50, xpBonus: 150 },
  { code: "SANS_FAUTE", nom: "Sans faute", description: "Un quiz final réussi à 100 % du premier coup.", couleur: "#12a150", forme: "ETOILE", matiere: "OR", rarete: "RARE", effet: "BRILLANCE", icone: "Target", critere: "QUIZ_PARFAITS", seuil: 1, xpBonus: 30 },
  { code: "PERFECTIONNISTE", nom: "Perfectionniste", description: "Cinq quiz finaux parfaits du premier coup.", couleur: "#12a150", forme: "ETOILE", matiere: "PLATINE", rarete: "LEGENDAIRE", effet: "GIVRE", icone: "Gem", critere: "QUIZ_PARFAITS", seuil: 5, xpBonus: 200 },

  // Parcours et certificats
  { code: "CERTIFIE", nom: "Certifié", description: "Votre premier parcours certifiant terminé.", couleur: "#4f46e5", forme: "BOUCLIER", matiere: "OR", rarete: "RARE", effet: "BRILLANCE", icone: "ShieldCheck", critere: "PARCOURS_TERMINES", seuil: 1, xpBonus: 60 },
  { code: "TRIPLE_CERTIFICATION", nom: "Triple certification", description: "Trois parcours certifiants terminés.", couleur: "#0f1226", forme: "BOUCLIER", matiere: "PLATINE", rarete: "LEGENDAIRE", effet: "FLAMME", icone: "Trophy", critere: "PARCOURS_TERMINES", seuil: 3, xpBonus: 300 },
  { code: "NEGOCIATEUR", nom: "Orateur certifié", description: "Parcours « Pitcher avec impact » terminé.", couleur: "#4f46e5", forme: "HEXAGONE", matiere: "ARGENT", rarete: "RARE", effet: "AUCUN", icone: "Mic", critere: "PARCOURS_SPECIFIQUE", seuil: 1, parametre: "pitch", xpBonus: 40 },
  { code: "TRESORIER", nom: "Gardien des comptes", description: "Parcours « Trésorerie et conformité d'une organisation » terminé.", couleur: "#c77c00", forme: "CARRE", matiere: "OR", rarete: "RARE", effet: "AUCUN", icone: "PiggyBank", critere: "PARCOURS_SPECIFIQUE", seuil: 1, parametre: "tresorerie", xpBonus: 40 },
  { code: "ENGAGE_RSE", nom: "Engagé pour la planète", description: "Parcours « Agir pour un impact durable » terminé.", couleur: "#12a150", forme: "ROND", matiere: "ARGENT", rarete: "EPIQUE", effet: "NATURE", icone: "Sprout", critere: "PARCOURS_SPECIFIQUE", seuil: 1, parametre: "rse", xpBonus: 40 },

  // Domaines
  { code: "FIBRE_COMMERCIALE", nom: "Fibre commerciale", description: "3 formations terminées en développement commercial.", couleur: "#4f46e5", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Handshake", critere: "FORMATIONS_DOMAINE", seuil: 3, parametre: "DEVCO", xpBonus: 30 },
  { code: "ESPRIT_MARKETING", nom: "Esprit marketing", description: "2 formations terminées en marketing.", couleur: "#2563eb", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Megaphone", critere: "FORMATIONS_DOMAINE", seuil: 2, parametre: "MARKETING", xpBonus: 30 },
  { code: "MANAGER_NE", nom: "Manager-né", description: "4 formations terminées en management.", couleur: "#0f1226", forme: "HEXAGONE", matiere: "ARGENT", rarete: "RARE", effet: "AUCUN", icone: "Compass", critere: "FORMATIONS_DOMAINE", seuil: 4, parametre: "MANAGEMENT", xpBonus: 40 },
  { code: "CURIEUX", nom: "Curieux", description: "Des formations terminées dans 3 domaines différents.", couleur: "#1e7a86", forme: "ROND", matiere: "ARGENT", rarete: "RARE", effet: "AUCUN", icone: "Map", critere: "DOMAINES_FORMES", seuil: 3, xpBonus: 40 },
  { code: "POLYVALENT", nom: "Couteau suisse", description: "Des formations terminées dans 6 domaines différents.", couleur: "#1e7a86", forme: "ETOILE", matiere: "OR", rarete: "EPIQUE", effet: "BRILLANCE", icone: "Puzzle", critere: "DOMAINES_FORMES", seuil: 6, xpBonus: 120 },
  { code: "INTROSPECTION", nom: "Introspection", description: "4 domaines auto-évalués : vous connaissez votre carte.", couleur: "#5b3a8c", forme: "HEXAGONE", matiere: "ARGENT", rarete: "RARE", effet: "AUCUN", icone: "Compass", critere: "DOMAINES_EVALUES", seuil: 4, xpBonus: 40 },

  // Compétences
  { code: "SPECIALISTE", nom: "Spécialiste", description: "Une compétence au niveau 70 ou plus.", couleur: "#0f1226", forme: "BOUCLIER", matiere: "ARGENT", rarete: "RARE", effet: "BRILLANCE", icone: "Medal", critere: "COMPETENCE_NIVEAU", seuil: 70, xpBonus: 60 },
  { code: "EXPERT", nom: "Expert", description: "Une compétence au niveau 85 ou plus.", couleur: "#0f1226", forme: "BOUCLIER", matiere: "OR", rarete: "LEGENDAIRE", effet: "FLAMME", icone: "Award", critere: "COMPETENCE_NIVEAU", seuil: 85, xpBonus: 200 },
  { code: "PROGRESSION_10", nom: "En progrès", description: "+10 points sur une compétence depuis votre auto-évaluation initiale.", couleur: "#12a150", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "TrendingUp", critere: "PROGRESSION", seuil: 10, xpBonus: 30 },
  { code: "PROGRESSION_25", nom: "Métamorphose", description: "+25 points sur une compétence depuis votre auto-évaluation initiale.", couleur: "#12a150", forme: "DIAMANT", matiere: "PLATINE", rarete: "EPIQUE", effet: "NATURE", icone: "Rocket", critere: "PROGRESSION", seuil: 25, xpBonus: 150 },
  { code: "OVR_60", nom: "Titulaire", description: "Note générale de 60 ou plus.", couleur: "#4f46e5", forme: "HEXAGONE", matiere: "OR", rarete: "EPIQUE", effet: "ELECTRICITE", icone: "Gauge", critere: "NOTE_GENERALE", seuil: 60, xpBonus: 120 },

  // Expérience
  { code: "NIVEAU_5", nom: "Junior confirmé", description: "Niveau d'expérience 5 atteint.", couleur: "#4f46e5", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Sparkles", critere: "NIVEAU_ATTEINT", seuil: 5, xpBonus: 0 },
  { code: "NIVEAU_10", nom: "Consultant senior", description: "Niveau d'expérience 10 atteint.", couleur: "#4f46e5", forme: "HEXAGONE", matiere: "ARGENT", rarete: "RARE", effet: "BRILLANCE", icone: "Briefcase", critere: "NIVEAU_ATTEINT", seuil: 10, xpBonus: 0 },
  { code: "NIVEAU_20", nom: "Manager", description: "Niveau d'expérience 20 atteint.", couleur: "#0f1226", forme: "BOUCLIER", matiere: "OR", rarete: "EPIQUE", effet: "ELECTRICITE", icone: "Crown", critere: "NIVEAU_ATTEINT", seuil: 20, xpBonus: 0 },
  { code: "NIVEAU_40", nom: "Associé", description: "Niveau d'expérience 40 atteint.", couleur: "#5b3a8c", forme: "DIAMANT", matiere: "DIAMANT", rarete: "MYTHIQUE", effet: "COSMOS", icone: "Gem", critere: "NIVEAU_ATTEINT", seuil: 40, xpBonus: 0, secret: true },

  // Communauté
  { code: "PREMIER_COMMENTAIRE", nom: "Prise de parole", description: "Votre premier commentaire publié.", couleur: "#1e7a86", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "MessageCircle", critere: "COMMENTAIRES", seuil: 1, xpBonus: 5 },
  { code: "ANIMATEUR", nom: "Animateur", description: "10 commentaires publiés.", couleur: "#1e7a86", forme: "CARRE", matiere: "ARGENT", rarete: "RARE", effet: "AUCUN", icone: "Users", critere: "COMMENTAIRES", seuil: 10, xpBonus: 40 },
  { code: "VOIX_ECOUTEE", nom: "Voix écoutée", description: "10 « j'aime » reçus sur vos commentaires.", couleur: "#c2417a", forme: "ROND", matiere: "ARGENT", rarete: "RARE", effet: "BRILLANCE", icone: "Heart", critere: "LIKES_RECUS", seuil: 10, xpBonus: 40 },
  { code: "CRITIQUE", nom: "Critique avisé", description: "5 formations notées.", couleur: "#c77c00", forme: "ETOILE", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Star", critere: "NOTES_DONNEES", seuil: 5, xpBonus: 15 },
  { code: "RECUL", nom: "Prendre du recul", description: "Une évaluation à froid complétée.", couleur: "#4fb3c0", forme: "HEXAGONE", matiere: "BRONZE", rarete: "COMMUN", effet: "GIVRE", icone: "Snowflake", critere: "ENQUETES_FROID", seuil: 1, xpBonus: 15 },

  // Régularité
  { code: "SERIE_3", nom: "En rythme", description: "3 jours d'affilée sur Cursus.", couleur: "#4f46e5", forme: "ROND", matiere: "BRONZE", rarete: "COMMUN", effet: "AUCUN", icone: "Flame", critere: "SERIE_JOURS", seuil: 3, xpBonus: 10 },
  { code: "SERIE_7", nom: "Semaine parfaite", description: "7 jours d'affilée.", couleur: "#4f46e5", forme: "HEXAGONE", matiere: "OR", rarete: "EPIQUE", effet: "FLAMME", icone: "Flame", critere: "SERIE_JOURS", seuil: 7, xpBonus: 60 },
  { code: "SERIE_30", nom: "Inarrêtable", description: "30 jours d'affilée. Une vraie discipline.", couleur: "#4f46e5", forme: "BOUCLIER", matiere: "PLATINE", rarete: "LEGENDAIRE", effet: "FLAMME", icone: "Flame", critere: "SERIE_JOURS", seuil: 30, xpBonus: 250 },

  // Formateurs
  { code: "TRANSMETTEUR", nom: "Transmetteur", description: "Votre première formation publiée.", couleur: "#0f1226", forme: "CARRE", matiere: "OR", rarete: "RARE", effet: "BRILLANCE", icone: "Presentation", critere: "FORMATIONS_PUBLIEES", seuil: 1, xpBonus: 50 },
  { code: "PEDAGOGUE", nom: "Pédagogue", description: "5 formations publiées.", couleur: "#0f1226", forme: "BOUCLIER", matiere: "PLATINE", rarete: "EPIQUE", effet: "ELECTRICITE", icone: "GraduationCap", critere: "FORMATIONS_PUBLIEES", seuil: 5, xpBonus: 150 },
];
