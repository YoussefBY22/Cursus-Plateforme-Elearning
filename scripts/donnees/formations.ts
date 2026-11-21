/**
 * Formations de démonstration.
 *
 * Vidéos : conférences publiques (YouTube) en attendant les vraies vidéos
 * non répertoriées de la plateforme, et capsules locales (MP4 générées,
 * dossier public/videos) — elles marchent hors ligne et servent aux tests.
 *
 * Questions : une bonne réponse est préfixée par « ✓ ». `c` = code de la
 * compétence évaluée par la question (pour le calcul de niveau).
 */

export type QuestionSemence = {
  enonce: string;
  options: string[];
  type?: "CHOIX_UNIQUE" | "CHOIX_MULTIPLE" | "VRAI_FAUX";
  c?: string;
  explication?: string;
};

export type PointSemence = { tempsSec: number; titre: string; questions: QuestionSemence[] };

export type FormationSemence = {
  cle: string;
  titre: string;
  resume: string;
  description: string;
  objectifs: string[];
  domaine: string;
  niveau: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  fournisseur: "YOUTUBE" | "MP4";
  reference: string;
  dureeSec: number;
  formateur: string;
  statut: "PUBLIE" | "EN_VALIDATION" | "BROUILLON" | "REFUSE";
  motifRefus?: string;
  visibleCatalogue?: boolean;
  tags: string[];
  competences: [string, number][];
  points: PointSemence[];
  final: QuestionSemence[];
};

const VF = (enonce: string, vrai: boolean, c?: string, explication?: string): QuestionSemence => ({
  enonce,
  type: "VRAI_FAUX",
  options: vrai ? ["✓Vrai", "Faux"] : ["Vrai", "✓Faux"],
  c,
  explication,
});

export const FORMATIONS: FormationSemence[] = [
  {
    cle: "sinek",
    titre: "Commencer par le pourquoi : pitcher comme les leaders qui inspirent",
    resume: "Le cercle d'or de Simon Sinek appliqué au pitch de votre organisation.",
    description:
      "Pourquoi certaines organisations inspirent-elles quand d'autres se contentent de vendre ? À partir de la conférence de Simon Sinek, vous découvrez le cercle d'or (pourquoi, comment, quoi) et apprenez à présenter votre organisation en commençant par sa raison d'être. Idéal avant un premier rendez-vous client ou un salon.",
    objectifs: [
      "Expliquer le cercle d'or et l'ordre pourquoi → comment → quoi",
      "Reformuler l'offre de votre organisation en partant de sa raison d'être",
      "Comprendre la courbe de diffusion de l'innovation",
    ],
    domaine: "DEVCO",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "qp0HIF3SfI4",
    dureeSec: 1084,
    formateur: "amira",
    statut: "PUBLIE",
    tags: ["pitch", "leadership", "communication"],
    competences: [
      ["DEVCO_PITCH", 3],
      ["DEVCO_ARGUMENTATION", 2],
    ],
    points: [
      {
        tempsSec: 240,
        titre: "Le cercle d'or",
        questions: [
          {
            enonce: "Dans le « cercle d'or », par quoi les leaders inspirants commencent-ils ?",
            options: ["✓Le pourquoi", "Le comment", "Le quoi", "Le prix"],
            c: "DEVCO_PITCH",
            explication: "Ils communiquent de l'intérieur vers l'extérieur : leur cause d'abord, leurs produits ensuite.",
          },
          {
            enonce: "Dans l'exemple d'Apple, qu'est-ce qui convainc d'abord le client ?",
            options: [
              "✓La conviction exprimée : « nous croyons à défier le statu quo »",
              "La liste des caractéristiques techniques",
              "Un prix inférieur à la concurrence",
              "La durée de la garantie",
            ],
            c: "DEVCO_ARGUMENTATION",
          },
          VF("La plupart des organisations communiquent du « quoi » vers le « pourquoi ».", true, "DEVCO_PITCH"),
        ],
      },
      {
        tempsSec: 540,
        titre: "Le cerveau et la décision",
        questions: [
          {
            enonce: "Pourquoi, selon Sinek, les frères Wright ont-ils réussi là où Samuel Langley a échoué ?",
            options: [
              "✓Ils étaient animés par une cause, un pourquoi",
              "Ils disposaient de plus de financements",
              "Leur équipe était plus diplômée",
              "La presse les soutenait",
            ],
            c: "DEVCO_PITCH",
            explication: "Langley avait l'argent, les relations et la presse ; les Wright avaient une cause qui fédérait leur équipe.",
          },
          {
            enonce: "Quelle partie du cerveau Sinek associe-t-il au « pourquoi » et aux décisions ?",
            options: ["✓Le système limbique", "Le néocortex", "Le cervelet", "Le lobe occipital"],
            c: "DEVCO_ARGUMENTATION",
          },
        ],
      },
      {
        tempsSec: 840,
        titre: "Diffusion de l'innovation",
        questions: [
          {
            enonce: "Quelle part du marché faut-il conquérir pour basculer vers le grand public ?",
            options: ["✓15 à 18 %", "2,5 %", "50 %", "84 %"],
            c: "DEVCO_ARGUMENTATION",
          },
          {
            enonce: "Pourquoi 250 000 personnes sont-elles venues écouter Martin Luther King ?",
            options: [
              "✓Elles partageaient ce qu'il croyait",
              "Leur présence était obligatoire",
              "Un concert était annoncé",
              "Un plan détaillé avait été distribué",
            ],
            c: "DEVCO_PITCH",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Complétez : « Les gens n'achètent pas ce que vous faites, ils achètent… »",
        options: ["✓…pourquoi vous le faites", "…comment vous le faites", "…ce que les autres achètent", "…le moins cher"],
        c: "DEVCO_PITCH",
      },
      {
        enonce: "Pour pitcher votre organisation avec le cercle d'or, quel ordre suivez-vous ?",
        options: ["✓Pourquoi → Comment → Quoi", "Quoi → Comment → Pourquoi", "Comment → Quoi → Pourquoi", "Quoi → Pourquoi → Comment"],
        c: "DEVCO_PITCH",
      },
      {
        enonce: "Quels éléments relèvent du « comment » ?",
        type: "CHOIX_MULTIPLE",
        options: ["✓Votre méthode de travail", "✓Ce qui vous distingue dans la façon de faire", "Votre cause", "La liste de vos prestations"],
        c: "DEVCO_ARGUMENTATION",
      },
      VF("TiVo a échoué commercialement en vendant ce que faisait le produit plutôt que pourquoi.", true, "DEVCO_ARGUMENTATION"),
      {
        enonce: "Le discours de Martin Luther King s'intitule…",
        options: ["✓« I have a dream »", "« I have a plan »", "« Yes we can »", "« We shall overcome »"],
        c: "DEVCO_PITCH",
      },
      {
        enonce: "Innovateurs et adopteurs précoces représentent environ…",
        options: ["✓16 % du marché", "50 % du marché", "2 % du marché", "34 % du marché"],
        c: "DEVCO_ARGUMENTATION",
      },
    ],
  },
  {
    cle: "treasure",
    titre: "Parler pour être écouté",
    resume: "Les sept habitudes qui ruinent une prise de parole, et la boîte à outils de la voix.",
    description:
      "Julian Treasure, spécialiste du son, détaille ce qui fait qu'on décroche quand quelqu'un parle — et comment rendre sa voix plus impactante : registre, timbre, prosodie, rythme, silence. Une base solide avant un pitch, une AG ou une soutenance de mission.",
    objectifs: ["Repérer les sept « péchés capitaux » de la parole", "Appliquer le modèle HAIL", "Utiliser les outils de la voix"],
    domaine: "DEVCO",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "eIho2S0ZahI",
    dureeSec: 598,
    formateur: "amira",
    statut: "PUBLIE",
    tags: ["prise de parole", "voix"],
    competences: [
      ["DEVCO_PRISE_PAROLE", 3],
      ["DEVCO_ECOUTE", 1],
    ],
    points: [
      {
        tempsSec: 180,
        titre: "Les sept péchés",
        questions: [
          {
            enonce: "Lesquelles de ces habitudes font partie des « sept péchés capitaux » de la parole ?",
            type: "CHOIX_MULTIPLE",
            options: ["✓Les commérages", "✓Les plaintes", "✓Les excuses", "Poser des questions", "Marquer des silences"],
            c: "DEVCO_PRISE_PAROLE",
          },
          {
            enonce: "Le dogmatisme, c'est…",
            options: ["✓Confondre les faits et les opinions", "Parler trop vite", "Utiliser du jargon", "Refuser de répondre"],
            c: "DEVCO_ECOUTE",
          },
        ],
      },
      {
        tempsSec: 360,
        titre: "Le modèle HAIL",
        questions: [
          {
            enonce: "Que recouvre l'acronyme HAIL ?",
            options: [
              "✓Honnêteté, authenticité, intégrité, bienveillance",
              "Humour, aisance, impact, logique",
              "Hauteur, articulation, intonation, longueur",
              "Habitude, audace, intention, liberté",
            ],
            c: "DEVCO_PRISE_PAROLE",
          },
          VF("Parler depuis la gorge plutôt que depuis la poitrine donne plus de poids à la voix.", false, "DEVCO_PRISE_PAROLE", "C'est l'inverse : le registre de poitrine porte davantage d'autorité."),
        ],
      },
    ],
    final: [
      {
        enonce: "Qu'est-ce que la prosodie ?",
        options: ["✓La mélodie de la voix, ses variations d'intonation", "La vitesse d'élocution", "Le choix du vocabulaire", "La gestuelle"],
        c: "DEVCO_PRISE_PAROLE",
      },
      {
        enonce: "Quel outil Treasure recommande-t-il pour souligner une idée ?",
        options: ["✓Le silence", "La répétition", "Hausser le ton", "Accélérer"],
        c: "DEVCO_PRISE_PAROLE",
      },
      {
        enonce: "Quels éléments font partie de la boîte à outils vocale ?",
        type: "CHOIX_MULTIPLE",
        options: ["✓Le registre", "✓Le timbre", "✓Le rythme", "✓Le volume", "L'accent régional"],
        c: "DEVCO_PRISE_PAROLE",
      },
      {
        enonce: "Une voix qui répète toujours la même note produit un discours…",
        options: ["✓Monotone, difficile à écouter", "Rassurant et convaincant", "Plus mémorisable", "Plus rapide à comprendre"],
        c: "DEVCO_ECOUTE",
      },
      VF("Treasure conseille des exercices d'échauffement vocal avant une prise de parole importante.", true, "DEVCO_PRISE_PAROLE"),
    ],
  },
  {
    cle: "anderson",
    titre: "Transmettre une idée : la méthode TED",
    resume: "Quatre règles pour qu'une idée passe de votre tête à celle de votre auditoire.",
    description:
      "Chris Anderson, responsable des conférences TED, résume ce que les meilleures interventions ont en commun : une idée unique, une raison de s'y intéresser, une construction pas à pas à partir de ce que le public connaît, et une idée qui vaut la peine d'être partagée.",
    objectifs: ["Limiter une intervention à une idée", "Construire une idée à partir de concepts connus", "Rendre une idée digne d'être partagée"],
    domaine: "DEVCO",
    niveau: "INTERMEDIAIRE",
    fournisseur: "YOUTUBE",
    reference: "-FOCpMAww28",
    dureeSec: 467,
    formateur: "amira",
    statut: "PUBLIE",
    tags: ["prise de parole", "storytelling"],
    competences: [
      ["DEVCO_PRISE_PAROLE", 2],
      ["DEVCO_ARGUMENTATION", 2],
    ],
    points: [
      {
        tempsSec: 210,
        titre: "Une seule idée",
        questions: [
          {
            enonce: "Quelle est la première règle d'Anderson ?",
            options: ["✓Se limiter à une seule idée majeure", "Commencer par une blague", "Montrer beaucoup de données", "Parler sans notes"],
            c: "DEVCO_PRISE_PAROLE",
          },
          {
            enonce: "Comment donner au public une raison de s'intéresser à votre idée ?",
            options: ["✓Éveiller sa curiosité par une question intrigante", "Annoncer la durée exacte", "Citer ses diplômes", "Distribuer un résumé"],
            c: "DEVCO_ARGUMENTATION",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Avec quoi construire son idée devant un public ?",
        options: ["✓Des concepts qu'il comprend déjà", "Du jargon technique", "Des acronymes", "Des citations célèbres"],
        c: "DEVCO_ARGUMENTATION",
      },
      {
        enonce: "Quelle est la quatrième étape ?",
        options: ["✓Rendre l'idée digne d'être partagée", "Conclure par un appel aux dons", "Répéter l'idée trois fois", "Projeter un plan détaillé"],
        c: "DEVCO_PRISE_PAROLE",
      },
      VF("Pour Anderson, le jargon aide à construire une idée claire.", false, "DEVCO_ARGUMENTATION"),
      {
        enonce: "Que cherche à transférer un bon orateur ?",
        options: ["✓Une idée", "Une liste de faits", "Son parcours", "Une émotion sans contenu"],
        c: "DEVCO_PRISE_PAROLE",
      },
      {
        enonce: "Pour Anderson, une idée est…",
        options: [
          "✓Un schéma d'information qui aide à comprendre le monde",
          "Une opinion personnelle",
          "Un slogan",
          "Une statistique frappante",
        ],
        c: "DEVCO_ARGUMENTATION",
      },
    ],
  },
  {
    cle: "godin",
    titre: "Faire connaître son organisation : les idées qui se propagent",
    resume: "Pourquoi « très bien » ne suffit plus, et comment devenir remarquable.",
    description:
      "Seth Godin explique pourquoi la publicité de masse ne marche plus : trop de choix, trop peu de temps. Les idées qui gagnent sont remarquables — dignes qu'on en parle — et visent d'abord les passionnés. Appliquez-le à la communication de votre organisation.",
    objectifs: ["Comprendre la fin du marketing de masse", "Cibler les premiers adopteurs", "Concevoir une offre remarquable"],
    domaine: "MARKETING",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "xBIVlM435Zg",
    dureeSec: 1021,
    formateur: "amira",
    statut: "PUBLIE",
    tags: ["marketing", "stratégie", "bouche-à-oreille"],
    competences: [
      ["MKT_VIRAL", 3],
      ["MKT_STRATEGIE", 2],
      ["MKT_IDENTITE", 1],
    ],
    points: [
      {
        tempsSec: 240,
        titre: "Le pain tranché",
        questions: [
          {
            enonce: "Que montre l'histoire du pain tranché ?",
            options: [
              "✓Le succès d'une idée dépend de sa diffusion, pas seulement de sa qualité",
              "Les bonnes inventions s'imposent toujours",
              "Le prix fait tout",
              "La technologie précède toujours le marketing",
            ],
            c: "MKT_VIRAL",
          },
          {
            enonce: "Pourquoi le modèle « publicité de masse » fonctionne-t-il moins bien ?",
            options: [
              "✓Les gens ont trop de choix et trop peu de temps : ils ignorent",
              "La télévision a disparu",
              "Les produits sont devenus parfaits",
              "La publicité est interdite",
            ],
            c: "MKT_STRATEGIE",
          },
        ],
      },
      {
        tempsSec: 600,
        titre: "Viser les bonnes personnes",
        questions: [
          {
            enonce: "Quel public Godin conseille-t-il de viser en premier ?",
            options: ["✓Les passionnés qui en parleront", "Le grand public", "Les retardataires", "Les concurrents"],
            c: "MKT_VIRAL",
          },
          {
            enonce: "Être « remarquable », pour Godin, c'est…",
            options: ["✓Être digne qu'on en parle", "Être le moins cher", "Faire beaucoup de publicité", "Avoir un joli logo"],
            c: "MKT_IDENTITE",
          },
        ],
      },
    ],
    final: [
      VF("Selon Godin, « très bien » est une stratégie sûre.", false, "MKT_STRATEGIE", "« Très bien », c'est ennuyeux — donc invisible."),
      {
        enonce: "La « vache pourpre » symbolise…",
        options: ["✓L'offre qui se distingue au premier regard", "Un produit de luxe", "Une marque agricole", "Une campagne choc"],
        c: "MKT_IDENTITE",
      },
      {
        enonce: "Quels comportements favorisent la propagation d'une idée ?",
        type: "CHOIX_MULTIPLE",
        options: ["✓Cibler les personnes qui écoutent", "✓Créer quelque chose de remarquable", "✓Faciliter le partage", "Viser la moyenne"],
        c: "MKT_VIRAL",
      },
      {
        enonce: "Aujourd'hui, le plus risqué est de…",
        options: ["✓Jouer la sécurité et rester ennuyeux", "Prendre position", "Tester une idée nouvelle", "Cibler une niche"],
        c: "MKT_STRATEGIE",
      },
      {
        enonce: "Pour une organisation, appliquer Godin signifie d'abord…",
        options: [
          "✓Trouver un angle qui donne envie aux étudiants et clients d'en parler",
          "Acheter des espaces publicitaires",
          "Copier la communication des grandes entreprises",
          "Publier tous les jours le même message",
        ],
        c: "MKT_STRATEGIE",
      },
    ],
  },
  {
    cle: "sivers",
    titre: "Lancer un mouvement en 3 minutes",
    resume: "Le rôle sous-estimé du premier suiveur, démontré sur une piste de danse.",
    description:
      "En trois minutes, Derek Sivers montre comment naît un mouvement : un « fou solitaire », un premier suiveur qui en fait un leader, puis un basculement. Une leçon express pour lancer un projet associatif, un événement ou une nouvelle activité d'organisation.",
    objectifs: ["Comprendre le rôle du premier suiveur", "Rendre un mouvement facile à rejoindre"],
    domaine: "MARKETING",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "V74AxCyOTvg",
    dureeSec: 189,
    formateur: "amira",
    statut: "PUBLIE",
    tags: ["leadership", "mobilisation"],
    competences: [
      ["MKT_VIRAL", 2],
      ["MGT_COLLABORATION", 1],
    ],
    points: [
      {
        tempsSec: 90,
        titre: "Le premier suiveur",
        questions: [
          {
            enonce: "Qui transforme un « fou solitaire » en leader ?",
            options: ["✓Le premier suiveur", "La foule", "Le public en ligne", "Les organisateurs"],
            c: "MKT_VIRAL",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Que doit faire le leader quand arrive son premier suiveur ?",
        options: ["✓L'accueillir comme un égal", "Garder ses distances", "Lui expliquer les règles", "Lui demander de partir"],
        c: "MGT_COLLABORATION",
      },
      VF("Passé un certain point, ne pas rejoindre le mouvement devient le risque social.", true, "MKT_VIRAL"),
      {
        enonce: "Selon Sivers, le premier suiveur est…",
        options: ["✓Une forme sous-estimée de leadership", "Un simple imitateur", "Un rival du leader", "Sans importance"],
        c: "MGT_COLLABORATION",
      },
      {
        enonce: "Un mouvement se propage quand il est…",
        options: ["✓Public et facile à imiter", "Secret et exclusif", "Compliqué et technique", "Réservé aux experts"],
        c: "MKT_VIRAL",
      },
    ],
  },
  {
    cle: "pink",
    titre: "Motiver son équipe : ce que dit la science",
    resume: "Autonomie, maîtrise, finalité : pourquoi les primes ne motivent pas une équipe créative.",
    description:
      "Dan Pink confronte les pratiques de management à la recherche : les récompenses « si… alors » marchent pour les tâches mécaniques, mais freinent les tâches qui demandent de la réflexion. Une formation clé pour tout membre du bureau qui anime des bénévoles.",
    objectifs: ["Distinguer motivation extrinsèque et intrinsèque", "Appliquer autonomie, maîtrise, finalité à votre équipe"],
    domaine: "MANAGEMENT",
    niveau: "INTERMEDIAIRE",
    fournisseur: "YOUTUBE",
    reference: "rrkrvAUbU9Y",
    dureeSec: 1116,
    formateur: "karim",
    statut: "PUBLIE",
    tags: ["motivation", "management", "bénévolat"],
    competences: [
      ["MGT_MOTIVATION", 3],
      ["MGT_DELEGATION", 1],
    ],
    points: [
      {
        tempsSec: 270,
        titre: "Le problème de la bougie",
        questions: [
          {
            enonce: "Dans le problème de la bougie, quelle est la clé de la solution ?",
            options: [
              "✓Voir la boîte de punaises comme un support, pas seulement un contenant",
              "Faire fondre la cire",
              "Planter la bougie dans le mur",
              "Utiliser plus d'allumettes",
            ],
            c: "MGT_MOTIVATION",
            explication: "C'est la « fixité fonctionnelle » : on ne voit la boîte que comme un contenant.",
          },
          {
            enonce: "Le groupe auquel on promettait une récompense a été…",
            options: ["✓Plus lent, de plusieurs minutes en moyenne", "Plus rapide", "Aussi rapide", "Incapable de résoudre"],
            c: "MGT_MOTIVATION",
          },
        ],
      },
      {
        tempsSec: 630,
        titre: "Quand les primes marchent",
        questions: [
          {
            enonce: "Pour quelles tâches les récompenses « si… alors » fonctionnent-elles ?",
            options: ["✓Les tâches simples aux règles claires", "Les tâches créatives", "Les tâches stratégiques", "Aucune"],
            c: "MGT_MOTIVATION",
          },
          VF("Plus la récompense est élevée, meilleure est la performance sur une tâche créative.", false, "MGT_MOTIVATION"),
        ],
      },
      {
        tempsSec: 900,
        titre: "La nouvelle approche",
        questions: [
          {
            enonce: "Quels sont les trois piliers de la motivation intrinsèque ?",
            type: "CHOIX_MULTIPLE",
            options: ["✓Autonomie", "✓Maîtrise", "✓Finalité", "Prime", "Contrôle"],
            c: "MGT_MOTIVATION",
          },
          {
            enonce: "Que sont les « journées FedEx » d'Atlassian ?",
            options: [
              "✓24 heures pour travailler sur ce qu'on veut et livrer le lendemain",
              "Des journées de livraison express",
              "Des journées sans réunion",
              "Des primes de fin d'année",
            ],
            c: "MGT_DELEGATION",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Que désigne ROWE ?",
        options: ["✓Un environnement de travail jugé uniquement sur les résultats", "Une méthode de recrutement", "Un logiciel de suivi", "Un système de primes"],
        c: "MGT_DELEGATION",
      },
      {
        enonce: "La victoire de Wikipédia sur Encarta illustre…",
        options: ["✓La puissance de la motivation intrinsèque", "La supériorité des grands budgets", "Le rôle de la publicité", "Le hasard"],
        c: "MGT_MOTIVATION",
      },
      {
        enonce: "Pour motiver une équipe d'organisation sur un projet créatif, Pink conseillerait…",
        options: ["✓Plus d'autonomie et un sens clair", "Une prime au meilleur", "Un contrôle quotidien", "Un classement public"],
        c: "MGT_MOTIVATION",
      },
      {
        enonce: "La « fixité fonctionnelle » désigne…",
        options: [
          "✓La difficulté à voir un objet autrement que par son usage habituel",
          "Un horaire de travail fixe",
          "Une fonction figée dans l'organigramme",
          "Un budget non modifiable",
        ],
        c: "MGT_MOTIVATION",
      },
      VF("Pour Pink, les incitations financières sont toujours inefficaces.", false, "MGT_MOTIVATION", "Elles marchent pour les tâches mécaniques."),
      {
        enonce: "Le décalage que dénonce Pink est entre…",
        options: ["✓Ce que la science sait et ce que font les entreprises", "Les salaires et les primes", "Les jeunes et les seniors", "Le marketing et la vente"],
        c: "MGT_MOTIVATION",
      },
    ],
  },
  {
    cle: "wujec",
    titre: "Le défi du marshmallow : prototyper en équipe",
    resume: "Pourquoi les enfants battent les diplômés d'école de commerce — et ce qu'en tire un chef de projet.",
    description:
      "Vingt spaghettis, du ruban adhésif, de la ficelle et un marshmallow : Tom Wujec analyse des centaines d'équipes et montre la force du prototypage itératif face à la planification parfaite. Indispensable avant de lancer une mission ou un événement.",
    objectifs: ["Comprendre l'intérêt du prototypage itératif", "Identifier les hypothèses cachées d'un projet"],
    domaine: "MANAGEMENT",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "H0_yKBitO8M",
    dureeSec: 411,
    formateur: "karim",
    statut: "PUBLIE",
    tags: ["gestion de projet", "équipe", "agilité"],
    competences: [
      ["MGT_PROTOTYPAGE", 3],
      ["MGT_COLLABORATION", 2],
    ],
    points: [
      {
        tempsSec: 150,
        titre: "Qui gagne ?",
        questions: [
          {
            enonce: "Pourquoi les jeunes diplômés d'école de commerce font-ils moins bien que les enfants ?",
            options: [
              "✓Ils planifient longtemps la bonne solution et manquent de temps",
              "Ils ne comprennent pas les règles",
              "Ils travaillent seuls",
              "Ils trichent",
            ],
            c: "MGT_PROTOTYPAGE",
          },
          {
            enonce: "Combien de temps dure le défi ?",
            options: ["✓18 minutes", "5 minutes", "45 minutes", "Une heure"],
            c: "MGT_PROTOTYPAGE",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Quelles équipes s'améliorent nettement en présence d'assistants de direction ?",
        options: ["✓Les équipes de dirigeants", "Les équipes d'enfants", "Les équipes d'avocats", "Aucune"],
        c: "MGT_COLLABORATION",
        explication: "Les compétences de facilitation changent la dynamique de l'équipe.",
      },
      {
        enonce: "Quand une récompense de 10 000 $ a été promise…",
        options: ["✓Aucune équipe n'a réussi", "Toutes ont réussi", "Les tours étaient deux fois plus hautes", "Le défi a été annulé"],
        c: "MGT_PROTOTYPAGE",
      },
      {
        enonce: "Dans un projet, le marshmallow symbolise…",
        options: ["✓Les hypothèses cachées qu'il faut tester tôt", "Le budget", "Le client", "La récompense finale"],
        c: "MGT_PROTOTYPAGE",
      },
      VF("Construire par itérations, en testant tôt, améliore le résultat.", true, "MGT_PROTOTYPAGE"),
      {
        enonce: "Quelles sont les meilleures équipes au défi ?",
        options: ["✓Les architectes et ingénieurs", "Les avocats", "Les étudiants en commerce", "Les PDG seuls"],
        c: "MGT_COLLABORATION",
      },
    ],
  },
  {
    cle: "heffernan",
    titre: "Au-delà des superstars : bâtir une équipe qui réussit",
    resume: "L'entraide et la confiance comptent plus que les talents individuels.",
    description:
      "À partir d'une expérience sur des poules et d'une étude du MIT, Margaret Heffernan montre que les équipes les plus performantes ne sont pas celles qui réunissent les meilleurs individus, mais celles où l'on s'entraide. Une formation pour les bureaux exécutifs et les chefs de projet.",
    objectifs: ["Comprendre le capital social d'une équipe", "Favoriser l'entraide et l'équilibre de la parole"],
    domaine: "MANAGEMENT",
    niveau: "INTERMEDIAIRE",
    fournisseur: "YOUTUBE",
    reference: "Vyn_xLrtZaY",
    dureeSec: 948,
    formateur: "karim",
    statut: "PUBLIE",
    tags: ["équipe", "collaboration", "culture"],
    competences: [
      ["MGT_COLLABORATION", 3],
      ["MGT_FEEDBACK", 1],
    ],
    points: [
      {
        tempsSec: 240,
        titre: "Les super-poules",
        questions: [
          {
            enonce: "Dans l'expérience de William Muir, qu'est-il arrivé au groupe de « super-poules » ?",
            options: [
              "✓Seules trois ont survécu, les autres s'étant entretuées",
              "Elles ont pondu deux fois plus",
              "Elles ont formé une équipe soudée",
              "Rien de notable",
            ],
            c: "MGT_COLLABORATION",
          },
        ],
      },
      {
        tempsSec: 600,
        titre: "L'étude du MIT",
        questions: [
          {
            enonce: "Qu'avaient en commun les équipes les plus performantes de l'étude du MIT ?",
            type: "CHOIX_MULTIPLE",
            options: ["✓Une forte sensibilité sociale", "✓Un temps de parole équilibré", "✓Davantage de femmes", "Un leader brillant", "Un QI moyen élevé"],
            c: "MGT_COLLABORATION",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Le « capital social » d'une équipe désigne…",
        options: ["✓La confiance et l'entraide construites entre ses membres", "Son budget", "Le nombre de ses membres", "Ses diplômes"],
        c: "MGT_COLLABORATION",
      },
      VF("Recruter uniquement des superstars garantit la meilleure équipe.", false, "MGT_COLLABORATION"),
      {
        enonce: "Pour Heffernan, l'aide mutuelle est…",
        options: ["✓Un moteur de la performance collective", "Une perte de temps", "Une affaire de personnalité", "Réservée aux débutants"],
        c: "MGT_FEEDBACK",
      },
      {
        enonce: "Ce qui rend une équipe performante, c'est surtout…",
        options: ["✓La qualité des relations entre ses membres", "La somme des talents individuels", "La pression des objectifs", "La compétition interne"],
        c: "MGT_COLLABORATION",
      },
    ],
  },
  {
    cle: "urban",
    titre: "Vaincre la procrastination",
    resume: "Le singe, le monstre de la panique, et les échéances qui n'existent pas.",
    description:
      "Tim Urban raconte avec humour ce qui se passe dans la tête d'un procrastinateur — et pourquoi les projets sans échéance sont les plus dangereux. Une formation utile à tout membre qui jongle entre études, missions et responsabilités associatives.",
    objectifs: ["Identifier les mécanismes de la procrastination", "Créer des échéances intermédiaires"],
    domaine: "MANAGEMENT",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "arj7oStGLkU",
    dureeSec: 843,
    formateur: "karim",
    statut: "PUBLIE",
    tags: ["organisation", "temps", "productivité"],
    competences: [["MGT_TEMPS", 3]],
    points: [
      {
        tempsSec: 240,
        titre: "Les personnages",
        questions: [
          {
            enonce: "Qui prend le contrôle du cerveau du procrastinateur ?",
            options: ["✓Le singe de la gratification instantanée", "Le décideur rationnel", "Le monstre de la panique", "Le chef de projet"],
            c: "MGT_TEMPS",
          },
          {
            enonce: "Quel personnage fait reprendre le travail juste avant l'échéance ?",
            options: ["✓Le monstre de la panique", "Le singe", "Le professeur", "Le client"],
            c: "MGT_TEMPS",
          },
        ],
      },
      {
        tempsSec: 540,
        titre: "Le terrain de jeu sombre",
        questions: [
          {
            enonce: "Comment Urban appelle-t-il l'endroit où l'on se détend… sans plaisir réel ?",
            options: ["✓Le terrain de jeu sombre", "La zone de confort", "Le jardin secret", "La salle d'attente"],
            c: "MGT_TEMPS",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Quelle procrastination est la plus dangereuse selon Urban ?",
        options: ["✓Celle qui porte sur des projets sans échéance", "Celle des étudiants", "Celle du lundi", "Celle des tâches courtes"],
        c: "MGT_TEMPS",
      },
      {
        enonce: "Une vie de 90 ans compte environ combien de semaines ?",
        options: ["✓Environ 4 700", "Environ 900", "Environ 12 000", "Environ 47 000"],
        c: "MGT_TEMPS",
      },
      VF("Selon Urban, tout le monde procrastine sur quelque chose.", true, "MGT_TEMPS"),
      {
        enonce: "Pour un projet d'organisation sans échéance, le meilleur réflexe est de…",
        options: ["✓Créer des échéances intermédiaires visibles", "Attendre l'inspiration", "Tout faire la veille", "Le confier au président"],
        c: "MGT_TEMPS",
      },
    ],
  },
  {
    cle: "achor",
    titre: "Le bonheur, avantage de performance",
    resume: "Pourquoi une équipe positive travaille mieux — et cinq habitudes pour y arriver.",
    description:
      "Shawn Achor renverse une idée reçue : on ne devient pas heureux en réussissant, on réussit mieux en étant positif. Pour un responsable RH d'organisation, c'est une clé de l'engagement des membres bénévoles.",
    objectifs: ["Comprendre l'avantage du bonheur", "Mettre en place des habitudes positives dans l'équipe"],
    domaine: "RH",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "fLJsdqxnZb0",
    dureeSec: 740,
    formateur: "leila",
    statut: "PUBLIE",
    tags: ["bien-être", "engagement", "psychologie positive"],
    competences: [
      ["RH_BIEN_ETRE", 3],
      ["MGT_MOTIVATION", 1],
    ],
    points: [
      {
        tempsSec: 240,
        titre: "La formule cassée",
        questions: [
          {
            enonce: "Pourquoi « travailler plus → réussir → être heureux » ne fonctionne-t-il pas ?",
            options: [
              "✓Chaque réussite déplace l'objectif, le bonheur recule",
              "Le travail rend malheureux",
              "La réussite est impossible",
              "Le bonheur est génétique",
            ],
            c: "RH_BIEN_ETRE",
          },
        ],
      },
      {
        tempsSec: 540,
        titre: "Le cerveau positif",
        questions: [
          {
            enonce: "Un cerveau en état positif est environ … plus productif.",
            options: ["✓31 %", "5 %", "100 %", "12 %"],
            c: "RH_BIEN_ETRE",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Quelles habitudes Achor propose-t-il de pratiquer pendant 21 jours ?",
        type: "CHOIX_MULTIPLE",
        options: ["✓Noter trois gratitudes", "✓Tenir un journal", "✓Faire de l'exercice", "✓Méditer", "Travailler le week-end"],
        c: "RH_BIEN_ETRE",
      },
      {
        enonce: "Quelle part de la réussite professionnelle le QI prédit-il ?",
        options: ["✓Environ 25 %", "Environ 75 %", "Environ 90 %", "Environ 5 %"],
        c: "RH_BIEN_ETRE",
      },
      {
        enonce: "L'« avantage du bonheur », c'est…",
        options: ["✓Une performance qui augmente quand l'humeur est positive", "Un congé supplémentaire", "Une prime", "Un trait de caractère inné"],
        c: "MGT_MOTIVATION",
      },
      VF("Achor recommande d'attendre d'avoir réussi pour s'autoriser à être heureux.", false, "RH_BIEN_ETRE"),
    ],
  },
  {
    cle: "duckworth",
    titre: "La persévérance, clé de la réussite",
    resume: "Passion et persévérance pour les objectifs à long terme : ce que mesure le « grit ».",
    description:
      "Angela Duckworth a étudié des cadets de West Point, des commerciaux et des enseignants débutants : ce qui prédit la réussite n'est pas le talent mais la persévérance. Utile pour recruter, accompagner et fidéliser les membres d'une organisation.",
    objectifs: ["Définir le grit", "Encourager un état d'esprit de croissance"],
    domaine: "RH",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "H14bBuluwB8",
    dureeSec: 372,
    formateur: "leila",
    statut: "PUBLIE",
    tags: ["persévérance", "recrutement"],
    competences: [
      ["RH_PERSEVERANCE", 3],
      ["RH_RECRUTEMENT", 1],
    ],
    points: [
      {
        tempsSec: 150,
        titre: "Définir le grit",
        questions: [
          {
            enonce: "Comment Duckworth définit-elle le « grit » ?",
            options: [
              "✓Passion et persévérance pour des objectifs à très long terme",
              "Un QI élevé",
              "Le talent naturel",
              "La capacité à travailler vite",
            ],
            c: "RH_PERSEVERANCE",
          },
          {
            enonce: "Auprès de qui a-t-elle étudié la persévérance ?",
            type: "CHOIX_MULTIPLE",
            options: ["✓Des cadets de West Point", "✓Des participants à un concours d'orthographe", "✓Des commerciaux", "Des chefs cuisiniers"],
            c: "RH_RECRUTEMENT",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Quelle idée cite-t-elle pour développer la persévérance ?",
        options: ["✓L'état d'esprit de croissance (Carol Dweck)", "La méthode Pomodoro", "Le management par objectifs", "La gamification"],
        c: "RH_PERSEVERANCE",
      },
      VF("Pour Duckworth, le talent garantit la persévérance.", false, "RH_PERSEVERANCE"),
      {
        enonce: "Avoir du grit, c'est vivre la vie comme…",
        options: ["✓Un marathon, pas un sprint", "Un sprint permanent", "Une course d'obstacles", "Une promenade"],
        c: "RH_PERSEVERANCE",
      },
    ],
  },
  {
    cle: "brown",
    titre: "Le pouvoir de la vulnérabilité",
    resume: "Courage, authenticité et connexion : les fondations d'une équipe de confiance.",
    description:
      "Brené Brown a étudié la honte et la connexion pendant des années. Sa conclusion : les personnes qui vivent « de tout cœur » ont le courage d'être imparfaites. Une formation pour mieux donner du feedback et créer la confiance dans une équipe.",
    objectifs: ["Comprendre le lien entre vulnérabilité et connexion", "Créer un climat de confiance"],
    domaine: "RH",
    niveau: "INTERMEDIAIRE",
    fournisseur: "YOUTUBE",
    reference: "iCvmsMzlF7o",
    dureeSec: 1219,
    formateur: "leila",
    statut: "PUBLIE",
    tags: ["confiance", "leadership", "feedback"],
    competences: [
      ["RH_CONFIANCE", 3],
      ["MGT_FEEDBACK", 1],
    ],
    points: [
      {
        tempsSec: 360,
        titre: "La honte",
        questions: [
          {
            enonce: "Qu'est-ce que la honte, selon Brené Brown ?",
            options: ["✓La peur de la déconnexion", "Un sentiment de culpabilité passager", "Une émotion utile au travail", "Un manque de confiance en soi"],
            c: "RH_CONFIANCE",
          },
        ],
      },
      {
        tempsSec: 780,
        titre: "Vivre de tout cœur",
        questions: [
          {
            enonce: "Qu'ont en commun les personnes qui vivent « de tout cœur » ?",
            type: "CHOIX_MULTIPLE",
            options: ["✓Le courage", "✓La compassion", "✓Une connexion née de l'authenticité", "Le perfectionnisme"],
            c: "RH_CONFIANCE",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Quand on anesthésie la vulnérabilité, on anesthésie aussi…",
        options: ["✓La joie et la gratitude", "Uniquement la peur", "Uniquement la tristesse", "Rien d'autre"],
        c: "RH_CONFIANCE",
      },
      VF("Pour Brené Brown, être vulnérable est un signe de faiblesse.", false, "RH_CONFIANCE"),
      {
        enonce: "Le mot « courage » vient du latin « cor », qui signifie…",
        options: ["✓Cœur", "Force", "Guerre", "Corps"],
        c: "RH_CONFIANCE",
      },
      {
        enonce: "Dans un feedback, la vulnérabilité consiste à…",
        options: ["✓Oser dire ce que l'on ressent et reconnaître sa part", "Éviter les sujets difficiles", "Se montrer infaillible", "Déléguer la discussion"],
        c: "MGT_FEEDBACK",
      },
    ],
  },
  /* ---------------------------------------------------- capsules locales */
  {
    cle: "caisse",
    titre: "Tenir sa caisse au jour le jour",
    resume: "Capsule : brouillard de caisse, comptage mensuel et les trois réflexes du trésorier.",
    description:
      "Une capsule courte pour les trésoriers et leurs adjoints : comment tenir un brouillard de caisse, organiser le comptage mensuel et ne jamais se retrouver avec un écart inexpliqué.",
    objectifs: ["Tenir un brouillard de caisse", "Organiser un comptage mensuel signé"],
    domaine: "FINANCE",
    niveau: "DEBUTANT",
    fournisseur: "MP4",
    reference: "/videos/tresorerie-caisse.mp4",
    dureeSec: 72,
    formateur: "yanis",
    statut: "PUBLIE",
    tags: ["trésorerie", "capsule"],
    competences: [["FIN_CAISSE", 3]],
    points: [
      {
        tempsSec: 40,
        titre: "Le brouillard de caisse",
        questions: [
          {
            enonce: "Quand note-t-on un mouvement dans le brouillard de caisse ?",
            options: ["✓Le jour même", "À la fin du mois", "À la fin du mandat", "Quand on y pense"],
            c: "FIN_CAISSE",
          },
          {
            enonce: "Que contient chaque ligne du brouillard ?",
            type: "CHOIX_MULTIPLE",
            options: ["✓La date", "✓Le libellé", "✓Le montant en entrée ou en sortie", "✓La pièce justificative", "Le nom de l'ancien trésorier"],
            c: "FIN_CAISSE",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "À quelle fréquence compter les espèces devant un témoin ?",
        options: ["✓Chaque mois", "Chaque année", "Jamais", "Seulement en cas de problème"],
        c: "FIN_CAISSE",
      },
      {
        enonce: "Que faire d'un écart de caisse ?",
        options: ["✓L'expliquer par écrit, sans l'effacer", "Le corriger discrètement", "L'ignorer s'il est faible", "Le compenser de sa poche"],
        c: "FIN_CAISSE",
      },
      VF("On peut dépenser sans validation préalable si le montant est faible.", false, "FIN_CAISSE"),
    ],
  },
  {
    cle: "facturation",
    titre: "Facturer en règle",
    resume: "Capsule : mentions obligatoires, reçu ou facture, litige client, archivage.",
    description:
      "Ce qu'une facture doit contenir, la différence avec un reçu, et le réflexe à avoir quand un client la conteste.",
    objectifs: ["Émettre une facture conforme", "Distinguer reçu et facture"],
    domaine: "FINANCE",
    niveau: "DEBUTANT",
    fournisseur: "MP4",
    reference: "/videos/tresorerie-facturation.mp4",
    dureeSec: 72,
    formateur: "yanis",
    statut: "PUBLIE",
    visibleCatalogue: false,
    tags: ["trésorerie", "fiscalité", "capsule"],
    competences: [
      ["FIN_FACTURATION", 3],
      ["FIN_FISCALITE", 1],
    ],
    points: [
      {
        tempsSec: 40,
        titre: "Reçu ou facture",
        questions: [
          {
            enonce: "Un reçu constate…",
            options: ["✓Un encaissement (cotisation, don, remboursement)", "Une prestation vendue", "Un devis accepté", "Un contrat signé"],
            c: "FIN_FACTURATION",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Quelles mentions une facture doit-elle porter ?",
        type: "CHOIX_MULTIPLE",
        options: ["✓Un numéro unique et chronologique", "✓L'identité des deux parties", "✓Les montants HT, taxes et TTC", "La signature du client"],
        c: "FIN_FACTURATION",
      },
      {
        enonce: "Un client conteste une facture : que fait-on d'abord ?",
        options: ["✓Relire le devis signé et le bon de commande", "Réécrire la facture sous le même numéro", "L'annuler sans rien dire", "Ignorer la contestation"],
        c: "FIN_FISCALITE",
      },
      VF("Il suffit d'archiver les factures émises ; les factures reçues sont facultatives.", false, "FIN_FACTURATION"),
    ],
  },
  {
    cle: "cloture",
    titre: "La clôture mensuelle",
    resume: "Capsule : clôturer chaque mois, même à vide, et bien la préparer.",
    description: "Le principe et le calendrier de la clôture mensuelle : rapprocher les pièces, justifier chaque ligne, constater même un mois vide.",
    objectifs: ["Respecter le calendrier de clôture", "Préparer la clôture à partir des pièces"],
    domaine: "FINANCE",
    niveau: "INTERMEDIAIRE",
    fournisseur: "MP4",
    reference: "/videos/tresorerie-cloture.mp4",
    dureeSec: 56,
    formateur: "yanis",
    statut: "PUBLIE",
    visibleCatalogue: false,
    tags: ["trésorerie", "clôture", "capsule"],
    competences: [["FIN_FISCALITE", 3]],
    points: [
      {
        tempsSec: 24,
        titre: "Le principe",
        questions: [VF("Un mois sans aucun mouvement se clôture quand même.", true, "FIN_FISCALITE")],
      },
    ],
    final: [
      {
        enonce: "Quand clôture-t-on le mois M ?",
        options: ["✓Dans les premiers jours du mois M+1", "En fin d'année", "Le dernier jour du mois M", "Au choix"],
        c: "FIN_FISCALITE",
      },
      {
        enonce: "Comment préparer la clôture ?",
        options: ["✓Rapprocher les factures du journal de trésorerie", "Estimer les montants", "Recopier le mois précédent", "Attendre un contrôle"],
        c: "FIN_FISCALITE",
      },
    ],
  },
  {
    cle: "juridique",
    titre: "Gouvernance associative : les obligations",
    resume: "Capsule : registres, assemblées et conformité — l'essentiel en une minute.",
    description: "Les obligations légales d'une organisation constituée en association, et pourquoi la conformité est un atout.",
    objectifs: ["Connaître les registres obligatoires", "Préparer les rendez-vous annuels"],
    domaine: "JURIDIQUE",
    niveau: "DEBUTANT",
    fournisseur: "MP4",
    reference: "/videos/juridique-statut.mp4",
    dureeSec: 72,
    formateur: "sana",
    statut: "PUBLIE",
    tags: ["juridique", "gouvernance", "capsule"],
    competences: [
      ["JUR_STATUTS", 2],
      ["JUR_REGISTRES", 2],
    ],
    points: [
      {
        tempsSec: 40,
        titre: "Les registres",
        questions: [
          VF("Une association peut partager ses bénéfices entre ses membres.", false, "JUR_STATUTS"),
          {
            enonce: "Quels registres une association doit-elle tenir ?",
            type: "CHOIX_MULTIPLE",
            options: ["✓Le registre des membres", "✓Le registre des délibérations", "✓Le registre des aides et dons", "Le registre des anniversaires"],
            c: "JUR_REGISTRES",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Chaque décision de l'assemblée générale fait l'objet…",
        options: ["✓D'un procès-verbal", "D'un message sur le groupe", "D'une affiche", "De rien de particulier"],
        c: "JUR_REGISTRES",
      },
      {
        enonce: "Pourquoi la conformité est-elle un atout pour une organisation ?",
        options: ["✓Elle rassure clients et partenaires", "Elle permet de payer moins d'impôts", "Elle dispense d'AG", "Elle est facultative"],
        c: "JUR_STATUTS",
      },
      VF("Le renouvellement du bureau suit les règles fixées par les statuts.", true, "JUR_STATUTS"),
    ],
  },
  {
    cle: "odd",
    titre: "Les ODD expliqués aux organisations",
    resume: "Capsule : 17 objectifs, en choisir trois, et passer à l'action.",
    description: "Les Objectifs de développement durable de l'ONU appliqués à une organisation : choisir ceux qui comptent et les relier à des actions mesurables.",
    objectifs: ["Connaître les ODD", "Choisir des ODD adaptés à son organisation"],
    domaine: "RSE",
    niveau: "DEBUTANT",
    fournisseur: "MP4",
    reference: "/videos/rse-odd.mp4",
    dureeSec: 72,
    formateur: "sana",
    statut: "PUBLIE",
    tags: ["RSE", "ODD", "capsule"],
    competences: [
      ["RSE_ODD", 3],
      ["RSE_ENGAGEMENT", 1],
    ],
    points: [
      {
        tempsSec: 40,
        titre: "17 objectifs",
        questions: [
          { enonce: "Combien y a-t-il d'Objectifs de développement durable ?", options: ["✓17", "10", "12", "25"], c: "RSE_ODD" },
          { enonce: "À quelle échéance les ODD doivent-ils être atteints ?", options: ["✓2030", "2025", "2050", "2100"], c: "RSE_ODD" },
        ],
      },
    ],
    final: [
      {
        enonce: "Combien d'ODD une organisation crédible devrait-elle cibler ?",
        options: ["✓Deux ou trois, liés à son activité", "Les dix-sept", "Un seul, toujours le climat", "Aucun"],
        c: "RSE_ODD",
      },
      {
        enonce: "Pour chaque ODD retenu, il faut…",
        type: "CHOIX_MULTIPLE",
        options: ["✓Une action concrète", "✓Un indicateur chiffré", "✓Un responsable", "Un nouveau logo"],
        c: "RSE_ENGAGEMENT",
      },
      VF("Le bilan RSE se présente à l'assemblée générale.", true, "RSE_ENGAGEMENT"),
    ],
  },
  {
    cle: "impact",
    titre: "Mesurer son impact",
    resume: "Capsule : trois indicateurs simples et un bilan qui convainc.",
    description: "Ce qui ne se mesure pas ne se pilote pas : trois indicateurs d'impact à la portée de toute organisation, et comment les raconter.",
    objectifs: ["Choisir des indicateurs d'impact", "Publier un bilan d'impact"],
    domaine: "RSE",
    niveau: "INTERMEDIAIRE",
    fournisseur: "MP4",
    reference: "/videos/rse-impact.mp4",
    dureeSec: 56,
    formateur: "sana",
    statut: "PUBLIE",
    visibleCatalogue: false,
    tags: ["RSE", "impact", "capsule"],
    competences: [
      ["RSE_IMPACT", 3],
      ["RSE_RECIT", 1],
    ],
    points: [
      {
        tempsSec: 24,
        titre: "Pourquoi chiffrer",
        questions: [
          {
            enonce: "Pourquoi chiffrer son engagement RSE ?",
            options: ["✓Ce qui ne se mesure pas ne se pilote pas", "Pour obtenir un label payant", "C'est une obligation légale", "Pour remplir un rapport"],
            c: "RSE_IMPACT",
          },
        ],
      },
    ],
    final: [
      {
        enonce: "Lesquels sont des indicateurs d'impact simples pour une organisation ?",
        type: "CHOIX_MULTIPLE",
        options: ["✓Heures de bénévolat de compétences offertes", "✓Papier économisé grâce à la dématérialisation", "✓Part des missions à impact social", "Nombre d'abonnés du président"],
        c: "RSE_IMPACT",
      },
      {
        enonce: "Quand publier un bilan d'impact ?",
        options: ["✓À chaque fin de mandat", "Jamais", "Tous les dix ans", "Seulement en cas de crise"],
        c: "RSE_RECIT",
      },
    ],
  },
  /* ------------------------------------------- circuit de validation */
  {
    cle: "robinson",
    titre: "La créativité, compétence oubliée",
    resume: "Ken Robinson sur la place de la créativité dans l'éducation… et dans vos équipes.",
    description:
      "Une conférence culte sur la créativité et la peur de se tromper. Proposée pour le parcours Management, elle attend la validation d'un administrateur.",
    objectifs: ["Encourager la prise de risque créative"],
    domaine: "MANAGEMENT",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "iG9CE55wbtY",
    dureeSec: 1164,
    formateur: "karim",
    statut: "EN_VALIDATION",
    tags: ["créativité", "innovation"],
    competences: [["MGT_STRATEGIE", 2]],
    points: [
      {
        tempsSec: 420,
        titre: "Se tromper",
        questions: [
          VF("Pour Ken Robinson, si l'on n'est pas prêt à se tromper, on ne produira jamais rien d'original.", true, "MGT_STRATEGIE"),
        ],
      },
    ],
    final: [
      {
        enonce: "Selon Robinson, la créativité est aussi importante que…",
        options: ["✓L'alphabétisation", "La gymnastique", "La comptabilité", "La ponctualité"],
        c: "MGT_STRATEGIE",
      },
      VF("Robinson pense que l'école encourage naturellement la créativité.", false, "MGT_STRATEGIE"),
      {
        enonce: "Que craignent les adultes, d'après lui, et que ne craignent pas les enfants ?",
        options: ["✓Se tromper", "Parler en public", "Le changement", "L'échec scolaire"],
        c: "MGT_STRATEGIE",
      },
    ],
  },
  {
    cle: "cutts",
    titre: "30 jours pour une nouvelle habitude",
    resume: "Une méthode simple pour essayer, et garder, une nouvelle habitude.",
    description: "Matt Cutts propose d'essayer quelque chose de nouveau pendant 30 jours. Soumise par Leila Haddad, en attente de validation.",
    objectifs: ["Installer une habitude en 30 jours"],
    domaine: "RH",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "UNP03fDSj1U",
    dureeSec: 207,
    formateur: "leila",
    statut: "EN_VALIDATION",
    tags: ["habitudes", "développement personnel"],
    competences: [["RH_PERSEVERANCE", 2]],
    points: [
      {
        tempsSec: 90,
        titre: "Le principe",
        questions: [{ enonce: "Combien de jours dure chaque défi proposé ?", options: ["✓30", "7", "100", "365"], c: "RH_PERSEVERANCE" }],
      },
    ],
    final: [
      VF("Selon Cutts, les petits changements durables tiennent mieux que les grands défis fous.", true, "RH_PERSEVERANCE"),
      {
        enonce: "Qu'est-ce que ces défis lui ont apporté ?",
        options: ["✓Des mois plus mémorables et plus de confiance en lui", "De l'argent", "Une promotion", "Rien"],
        c: "RH_PERSEVERANCE",
      },
    ],
  },
  {
    cle: "mcgonigal",
    titre: "Faire du stress un allié",
    resume: "Brouillon — changer son regard sur le stress pendant les périodes de rush.",
    description: "Brouillon en cours de rédaction par Leila Haddad.",
    objectifs: ["Changer sa relation au stress"],
    domaine: "RH",
    niveau: "INTERMEDIAIRE",
    fournisseur: "YOUTUBE",
    reference: "RcGyVTAoXEU",
    dureeSec: 868,
    formateur: "leila",
    statut: "BROUILLON",
    tags: ["stress", "bien-être"],
    competences: [["RH_BIEN_ETRE", 2]],
    points: [],
    final: [],
  },
  {
    cle: "stjohn",
    titre: "Les 8 secrets du succès",
    resume: "Huit mots tirés de centaines d'entretiens avec des personnes qui ont réussi.",
    description: "Une synthèse en trois minutes. Proposée par Amira Trabelsi, renvoyée pour compléments.",
    objectifs: ["Identifier les leviers de la réussite"],
    domaine: "RH",
    niveau: "DEBUTANT",
    fournisseur: "YOUTUBE",
    reference: "Y6bbMQXQ180",
    dureeSec: 210,
    formateur: "amira",
    statut: "REFUSE",
    motifRefus:
      "Le quiz final ne comporte que deux questions : ajoutez-en au moins cinq et rattachez chacune à une compétence, puis soumettez à nouveau.",
    tags: ["réussite"],
    competences: [["RH_PERSEVERANCE", 1]],
    points: [],
    final: [
      { enonce: "Combien de secrets Richard St. John présente-t-il ?", options: ["✓8", "3", "10", "12"], c: "RH_PERSEVERANCE" },
      VF("La passion fait partie des secrets cités.", true, "RH_PERSEVERANCE"),
    ],
  },
];

export type ParcoursSemence = {
  cle: string;
  titre: string;
  sousTitre: string;
  description: string;
  domaine: string;
  etapes: string[];
  auteur: string;
  statut: "PUBLIE" | "EN_VALIDATION";
  modele: string;
  intitule?: string;
};

export const PARCOURS: ParcoursSemence[] = [
  {
    cle: "pitch",
    titre: "Pitcher avec impact",
    sousTitre: "Convaincre un client, un jury ou un partenaire",
    description:
      "Trois formations pour présenter votre organisation à un client, un jury ou un partenaire : commencer par le pourquoi, travailler sa voix, transmettre une idée claire.",
    domaine: "DEVCO",
    etapes: ["sinek", "treasure", "anderson"],
    auteur: "dc",
    statut: "PUBLIE",
    modele: "DEVCO",
    intitule: "pour avoir suivi le parcours certifiant « {{parcours}} », réussi ses évaluations et démontré sa capacité à pitcher avec impact.",
  },
  {
    cle: "equipe",
    titre: "Piloter une équipe",
    sousTitre: "Faire avancer une équipe de bénévoles",
    description:
      "Motiver des bénévoles, prototyper en équipe, construire la confiance et tenir les délais : le socle du management associatif en quatre formations.",
    domaine: "MANAGEMENT",
    etapes: ["pink", "wujec", "heffernan", "urban"],
    auteur: "karim",
    statut: "PUBLIE",
    modele: "MANAGEMENT",
  },
  {
    cle: "tresorerie",
    titre: "Trésorerie et conformité d'une organisation",
    sousTitre: "Tenir ses comptes et passer un audit sereinement",
    description:
      "Quatre capsules pour prendre en main la trésorerie et les obligations d'une association : caisse, facturation, clôture mensuelle et registres.",
    domaine: "FINANCE",
    etapes: ["caisse", "facturation", "cloture", "juridique"],
    auteur: "yanis",
    statut: "PUBLIE",
    modele: "FINANCE",
  },
  {
    cle: "rse",
    titre: "Agir pour un impact durable",
    sousTitre: "Une démarche RSE que l'on peut prouver",
    description: "Deux capsules pour engager votre organisation dans une démarche RSE crédible : choisir ses ODD et mesurer son impact.",
    domaine: "RSE",
    etapes: ["odd", "impact"],
    auteur: "sana",
    statut: "PUBLIE",
    modele: "RSE",
  },
  {
    cle: "rayonner",
    titre: "Faire rayonner son organisation",
    sousTitre: "Rendre son organisation visible et recommandée",
    description: "Comment rendre votre organisation remarquable et fédérer autour de ses projets.",
    domaine: "MARKETING",
    etapes: ["godin", "sivers"],
    auteur: "amira",
    statut: "PUBLIE",
    modele: "MARKETING",
  },
  {
    cle: "leadership",
    titre: "Leadership bienveillant",
    sousTitre: "Donner envie de rester et de progresser",
    description: "Bien-être, persévérance et confiance : trois formations pour faire grandir les membres de votre organisation. En attente de validation.",
    domaine: "RH",
    etapes: ["achor", "duckworth", "brown"],
    auteur: "leila",
    statut: "EN_VALIDATION",
    modele: "RH",
  },
];
