import { can, type CodeRole } from "@/services/rbac";

export type EntreeNav = {
  href: string;
  libelle: string;
  icone: string;
  compteur?: number;
};

export type SectionNav = { titre: string; entrees: EntreeNav[] };

/**
 * Navigation selon les rôles. Les entrées absentes ne sont pas seulement
 * masquées : chaque page vérifie aussi la permission côté serveur.
 */
export function construireNavigation(
  roles: readonly string[],
  options: { studio: boolean; validations: number; signalements: number; evaluationsFroid: number; demandes: number }
): SectionNav[] {
  const a = (r: CodeRole) => roles.includes(r);
  const sections: SectionNav[] = [
    {
      titre: "Apprendre",
      entrees: [
        { href: "/accueil", libelle: "Accueil", icone: "Gauge" },
        { href: "/catalogue", libelle: "Catalogue", icone: "Library" },
        { href: "/parcours", libelle: "Parcours certifiants", icone: "Map" },
        { href: "/competences", libelle: "Mes compétences", icone: "Hexagon" },
        { href: "/badges", libelle: "Badges", icone: "Award" },
        { href: "/certificats", libelle: "Certificats", icone: "ScrollText" },
        // Ouvert à tous : c'est le terrain qui dit ce qui manque au catalogue.
        // Le compteur ne s'affiche qu'à ceux qui arbitrent.
        {
          href: "/demandes",
          libelle: "Demandes de formation",
          icone: "Lightbulb",
          compteur: can(roles, "suivi", "lire") ? options.demandes : undefined,
        },
      ],
    },
    {
      titre: "Communauté",
      entrees: [
        { href: "/annuaire", libelle: "Annuaire", icone: "Users" },
        { href: "/formateurs", libelle: "Formateurs", icone: "GraduationCap" },
      ],
    },
  ];

  // L'entrée n'apparaît que s'il y a quelque chose à évaluer : une rubrique
  // vide en permanence finit par ne plus être vue.
  if (options.evaluationsFroid > 0) {
    sections[0].entrees.push({
      href: "/evaluations",
      libelle: "À évaluer",
      icone: "CalendarCheck",
      compteur: options.evaluationsFroid,
    });
  }

  const pro: EntreeNav[] = [];
  if (options.studio) pro.push({ href: "/studio", libelle: "Espace formateur", icone: "Presentation" });
  if (a("RESP_RH")) pro.push({ href: "/mon-organisation", libelle: "Mon organisation", icone: "Building2" });
  if (pro.length) sections.push({ titre: "Mon espace", entrees: pro });

  // Chaque entrée est conditionnée à la permission de SA page : un chargé de
  // mission voit le suivi sans voir la validation des contenus.
  if (can(roles, "suivi", "lire") || can(roles, "validation", "lire") || can(roles, "parametres", "lire")) {
    const admin: EntreeNav[] = [];
    if (can(roles, "rapports", "lire")) admin.push({ href: "/admin", libelle: "Pilotage", icone: "ChartLine" });
    if (can(roles, "suivi", "lire")) admin.push({ href: "/admin/suivi", libelle: "Suivi des organisations", icone: "LifeBuoy" });
    if (can(roles, "validation", "lire")) {
      admin.push({ href: "/admin/validations", libelle: "Validations", icone: "ListChecks", compteur: options.validations });
      admin.push({ href: "/admin/contenus", libelle: "Contenus", icone: "BookOpen" });
    }
    if (can(roles, "badges", "lire")) admin.push({ href: "/admin/badges", libelle: "Badges", icone: "Medal" });
    if (can(roles, "certificats", "lire")) admin.push({ href: "/admin/certificats", libelle: "Certificats", icone: "Stamp" });
    if (can(roles, "moderation", "lire"))
      admin.push({ href: "/admin/moderation", libelle: "Modération", icone: "Shield", compteur: options.signalements });
    if (can(roles, "referentiel", "lire")) admin.push({ href: "/admin/referentiel", libelle: "Référentiel", icone: "Brain" });
    if (can(roles, "utilisateurs", "lire")) admin.push({ href: "/admin/utilisateurs", libelle: "Membres et rôles", icone: "UserCheck" });
    if (a("SUPER_ADMIN")) {
      admin.push({ href: "/admin/organisations", libelle: "Organisations", icone: "Landmark" });
    }
    if (can(roles, "rapports", "lire")) admin.push({ href: "/admin/rapports", libelle: "Rapports", icone: "ChartPie" });
    if (a("SUPER_ADMIN")) admin.push({ href: "/admin/parametres", libelle: "Paramètres", icone: "Bolt" });
    sections.push({ titre: "Administration", entrees: admin });
  }
  return sections;
}
