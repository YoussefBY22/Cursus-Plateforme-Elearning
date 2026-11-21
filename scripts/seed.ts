/**
 * Données de démonstration réalistes — npm run db:seed
 *
 * Le semis passe par les MÊMES moteurs que l'application (quiz, enquêtes,
 * achèvement, compétences, badges, certificats) : les tableaux de bord
 * affichent donc des chiffres produits par le vrai code, pas inventés.
 *
 * Comptes (mot de passe commun : Cursus2026!) — voir README.
 */
import "./charger-env";
process.env.EMAIL_SILENCIEUX = "1";

import bcrypt from "bcryptjs";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, sql as client } from "@/db";
import * as s from "@/db/schema";
import { REFERENTIEL } from "@/db/donnees/referentiel";
import { CRITERES } from "@/services/badges";
import { canevasParDefaut } from "@/services/certificats/cadre";
import { slugifier } from "@/lib/utils";
import { FORMATIONS, PARCOURS, type QuestionSemence } from "./donnees/formations";
import { BADGES } from "./donnees/badges";
import { soumettreEnquete, soumettreQuiz } from "@/server/moteur/apprentissage";
import { calculerFormationExterne, referentielEffectif, terminerAutoEvaluation } from "@/server/moteur/competences";
import { ajouterXp, verifierBadges } from "@/server/moteur/gamification";
import { BAREME_XP } from "@/services/xp";
import { completudeProfil } from "@/services/visibilite";

const MOT_DE_PASSE = "Cursus2026!";

/* Aléatoire reproductible : le même semis donne la même base. */
let graine = 20261007;
function alea() {
  graine |= 0;
  graine = (graine + 0x6d2b79f5) | 0;
  let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (a: number, b: number) => Math.floor(a + alea() * (b - a + 1));
const choisir = <T,>(t: T[]) => t[Math.floor(alea() * t.length)];
const melanger = <T,>(t: T[]) => [...t].sort(() => alea() - 0.5);
const quart = (v: number) => Math.min(5, Math.max(1, Math.round(v * 4) / 4));

async function main() {
  const debut = Date.now();
  const deja = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(s.utilisateurs);
  if (deja[0].n > 0 && !process.argv.includes("--force")) {
    console.log("ℹ La base contient déjà des données. Lancez « npm run db:reset » pour repartir de zéro.");
    await client.end();
    return;
  }
  const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

  /* ------------------------------------------------------------ organisation */
  const JES = [
    { cle: "aurora", nom: "Aurora Conseil", sigle: "Aurora", ville: "Lyon", ecole: "École d'ingénieurs", couleur: "#8e172c" },
    { cle: "pixel", nom: "Pixel Design Studio", sigle: "PXL", ville: "Lyon", ecole: "École de design", couleur: "#1e1e1e" },
    { cle: "boreal", nom: "Boréal Conseil", sigle: "BOR", ville: "Lille", ecole: "Institut de gestion", couleur: "#1e7a86" },
    { cle: "quartz", nom: "Quartz Consulting", sigle: "QTZ", ville: "Lyon", ecole: "École de commerce", couleur: "#2563eb" },
    { cle: "orion", nom: "Orion Business", sigle: "ORI", ville: "Toulouse", ecole: "Faculté des sciences économiques", couleur: "#c77c00" },
    { cle: "mistral", nom: "Mistral Études", sigle: "MIS", ville: "Montpellier", ecole: "Institut supérieur d'informatique", couleur: "#5b3a8c" },
    { cle: "horizon", nom: "Cap Horizon Services", sigle: "CHZ", ville: "Rennes", ecole: "Institut des études technologiques", couleur: "#12a150" },
    { cle: "helios", nom: "Helios Digital", sigle: "HEL", ville: "Bordeaux", ecole: "Institut du numérique", couleur: "#c2417a" },
  ];
  const jeIds: Record<string, string> = {};
  for (const j of JES) {
    const [r] = await db
      .insert(s.juniorEntreprises)
      .values({ slug: j.cle, nom: j.nom, sigle: j.sigle, ville: j.ville, ecole: j.ecole, couleur: j.couleur })
      .returning({ id: s.juniorEntreprises.id });
    jeIds[j.cle] = r.id;
  }

  /* ---------------------------------------------------- Référentiel */
  const domaineIds: Record<string, string> = {};
  const competenceIds: Record<string, string> = {};
  for (const [i, d] of REFERENTIEL.entries()) {
    const [r] = await db
      .insert(s.domaines)
      .values({ code: d.code, nom: d.nom, description: d.description, couleur: d.couleur, icone: d.icone, ordre: i })
      .returning({ id: s.domaines.id });
    domaineIds[d.code] = r.id;
    for (const [j, c] of d.competences.entries()) {
      const [rc] = await db
        .insert(s.competences)
        .values({ code: c.code, nom: c.nom, question: c.question ?? null, pistes: c.pistes ?? null, domaineId: r.id, ordre: j })
        .returning({ id: s.competences.id });
      competenceIds[c.code] = rc.id;
    }
  }

  /* -------------------------------------------- Comptes institutionnels */
  const creer = async (v: Partial<typeof s.utilisateurs.$inferInsert> & { prenom: string; nom: string; email: string }) => {
    const [u] = await db
      .insert(s.utilisateurs)
      .values({ motDePasseHash: hash, rattachement: "VALIDE", emailVerifieLe: new Date(), ...v })
      .returning({ id: s.utilisateurs.id });
    return u.id;
  };

  const admin = await creer({
    prenom: "Nour",
    nom: "Sassi",
    email: "admin@cursus.test",
    roles: ["SUPER_ADMIN", "MEMBRE"],
    poste: "Directrice de la plateforme",
    departement: "Management & leadership",
    bio: "Je pilote la plateforme. Mon objectif : que chaque membre d'organisation puisse mesurer ses progrès.",
    linkedin: "linkedin.com/in/exemple-nour-sassi",
  });
  const dc = await creer({
    prenom: "Selim",
    nom: "Chaouch",
    email: "dc@cursus.test",
    roles: ["RESP_PEDAGO", "MEMBRE"],
    poste: "Responsable pédagogique",
    departement: "Ressources humaines",
    jeId: jeIds.quartz,
    bio: "Je construis les parcours certifiants de la plateforme avec les formateurs du réseau.",
    linkedin: "linkedin.com/in/exemple-selim-chaouch",
  });

  const FORMATEURS = {
    amira: {
      prenom: "Amira",
      nom: "Trabelsi",
      email: "formateur@cursus.test",
      poste: "Consultante en communication",
      departement: "Développement commercial",
      bio: "Ancienne présidente d'organisation, j'accompagne depuis six ans les équipes commerciales dans leurs pitchs et leurs négociations.",
      whatsapp: "+33 6 00 00 01 01",
      jeId: jeIds.boreal,
      historique: [
        { annee: 2018, poste: "Chargée de prospection", organisation: "Boréal Conseil" },
        { annee: 2019, poste: "Responsable développement commercial", organisation: "Boréal Conseil" },
        { annee: 2020, anneeFin: 2021, poste: "Présidente", organisation: "Boréal Conseil", description: "Mandat marqué par +40 % de chiffre d'affaires." },
        { annee: 2022, poste: "Formatrice du réseau", organisation: "Cursus" },
      ],
    },
    karim: {
      prenom: "Karim",
      nom: "Ben Salem",
      email: "karim.bensalem@cursus.test",
      poste: "Coach en management d'équipe",
      departement: "Management & leadership",
      bio: "Coach certifié, j'aide les bureaux exécutifs à animer des équipes de bénévoles motivées et à tenir leurs délais.",
      whatsapp: "+33 6 00 00 01 02",
      jeId: jeIds.quartz,
      historique: [
        { annee: 2016, poste: "Membre", organisation: "Quartz Consulting" },
        { annee: 2017, poste: "Chef de projet", organisation: "Quartz Consulting" },
        { annee: 2018, poste: "Vice-président", organisation: "Quartz Consulting" },
        { annee: 2021, poste: "Coach des bureaux exécutifs", organisation: "Cursus" },
      ],
    },
    leila: {
      prenom: "Leila",
      nom: "Haddad",
      email: "leila.haddad@cursus.test",
      poste: "Psychologue du travail",
      departement: "Ressources humaines",
      bio: "Je forme les responsables RH des organisations au recrutement, à l'intégration et à la prévention de l'épuisement.",
      whatsapp: "+33 6 00 00 01 03",
      jeId: jeIds.orion,
      historique: [
        { annee: 2017, poste: "Chargée RH", organisation: "Orion Business" },
        { annee: 2019, poste: "Responsable RH", organisation: "Orion Business" },
        { annee: 2023, poste: "Formatrice RH", organisation: "Cursus" },
      ],
    },
    yanis: {
      prenom: "Yanis",
      nom: "Gharbi",
      email: "yanis.gharbi@cursus.test",
      poste: "Expert-comptable stagiaire",
      departement: "Finance & trésorerie",
      bio: "Ancien trésorier d'organisation, je rends la trésorerie et la fiscalité des associations simples et sans stress.",
      whatsapp: "+33 6 00 00 01 04",
      jeId: jeIds.mistral,
      historique: [
        { annee: 2019, poste: "Trésorier adjoint", organisation: "Mistral Études" },
        { annee: 2020, poste: "Trésorier", organisation: "Mistral Études" },
        { annee: 2024, poste: "Formateur trésorerie", organisation: "Cursus" },
      ],
    },
    sana: {
      prenom: "Sana",
      nom: "Mejri",
      email: "sana.mejri@cursus.test",
      poste: "Chargée RSE et conformité",
      departement: "RSE & impact",
      bio: "Juriste de formation, j'accompagne les organisations dans leur mise en conformité et leurs démarches RSE.",
      whatsapp: "+33 6 00 00 01 05",
      jeId: jeIds.horizon,
      historique: [
        { annee: 2018, poste: "Secrétaire générale", organisation: "Cap Horizon Services" },
        { annee: 2020, poste: "Responsable qualité", organisation: "Cap Horizon Services" },
        { annee: 2023, poste: "Référente RSE", organisation: "Cursus" },
      ],
    },
  } as const;

  const formateurIds: Record<string, string> = {};
  for (const [cle, f] of Object.entries(FORMATEURS)) {
    const id = await creer({
      prenom: f.prenom,
      nom: f.nom,
      email: f.email,
      roles: ["FORMATEUR", "MEMBRE"],
      poste: f.poste,
      departement: f.departement,
      bio: f.bio,
      whatsapp: f.whatsapp,
      jeId: f.jeId,
      linkedin: `linkedin.com/in/exemple-${slugifier(`${f.prenom}-${f.nom}`)}`,
    });
    formateurIds[cle] = id;
    for (const h of f.historique) {
      await db.insert(s.etapesHistoriqueJE).values({ utilisateurId: id, ...h });
    }
  }
  formateurIds.dc = dc;

  const rhAurora = await creer({
    prenom: "Ines",
    nom: "Mabrouk",
    email: "rh@aurora.test",
    roles: ["RESP_RH", "MEMBRE"],
    jeId: jeIds.aurora,
    poste: "Responsable RH",
    departement: "Ressources humaines",
    bio: "Je suis la montée en compétences des membres d'Aurora.",
  });
  const rhPixel = await creer({
    prenom: "Omar",
    nom: "Ferchichi",
    email: "rh@pixel.test",
    roles: ["RESP_RH", "MEMBRE"],
    jeId: jeIds.pixel,
    poste: "Responsable RH",
    departement: "Ressources humaines",
  });

  /* Chargé de suivi : il porte le portefeuille de quatre organisations. */
  const chargeSuivi = await creer({
    prenom: "Mehdi",
    nom: "Karray",
    email: "suivi@cursus.test",
    roles: ["CHARGE_SUIVI", "MEMBRE"],
    poste: "Chargé de suivi des organisations",
    departement: "Management & leadership",
    bio: "Je suis un portefeuille d'organisations : qui avance, qui décroche, et comment les relancer.",
  });
  await db
    .update(s.juniorEntreprises)
    .set({ chargeSuiviId: chargeSuivi })
    .where(inArray(s.juniorEntreprises.id, [jeIds.aurora, jeIds.horizon, jeIds.boreal, jeIds.quartz]));

  /* ------------------------------------------------- Modèles de certificat */
  const MODELES: Record<string, { nom: string; couleur: string; domaine?: string; defaut?: boolean }> = {
    DEVCO: { nom: "Cursus — indigo", couleur: "#4f46e5", defaut: true },
    MARKETING: { nom: "Marketing — bleu", couleur: "#2563EB", domaine: "MARKETING" },
    RSE: { nom: "RSE — vert", couleur: "#12A150", domaine: "RSE" },
    MANAGEMENT: { nom: "Management — encre", couleur: "#0f1226", domaine: "MANAGEMENT" },
    FINANCE: { nom: "Finance — ambre", couleur: "#C77C00", domaine: "FINANCE" },
    RH: { nom: "Ressources humaines — framboise", couleur: "#C2417A", domaine: "RH" },
  };
  const modeleIds: Record<string, string> = {};
  for (const [cle, m] of Object.entries(MODELES)) {
    const [r] = await db
      .insert(s.modelesCertificat)
      .values({
        nom: m.nom,
        couleurTheme: m.couleur,
        domaineId: m.domaine ? domaineIds[m.domaine] : null,
        canevas: canevasParDefaut(m.couleur),
        parDefaut: !!m.defaut,
      })
      .returning({ id: s.modelesCertificat.id });
    modeleIds[cle] = r.id;
  }

  /* ------------------------------------------------------- Formations */
  const formationIds: Record<string, string> = {};
  const pointIds: Record<string, { id: string; type: "INTEGRE" | "FINAL"; questions: { id: string; q: QuestionSemence }[] }[]> = {};
  for (const f of FORMATIONS) {
    const auteur = formateurIds[f.formateur];
    const publie = f.statut === "PUBLIE";
    const [r] = await db
      .insert(s.formations)
      .values({
        slug: slugifier(f.titre),
        titre: f.titre,
        resume: f.resume,
        description: f.description,
        objectifs: f.objectifs,
        domaineId: domaineIds[f.domaine],
        niveau: f.niveau,
        fournisseurVideo: f.fournisseur,
        referenceVideo: f.reference,
        dureeSec: f.dureeSec,
        auteurId: auteur,
        formateurId: auteur,
        statut: f.statut,
        visibleCatalogue: f.visibleCatalogue ?? true,
        motifRefus: f.motifRefus ?? null,
        soumisLe: f.statut !== "BROUILLON" ? new Date() : null,
        publieLe: publie ? new Date() : null,
        valideParId: publie ? dc : null,
        tags: f.tags,
      })
      .returning({ id: s.formations.id });
    formationIds[f.cle] = r.id;
    for (const [code, poids] of f.competences) {
      await db.insert(s.formationsCompetences).values({ formationId: r.id, competenceId: competenceIds[code], poids });
    }
    pointIds[f.cle] = [];
    const tous = [
      ...f.points.map((p) => ({ type: "INTEGRE" as const, tempsSec: p.tempsSec, titre: p.titre, questions: p.questions })),
      ...(f.final.length ? [{ type: "FINAL" as const, tempsSec: null, titre: "Quiz final", questions: f.final }] : []),
    ];
    for (const p of tous) {
      const [rp] = await db
        .insert(s.pointsQuiz)
        .values({ formationId: r.id, type: p.type, tempsSec: p.tempsSec, titre: p.titre })
        .returning({ id: s.pointsQuiz.id });
      const qs: { id: string; q: QuestionSemence }[] = [];
      for (const [i, q] of p.questions.entries()) {
        const options = q.options.map((o, k) => ({
          id: String.fromCharCode(97 + k),
          texte: o.replace(/^✓/, ""),
          correcte: o.startsWith("✓"),
        }));
        const [rq] = await db
          .insert(s.questions)
          .values({
            pointQuizId: rp.id,
            type: q.type ?? "CHOIX_UNIQUE",
            enonce: q.enonce,
            options,
            explication: q.explication ?? null,
            competenceId: q.c ? competenceIds[q.c] : null,
            ordre: i,
          })
          .returning({ id: s.questions.id });
        qs.push({ id: rq.id, q });
      }
      pointIds[f.cle].push({ id: rp.id, type: p.type, questions: qs });
    }
  }

  /* --------------------------------------------------------- Parcours */
  const parcoursIds: Record<string, string> = {};
  for (const p of PARCOURS) {
    const [r] = await db
      .insert(s.parcours)
      .values({
        slug: slugifier(p.titre),
        titre: p.titre,
        sousTitre: p.sousTitre,
        description: p.description,
        domaineId: domaineIds[p.domaine],
        auteurId: formateurIds[p.auteur],
        statut: p.statut,
        soumisLe: new Date(),
        publieLe: p.statut === "PUBLIE" ? new Date() : null,
        valideParId: p.statut === "PUBLIE" ? admin : null,
        modeleCertificatId: modeleIds[p.modele],
        intituleCertificat: p.intitule ?? null,
      })
      .returning({ id: s.parcours.id });
    parcoursIds[p.cle] = r.id;
    for (const [i, cle] of p.etapes.entries()) {
      await db.insert(s.etapesParcours).values({ parcoursId: r.id, formationId: formationIds[cle], ordre: i + 1 });
    }
  }

  /* ------------------------------------------------------------ Badges */
  for (const [i, c] of CRITERES.entries()) {
    await db.insert(s.criteresBadge).values({
      code: c.code,
      libelle: c.libelle,
      description: c.description,
      unite: c.unite,
      parametre: c.parametre,
      ordre: i,
    });
  }
  for (const [i, b] of BADGES.entries()) {
    const parametre = b.parametre ? (domaineIds[b.parametre] ?? parcoursIds[b.parametre] ?? null) : null;
    await db.insert(s.badges).values({
      code: b.code,
      nom: b.nom,
      description: b.description,
      couleur: b.couleur,
      forme: b.forme,
      matiere: b.matiere,
      rarete: b.rarete,
      effet: b.effet,
      icone: b.icone,
      critereCode: b.critere,
      seuil: b.seuil,
      parametre,
      xpBonus: b.xpBonus,
      secret: !!b.secret,
      ordre: i,
    });
  }

  /* ------------------------------------- Aurora adapte son référentiel */
  const devcoConfed = await db
    .select()
    .from(s.competences)
    .where(and(eq(s.competences.domaineId, domaineIds.DEVCO), isNull(s.competences.jeId)))
    .orderBy(asc(s.competences.ordre));
  for (const c of devcoConfed) {
    await db.insert(s.competences).values({
      code: c.code,
      nom: c.code === "DEVCO_PROSPECTION" ? "Prospection terrain et salons étudiants" : c.nom,
      description: c.description,
      question: c.question,
      pistes: c.pistes,
      domaineId: c.domaineId,
      jeId: jeIds.aurora,
      sourceId: c.id,
      ordre: c.ordre,
      active: c.code !== "DEVCO_CRM",
    });
  }
  await db.insert(s.competences).values({
    code: "AURORA_NEGO_TARIF",
    nom: "Négociation tarifaire des missions IT",
    domaineId: domaineIds.DEVCO,
    jeId: jeIds.aurora,
    ordre: 20,
    pistes: "Préparez une grille de chiffrage (jours-homme × taux) avant toute discussion de prix.",
  });

  /* ----------------------------------------------------------- Membres */
  const PRENOMS = ["Yasmine", "Ahmed", "Rania", "Mehdi", "Sarra", "Aziz", "Mariem", "Hamza", "Eya", "Skander", "Nour", "Firas", "Asma", "Wassim", "Chaima", "Bilel", "Khadija", "Oussema", "Malek", "Rim", "Seif", "Amal", "Yassine", "Hiba", "Anis", "Ons", "Iheb", "Salma", "Zied", "Imen", "Rayen", "Emna", "Fedi", "Lina", "Aymen", "Nada", "Ghassen", "Yosr", "Habib", "Dorra"];
  const NOMS = ["Ben Ali", "Mansouri", "Jaziri", "Bouazizi", "Chebbi", "Hamdi", "Karray", "Masmoudi", "Zouari", "Kammoun", "Ayari", "Dridi", "Gharsalli", "Hammami", "Jebali", "Khelifi", "Lahmar", "Mzali", "Nasri", "Ouali", "Riahi", "Saidi", "Tlili", "Yahyaoui", "Zitouni", "Baccouche", "Ferjani", "Guesmi", "Hadj Taieb", "Kefi"];
  const POSTES = ["Chargé de prospection", "Chef de projet", "Chargée de communication", "Trésorier adjoint", "Responsable qualité", "Consultant junior", "Chargée RH", "Développeur web", "Secrétaire général", "Responsable événementiel"];
  const departements = REFERENTIEL.map((d) => d.nom);

  type Membre = { id: string; prenom: string; jeCle: string; competence: number; engagement: number; base: number };
  const membres: Membre[] = [];

  const membreDemo = await creer({
    prenom: "Yasmine",
    nom: "Ben Ali",
    email: "membre@cursus.test",
    roles: ["MEMBRE"],
    jeId: jeIds.aurora,
    poste: "Chargée de prospection",
    departement: "Développement commercial",
    bio: "Étudiante en 3e année, je découvre le développement commercial au sein d'Aurora.",
    linkedin: "linkedin.com/in/exemple-yasmine-ben-ali",
  });
  membres.push({ id: membreDemo, prenom: "Yasmine", jeCle: "aurora", competence: 0.78, engagement: -1, base: 4 });

  const repartition: [string, number][] = [
    ["aurora", 9],
    ["pixel", 6],
    ["boreal", 5],
    ["quartz", 5],
    ["orion", 4],
    ["mistral", 4],
    ["horizon", 3],
    ["helios", 3],
  ];
  let n = 0;
  for (const [jeCle, nb] of repartition) {
    for (let i = 0; i < nb; i++) {
      const prenom = PRENOMS[(n * 7 + 3) % PRENOMS.length];
      const nom = NOMS[(n * 11 + 5) % NOMS.length];
      n++;
      const complet = alea() < 0.45;
      const enAttente = jeCle === "aurora" && i >= nb - 2;
      const id = await creer({
        prenom,
        nom,
        email: `${slugifier(prenom)}.${slugifier(nom)}${n}@exemple.test`,
        roles: ["MEMBRE"],
        jeId: jeIds[jeCle],
        rattachement: enAttente ? "EN_ATTENTE" : "VALIDE",
        emailVerifieLe: alea() < 0.82 ? new Date() : null,
        poste: complet || alea() < 0.5 ? choisir(POSTES) : null,
        departement: choisir(departements),
        bio: complet ? "Membre actif de mon organisation, je me forme pour mieux accompagner nos clients." : null,
        linkedin: complet || alea() < 0.3 ? `linkedin.com/in/exemple-${slugifier(prenom)}-${n}` : null,
        visibleAnnuaire: alea() < 0.82,
        masquerStats: alea() < 0.15,
      });
      const engagement = enAttente ? 0 : alea() < 0.3 ? 3 : alea() < 0.6 ? 2 : alea() < 0.85 ? 1 : 0;
      membres.push({ id, prenom, jeCle, competence: 0.5 + alea() * 0.45, engagement, base: entre(2, 6) });
    }
  }
  // Les RH et formateurs apprennent aussi un peu.
  membres.push({ id: rhAurora, prenom: "Ines", jeCle: "aurora", competence: 0.85, engagement: 2, base: 5 });
  membres.push({ id: rhPixel, prenom: "Omar", jeCle: "pixel", competence: 0.75, engagement: 1, base: 4 });

  /* ------------------------------------------------ Simulation d'activité */
  const domaineDeFormation = Object.fromEntries(FORMATIONS.map((f) => [f.cle, f.domaine]));
  const competencesDeFormation = Object.fromEntries(FORMATIONS.map((f) => [f.cle, f.competences.map(([c]) => c)]));
  const publiees = FORMATIONS.filter((f) => f.statut === "PUBLIE").map((f) => f.cle);

  const COMMENTAIRES = [
    "Très clair, je vais réutiliser le cercle d'or pour notre prochain salon étudiant.",
    "Le quiz au milieu de la vidéo m'a obligé à vraiment suivre, bonne idée.",
    "J'aurais aimé un exemple appliqué à une organisation, mais le fond est excellent.",
    "Je l'ai fait regarder à toute l'équipe commerciale, débrief demain !",
    "Les questions du quiz final sont bien choisies, pas de piège inutile.",
    "Capsule courte et efficace, parfait entre deux cours.",
    "La partie sur l'autonomie m'a fait changer ma façon de déléguer.",
    "Petit bémol : le son est un peu faible au début.",
    "Merci pour cette sélection, c'est exactement ce qu'il manquait à notre bureau.",
    "On l'a appliqué pour notre déclaration du mois : zéro retard cette fois.",
  ];

  async function autoEvaluer(m: Membre, domaineCode: string, contexte: "INITIALE" | "LIBRE" = "INITIALE") {
    const [u] = await db.select({ jeId: s.utilisateurs.jeId }).from(s.utilisateurs).where(eq(s.utilisateurs.id, m.id));
    const ref = await referentielEffectif(domaineIds[domaineCode], u.jeId);
    const [ae] = await db
      .insert(s.autoEvaluations)
      .values({ utilisateurId: m.id, domaineId: domaineIds[domaineCode], contexte, demarreeLe: new Date(Date.now() - ref.length * 6000) })
      .returning({ id: s.autoEvaluations.id });
    await terminerAutoEvaluation(
      m.id,
      ae.id,
      ref.map((c) => {
        const inconnu = alea() < 0.1;
        return {
          competenceId: c.id,
          valeur: inconnu ? null : Math.min(10, Math.max(1, m.base + entre(-2, 2))),
          inconnu,
          dureeMs: entre(2500, 8500),
        };
      })
    );
  }

  const evalues = new Map<string, Set<string>>();
  async function suivre(m: Membre, cle: string, options: { froid?: boolean; noter?: boolean; commenter?: boolean } = {}) {
    const domaine = domaineDeFormation[cle];
    const faits = evalues.get(m.id) ?? new Set<string>();
    if (!faits.has(domaine)) {
      await autoEvaluer(m, domaine);
      faits.add(domaine);
      evalues.set(m.id, faits);
    }
    const f = FORMATIONS.find((x) => x.cle === cle)!;
    const formationId = formationIds[cle];
    await db
      .insert(s.progressions)
      .values({
        utilisateurId: m.id,
        formationId,
        segments: [[0, f.dureeSec]],
        secondesVues: f.dureeSec,
        positionSec: f.dureeSec,
        seuilAtteint: true,
      })
      .onConflictDoUpdate({
        target: [s.progressions.utilisateurId, s.progressions.formationId],
        set: { segments: [[0, f.dureeSec]], secondesVues: f.dureeSec, positionSec: f.dureeSec, seuilAtteint: true },
      });
    for (const p of pointIds[cle]) {
      let reussi = false;
      for (let essai = 0; essai < 4 && !reussi; essai++) {
        const chance = Math.min(0.98, m.competence + essai * 0.15);
        const reponses: Record<string, string[]> = {};
        for (const { id, q } of p.questions) {
          const bonnes = q.options.map((o, k) => (o.startsWith("✓") ? String.fromCharCode(97 + k) : null)).filter(Boolean) as string[];
          const fausses = q.options.map((o, k) => (!o.startsWith("✓") ? String.fromCharCode(97 + k) : null)).filter(Boolean) as string[];
          reponses[id] = alea() < chance ? bonnes : [choisir(fausses)];
        }
        const r = await soumettreQuiz(m.id, p.id, reponses);
        reussi = r.reussi || p.type === "INTEGRE";
      }
    }
    const reeval: Record<string, number | null> = {};
    for (const c of competencesDeFormation[cle]) reeval[competenceIds[c]] = Math.min(10, m.base + entre(1, 3));
    await soumettreEnquete(m.id, formationId, "CHAUD", {
      noteContenu: entre(3, 5),
      noteFormateur: alea() < 0.7 ? 5 : entre(3, 4),
      noteSpecifique: entre(3, 5),
      recommandation: entre(6, 10),
      commentaire: alea() < 0.3 ? "Formation utile et bien rythmée." : null,
      reevaluation: reeval,
    });
    if (options.froid) {
      await soumettreEnquete(m.id, formationId, "FROID", {
        noteContenu: entre(3, 5),
        noteFormateur: entre(4, 5),
        noteSpecifique: entre(2, 5),
        recommandation: entre(6, 10),
      });
    }
    if (options.noter) {
      await db
        .insert(s.notations)
        .values({ utilisateurId: m.id, formationId, note: quart(3.5 + alea() * 1.5) })
        .onConflictDoNothing();
    }
    if (options.commenter) {
      await db.insert(s.commentaires).values({ formationId, auteurId: m.id, texte: choisir(COMMENTAIRES) });
    }
  }

  console.log(`… simulation de l'activité de ${membres.length} membres`);
  for (const m of membres) {
    if (m.engagement === -1) continue;
    const nb = [0, entre(1, 2), entre(2, 4), entre(4, 7)][m.engagement];
    if (m.engagement === 0) {
      if (alea() < 0.5) await autoEvaluer(m, choisir(["DEVCO", "MARKETING", "MANAGEMENT"]));
      continue;
    }
    // Un tiers des actifs finit un parcours court (et décroche son certificat).
    const choix: string[] = [];
    if (m.engagement >= 2 && alea() < 0.45) choix.push(...choisir([["odd", "impact"], ["caisse", "facturation", "cloture", "juridique"], ["godin", "sivers"]]));
    if (m.engagement === 3 && alea() < 0.5) choix.push(...choisir([["sinek", "treasure", "anderson"], ["pink", "wujec", "heffernan", "urban"]]));
    const cible = choix.length + nb;
    for (const cle of melanger(publiees)) {
      if (choix.length >= cible) break;
      if (!choix.includes(cle)) choix.push(cle);
    }
    for (const [i, cle] of choix.entries()) {
      await suivre(m, cle, { froid: i < choix.length - 1 && alea() < 0.6, noter: alea() < 0.65, commenter: alea() < 0.25 });
    }
    // Une formation commencée, laissée en cours.
    const enCours = publiees.find((c) => !choix.includes(c) && FORMATIONS.find((f) => f.cle === c)!.fournisseur === "YOUTUBE");
    if (enCours && alea() < 0.6) {
      const f = FORMATIONS.find((x) => x.cle === enCours)!;
      const vu = Math.round(f.dureeSec * (0.15 + alea() * 0.4));
      const premier = f.points[0]?.tempsSec ?? f.dureeSec;
      await db.insert(s.progressions).values({
        utilisateurId: m.id,
        formationId: formationIds[enCours],
        segments: [[0, Math.min(vu, premier)]],
        secondesVues: Math.min(vu, premier),
        positionSec: Math.min(vu, premier),
        quizEnCoursId: vu >= premier ? pointIds[enCours][0].id : null,
      });
    }
  }

  /* ------------------------------------------- Le compte de démonstration */
  const yasmine = membres[0];
  await autoEvaluer(yasmine, "DEVCO");
  evalues.set(yasmine.id, new Set(["DEVCO"]));
  await suivre(yasmine, "sinek", { noter: true, commenter: true, froid: true });
  await suivre(yasmine, "odd", { noter: true });
  await suivre(yasmine, "impact", { noter: false });
  await autoEvaluer(yasmine, "MANAGEMENT");
  evalues.get(yasmine.id)!.add("MANAGEMENT");
  const pink = FORMATIONS.find((f) => f.cle === "pink")!;
  await db.insert(s.progressions).values({
    utilisateurId: yasmine.id,
    formationId: formationIds.pink,
    segments: [[0, 452]],
    secondesVues: 452,
    positionSec: 452,
  });
  const [q1] = pointIds.pink;
  await soumettreQuiz(
    yasmine.id,
    q1.id,
    Object.fromEntries(q1.questions.map(({ id, q }) => [id, q.options.map((o, k) => (o.startsWith("✓") ? String.fromCharCode(97 + k) : null)).filter(Boolean) as string[]]))
  );
  void pink;

  /* ------------------------------------------ Formations externes (RH) */
  const negociation = await db
    .select({ id: s.competences.id, code: s.competences.code })
    .from(s.competences)
    .where(and(eq(s.competences.jeId, jeIds.aurora), inArray(s.competences.code, ["DEVCO_NEGOCIATION", "DEVCO_OBJECTIONS", "AURORA_NEGO_TARIF"])));
  const [fe] = await db
    .insert(s.formationsExternes)
    .values({
      jeId: jeIds.aurora,
      domaineId: domaineIds.DEVCO,
      titre: "Atelier interne : négocier une mission",
      description: "Jeux de rôle client / organisation animés par l'équipe commerciale, avec grille d'observation.",
      formateurInterne: "Responsable commercial d'Aurora",
      date: new Date(Date.now() - 40 * 24 * 3600 * 1000),
      dureeHeures: 3,
      creeParId: rhAurora,
    })
    .returning({ id: s.formationsExternes.id });
  for (const c of negociation) await db.insert(s.formationsExternesCompetences).values({ formationExterneId: fe.id, competenceId: c.id });
  const participantsAurora = membres.filter((m) => m.jeCle === "aurora").slice(1, 7);
  for (const m of participantsAurora) {
    const mk = async (contexte: "INITIALE" | "FINALE", delta: number) => {
      const [ae] = await db
        .insert(s.autoEvaluations)
        .values({ utilisateurId: m.id, domaineId: domaineIds.DEVCO, contexte, demarreeLe: new Date(Date.now() - 60_000) })
        .returning({ id: s.autoEvaluations.id });
      await db.insert(s.reponsesAutoEvaluation).values(
        negociation.map((c) => ({ autoEvaluationId: ae.id, competenceId: c.id, valeur: Math.min(10, Math.max(1, m.base + delta + entre(-1, 1))), dureeMs: entre(3000, 8000) }))
      );
      await db.update(s.autoEvaluations).set({ termineeLe: new Date() }).where(eq(s.autoEvaluations.id, ae.id));
      return ae.id;
    };
    const ini = await mk("INITIALE", 0);
    const fin = await mk("FINALE", entre(1, 3));
    await db.insert(s.participationsExternes).values({
      formationExterneId: fe.id,
      utilisateurId: m.id,
      autoEvalInitialeId: ini,
      autoEvalFinaleId: fin,
      scoreTest: entre(55, 95),
      evaluationFormateur: Object.fromEntries(negociation.map((c) => [c.id, Math.min(10, m.base + entre(0, 3))])),
    });
  }
  await calculerFormationExterne(fe.id);
  await db.update(s.formationsExternes).set({ statut: "CLOTUREE" }).where(eq(s.formationsExternes.id, fe.id));

  const reseauxComp = await db
    .select({ id: s.competences.id })
    .from(s.competences)
    .where(and(isNull(s.competences.jeId), inArray(s.competences.code, ["MKT_RESEAUX", "MKT_CONTENU"])));
  const [fe2] = await db
    .insert(s.formationsExternes)
    .values({
      jeId: jeIds.aurora,
      domaineId: domaineIds.MARKETING,
      titre: "Formation interne : animer les réseaux sociaux de l'organisation",
      description: "Atelier pratique avec l'équipe marketing : ligne éditoriale, calendrier, formats.",
      formateurInterne: "Responsable marketing d'Aurora",
      date: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      dureeHeures: 2,
      creeParId: rhAurora,
    })
    .returning({ id: s.formationsExternes.id });
  for (const c of reseauxComp) await db.insert(s.formationsExternesCompetences).values({ formationExterneId: fe2.id, competenceId: c.id });
  for (const m of membres.filter((x) => x.jeCle === "aurora").slice(0, 4)) {
    await db.insert(s.participationsExternes).values({ formationExterneId: fe2.id, utilisateurId: m.id });
    await db.insert(s.notifications).values({
      utilisateurId: m.id,
      type: "AUTO_EVALUATION",
      titre: "Auto-évaluation à remplir",
      message: "Avant l'atelier « animer les réseaux sociaux », mesurez votre niveau de départ (2 minutes).",
      lien: `/competences/externe/${fe2.id}`,
      cleIdempotence: `externe-initiale:${fe2.id}:${m.id}`,
    });
  }

  /* ------------------------------------------ Likes, signalements */
  const tousCommentaires = await db.select({ id: s.commentaires.id, auteurId: s.commentaires.auteurId }).from(s.commentaires);
  for (const c of tousCommentaires) {
    for (const m of melanger(membres).slice(0, entre(0, 6))) {
      if (m.id === c.auteurId) continue;
      await db.insert(s.likesCommentaire).values({ commentaireId: c.id, utilisateurId: m.id }).onConflictDoNothing();
    }
  }
  const [douteux] = await db
    .insert(s.commentaires)
    .values({
      formationId: formationIds.godin,
      auteurId: membres[5].id,
      texte: "Formation nulle, l'organisation qui l'a proposée ne sert à rien. Allez plutôt voir ma page pour des vrais conseils !!!",
    })
    .returning({ id: s.commentaires.id });
  await db.insert(s.signalements).values([
    { commentaireId: douteux.id, auteurId: membres[2].id, motif: "Propos dénigrants", details: "Attaque une organisation du réseau." },
    { commentaireId: douteux.id, auteurId: membres[3].id, motif: "Publicité / spam" },
  ]);

  /* --------------------------------------- Présence (jours d'activité) */
  const aujourdHui = new Date();
  const jourIso = (decalage: number) => new Date(aujourdHui.getTime() - decalage * 86400000).toISOString().slice(0, 10);
  for (const m of membres) {
    const actif = m.engagement === -1 ? 3 : m.engagement;
    const jours = new Set<number>();
    if (actif >= 2) for (let d = 0; d < entre(2, actif === 3 ? 9 : 4); d++) jours.add(d);
    for (let k = 0; k < actif * 6; k++) jours.add(entre(0, 75));
    if (m.engagement === -1) [0, 1, 2, 3].forEach((d) => jours.add(d));
    let total = 0;
    for (const d of jours) {
      const sec = entre(600, actif >= 2 ? 5400 : 2400);
      total += sec;
      await db.insert(s.activitesJour).values({ utilisateurId: m.id, jour: jourIso(d), secondes: sec }).onConflictDoNothing();
    }
    await db
      .update(s.utilisateurs)
      .set({ tempsActifSec: sql`${s.utilisateurs.tempsActifSec} + ${total}`, dernierAcces: new Date(Date.now() - entre(0, 5) * 86400000) })
      .where(eq(s.utilisateurs.id, m.id));
  }

  /* ------------------------------ Profil complet, e-mails vérifiés (XP) */
  const tous = await db.select().from(s.utilisateurs);
  for (const u of tous) {
    if (u.emailVerifieLe) await ajouterXp(u.id, "EMAIL_VERIFIE", u.id, BAREME_XP.EMAIL_VERIFIE, "E-mail vérifié");
    if (completudeProfil(u).score >= 1) await ajouterXp(u.id, "PROFIL_COMPLET", u.id, BAREME_XP.PROFIL_COMPLET, "Profil complété");
  }
  for (const u of tous) await verifierBadges(u.id);

  /* --------------------------- Dates : étaler l'histoire sur 5 mois */
  console.log("… mise en perspective temporelle");
  await client.unsafe(`
    update utilisateur u set cree_le = now() - ((40 + (abs(hashtext(u.email)) % 110)) || ' days')::interval;
    update utilisateur set cree_le = now() - interval '160 days' where 'SUPER_ADMIN' = any(roles) or 'RESP_PEDAGO' = any(roles) or 'FORMATEUR' = any(roles);
  `);
  const etaler = async (table: string, colonne: string, utilisateurCol = "utilisateur_id", cle = "id") => {
    await client.unsafe(`
      with o as (
        select t.${cle} as k, u.cree_le as depart,
               row_number() over (partition by t.${utilisateurCol} order by t.${colonne}, t.ctid) as rn,
               count(*) over (partition by t.${utilisateurCol}) as total
        from ${table} t join utilisateur u on u.id = t.${utilisateurCol}
      )
      update ${table} t set ${colonne} = o.depart + (now() - interval '6 hours' - o.depart) * (o.rn::float / (o.total + 1))
      from o where t.${cle} = o.k;
    `);
  };
  await etaler("historique_niveau", "cree_le");
  await etaler("evenement_xp", "cree_le");
  await etaler("tentative_quiz", "cree_le");
  await etaler("enquete", "cree_le");
  await etaler("notification", "cree_le");
  await etaler("commentaire", "cree_le", "auteur_id");
  await etaler("auto_evaluation", "demarree_le");
  await client.unsafe(`
    update auto_evaluation set terminee_le = demarree_le + interval '90 seconds' where terminee_le is not null;
    update progression p set demarree_le = coalesce((select min(t.cree_le) from tentative_quiz t join point_quiz q on q.id = t.point_quiz_id where t.utilisateur_id = p.utilisateur_id and q.formation_id = p.formation_id) - interval '20 minutes', now() - interval '2 days'),
      derniere_sync_le = now() - interval '1 day';
    update progression p set terminee_le = (select e.cree_le from enquete e where e.utilisateur_id = p.utilisateur_id and e.formation_id = p.formation_id and e.type = 'CHAUD') where statut = 'TERMINEE';
    update enquete f set cree_le = least(now() - interval '1 hour', c.cree_le + interval '30 days')
      from enquete c where f.type = 'FROID' and c.type = 'CHAUD' and c.utilisateur_id = f.utilisateur_id and c.formation_id = f.formation_id;
    update badge_obtenu b set obtenu_le = coalesce((select max(cree_le) from evenement_xp e where e.utilisateur_id = b.utilisateur_id and e.ref_id = b.badge_id), now() - interval '3 days');
    update inscription_parcours i set demarre_le = coalesce((select min(p.demarree_le) from progression p join etape_parcours e on e.formation_id = p.formation_id and e.parcours_id = i.parcours_id where p.utilisateur_id = i.utilisateur_id), now()),
      termine_le = case when termine_le is null then null else (select max(p.terminee_le) from progression p join etape_parcours e on e.formation_id = p.formation_id and e.parcours_id = i.parcours_id where p.utilisateur_id = i.utilisateur_id) end;
    update certificat c set emis_le = coalesce((select termine_le from inscription_parcours i where i.utilisateur_id = c.utilisateur_id and i.parcours_id = c.parcours_id), now());
    update formation set publie_le = now() - ((60 + (abs(hashtext(slug)) % 90)) || ' days')::interval, soumis_le = now() - ((62 + (abs(hashtext(slug)) % 90)) || ' days')::interval where statut = 'PUBLIE';
    update formation set soumis_le = now() - interval '2 days' where statut = 'EN_VALIDATION';
    update parcours set soumis_le = now() - interval '1 day' where statut = 'EN_VALIDATION';
  `);

  // Le membre de démonstration a une évaluation à froid à faire : la rubrique
  // « À évaluer » doit raconter quelque chose, quel que soit le jour du semis.
  await db
    .update(s.progressions)
    .set({ termineeLe: new Date(Date.now() - 36 * 86_400_000) })
    .where(and(eq(s.progressions.utilisateurId, yasmine.id), eq(s.progressions.formationId, formationIds.odd)));

  /* ----------------------------- Organisations au ralenti (pour le suivi) */
  // Horizon s'est arrêtée il y a 45 jours, Helios il y a 20 : l'écran de suivi
  // doit avoir des organisations à relancer, pas seulement des actives.
  for (const [cle, jours] of [["horizon", 45], ["helios", 20]] as const) {
    const membresOrg = `(select id from utilisateur where je_id = '${jeIds[cle]}')`;
    await client.unsafe(`
      delete from activite_jour where utilisateur_id in ${membresOrg} and jour >= current_date - ${jours};
      update progression set derniere_sync_le = least(derniere_sync_le, now() - interval '${jours + 1} days')
        where utilisateur_id in ${membresOrg} and statut <> 'TERMINEE';
      update progression set terminee_le = terminee_le - interval '${jours + 1} days'
        where utilisateur_id in ${membresOrg} and statut = 'TERMINEE' and terminee_le > now() - interval '${jours} days';
    `);
  }

  /* ------------------------------------------------- Carnet de suivi */
  const JOUR_MS = 86_400_000;
  await db.insert(s.notesSuivi).values([
    {
      jeId: jeIds.horizon,
      auteurId: chargeSuivi,
      contenu: "Plus d'activité depuis six semaines : la présidente a quitté l'école. Contact repris avec la vice-présidente, point prévu jeudi.",
      creeLe: new Date(Date.now() - 4 * JOUR_MS),
    },
    {
      jeId: jeIds.boreal,
      auteurId: chargeSuivi,
      contenu: "Appel avec la présidente : le bureau change en janvier, les inscriptions reprendront après la passation. Relance prévue début février.",
      creeLe: new Date(Date.now() - 12 * JOUR_MS),
    },
    {
      jeId: jeIds.boreal,
      auteurId: dc,
      contenu: "Deux membres ont terminé le parcours pitch : leur retour pourrait servir d'exemple lors du prochain point réseau.",
      creeLe: new Date(Date.now() - 5 * JOUR_MS),
    },
    {
      jeId: jeIds.aurora,
      auteurId: chargeSuivi,
      contenu: "Très bonne dynamique : plus de la moitié des membres se forment chaque semaine. À citer en exemple.",
      creeLe: new Date(Date.now() - 3 * JOUR_MS),
    },
    {
      jeId: jeIds.quartz,
      auteurId: chargeSuivi,
      contenu: "Période d'examens jusqu'au 15 : activité réduite attendue, rien à relancer avant.",
      creeLe: new Date(Date.now() - 8 * JOUR_MS),
    },
  ]);

  /* ------------------------------------------ Demandes de formation */
  const [formationCloture] = await db.select({ id: s.formations.id }).from(s.formations).where(eq(s.formations.slug, "la-cloture-mensuelle"));
  const DEMANDES: {
    titre: string;
    description: string;
    domaine: string;
    soutiens: number;
    age: number;
    statut: "OUVERTE" | "PLANIFIEE" | "SATISFAITE";
    reponse?: string;
  }[] = [
    {
      titre: "Défendre un prix face à l'objection budget",
      description:
        "Nos commerciaux cèdent 20 à 30 % du devis dès que le client dit que c'est trop cher. On a besoin d'une méthode pour justifier la valeur et tenir le prix sans perdre la mission.",
      domaine: "DEVCO",
      soutiens: 11,
      age: 6,
      statut: "OUVERTE",
    },
    {
      titre: "Animer une réunion à distance sans perdre l'attention",
      description: "Les visios s'étirent et la moitié de l'équipe décroche. Des techniques concrètes pour cadrer, relancer et conclure.",
      domaine: "MANAGEMENT",
      soutiens: 7,
      age: 11,
      statut: "OUVERTE",
    },
    {
      titre: "Piloter sa trésorerie avec un simple tableur",
      description: "Un modèle prêt à remplir et la méthode pour le tenir à jour : entrées, sorties, prévisions à trois mois.",
      domaine: "FINANCE",
      soutiens: 5,
      age: 19,
      statut: "OUVERTE",
    },
    {
      titre: "Rédiger une offre de mission claire et chiffrée",
      description: "Structurer une proposition commerciale : contexte, livrables, planning, prix, conditions.",
      domaine: "DEVCO",
      soutiens: 8,
      age: 30,
      statut: "PLANIFIEE",
      reponse: "Retenue pour le prochain trimestre : une formatrice du réseau en prépare le parcours.",
    },
    {
      titre: "Comprendre la clôture mensuelle de trésorerie",
      description: "Savoir quoi vérifier chaque mois, dans quel ordre, et avec quelles pièces.",
      domaine: "FINANCE",
      soutiens: 6,
      age: 45,
      statut: "SATISFAITE",
      reponse: "Une capsule existe déjà : elle couvre le principe, le calendrier et la préparation.",
    },
  ];
  for (const d of DEMANDES) {
    const [auteur, ...autres] = melanger(membres);
    const [r] = await db
      .insert(s.demandesFormation)
      .values({
        titre: d.titre,
        description: d.description,
        domaineId: domaineIds[d.domaine],
        demandeurId: auteur.id,
        jeId: jeIds[auteur.jeCle],
        statut: d.statut,
        reponse: d.reponse ?? null,
        formationId: d.statut === "SATISFAITE" ? formationCloture?.id ?? null : null,
        traiteParId: d.statut === "OUVERTE" ? null : dc,
        traiteLe: d.statut === "OUVERTE" ? null : new Date(Date.now() - (d.age - 3) * JOUR_MS),
        creeLe: new Date(Date.now() - d.age * JOUR_MS),
      })
      .returning({ id: s.demandesFormation.id });
    await db
      .insert(s.votesDemandeFormation)
      .values([auteur, ...autres.slice(0, d.soutiens - 1)].map((m) => ({ demandeId: r.id, utilisateurId: m.id })));
  }

  // Notifications anciennes : lues. Célébrations : déjà vues, sauf une pour la démo.
  await client.unsafe(`
    update notification set lue = true where cree_le < now() - interval '3 days';
    update notification set donnees = donnees || '{"celebre": true}'::jsonb where type = 'NIVEAU';
    update badge_obtenu set celebre = true;
  `);
  const [dernierBadge] = await db
    .select({ badgeId: s.badgesObtenus.badgeId })
    .from(s.badgesObtenus)
    .where(eq(s.badgesObtenus.utilisateurId, yasmine.id))
    .orderBy(sql`${s.badgesObtenus.obtenuLe} desc`)
    .limit(1);
  if (dernierBadge) {
    await db
      .update(s.badgesObtenus)
      .set({ celebre: false })
      .where(and(eq(s.badgesObtenus.utilisateurId, yasmine.id), eq(s.badgesObtenus.badgeId, dernierBadge.badgeId)));
  }
  await db.insert(s.notifications).values({
    utilisateurId: formateurIds.amira,
    type: "VALIDATION",
    titre: "Formation à compléter",
    message: "« Les 8 secrets du succès » a été renvoyée avec un commentaire du responsable pédagogique.",
    lien: "/studio",
  });

  const stats = await client.unsafe(`
    select (select count(*) from utilisateur) u, (select count(*) from formation) f, (select count(*) from progression where statut='TERMINEE') t,
           (select count(*) from certificat) c, (select count(*) from badge_obtenu) b, (select count(*) from tentative_quiz) q
  `);
  console.log(
    `✔ Semis terminé en ${Math.round((Date.now() - debut) / 1000)} s — ${stats[0].u} comptes, ${stats[0].f} formations, ${stats[0].t} formations terminées, ${stats[0].q} tentatives de quiz, ${stats[0].c} certificats, ${stats[0].b} badges obtenus.`
  );
  console.log(`  Mot de passe de tous les comptes de démonstration : ${MOT_DE_PASSE}`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
