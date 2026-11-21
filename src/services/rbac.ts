/**
 * RBAC de Cursus.
 *
 * La matrice rôles → permissions est définie EN CODE (versionnée, revue en
 * pull request). Seuls les rôles des utilisateurs sont en base. Personne ne
 * s'accorde un droit depuis une interface.
 *
 * Permission = "module:action", jokers "*", "module:*", "*:action".
 * Logique pure et isomorphe : la même `can()` sert au serveur et au client.
 */

export const MODULES = [
  "apprentissage", // catalogue, lecture, quiz, parcours, profil
  "annuaire", // networking entre membres
  "studio", // création de formations et parcours
  "validation", // validation des contenus avant publication
  "moderation", // signalements de commentaires
  "badges", // conception des badges
  "certificats", // modèles, émission, révocation
  "referentiel", // référentiel de compétences de la plateforme
  "rh", // espace RH d'une organisation (référentiel adapté, formations externes)
  "suivi", // suivi des organisations par la plateforme et arbitrage des demandes
  "rapports", // tableaux de bord et exports globaux
  "utilisateurs", // comptes et rôles
  "parametres", // paramètres globaux
] as const;
export type ModuleCode = (typeof MODULES)[number];

export const ACTIONS = ["lire", "ecrire", "valider"] as const;
export type ActionCode = (typeof ACTIONS)[number];

export type Permission = "*" | `${ModuleCode}:*` | `*:${ActionCode}` | `${ModuleCode}:${ActionCode}`;

export type CodeRole = "SUPER_ADMIN" | "RESP_PEDAGO" | "CHARGE_SUIVI" | "FORMATEUR" | "RESP_RH" | "MEMBRE";

export const ROLES: Record<CodeRole, { libelle: string; description: string; permissions: Permission[] }> = {
  SUPER_ADMIN: {
    libelle: "Super admin",
    description: "Plateforme — voit tout, paramètres globaux, rapports.",
    permissions: ["*"],
  },
  RESP_PEDAGO: {
    libelle: "Responsable pédagogique",
    description: "équipe pédagogique — formations, parcours, badges, certificats, rapports.",
    permissions: [
      "apprentissage:*",
      "annuaire:lire",
      "studio:*",
      "validation:*",
      "moderation:*",
      "badges:*",
      "certificats:*",
      "referentiel:*",
      "suivi:*",
      "rapports:lire",
      "utilisateurs:lire",
    ],
  },
  CHARGE_SUIVI: {
    libelle: "Chargé de suivi",
    description: "Suit un portefeuille d'organisations : santé, relances, demandes de formation.",
    // Pas de « suivi:valider » : l'attribution des portefeuilles reste au
    // équipe pédagogique, personne ne se rattache une organisation seul.
    permissions: ["apprentissage:*", "annuaire:lire", "suivi:lire", "suivi:ecrire", "rapports:lire"],
  },
  FORMATEUR: {
    libelle: "Formateur",
    description: "Crée ses formations et parcours, soumis à validation.",
    permissions: ["apprentissage:*", "annuaire:lire", "studio:lire", "studio:ecrire"],
  },
  RESP_RH: {
    libelle: "Responsable RH",
    description: "Compétences de son organisation, rattachements et formations externes.",
    permissions: ["apprentissage:*", "annuaire:lire", "rh:*", "referentiel:lire"],
  },
  MEMBRE: {
    libelle: "Membre",
    description: "Apprend, progresse, fait du networking.",
    permissions: ["apprentissage:*", "annuaire:lire"],
  },
};

/** Jamais couverts par `*:action` : il faut une permission explicite. */
const MODULES_SENSIBLES: readonly ModuleCode[] = ["utilisateurs", "parametres"];

export function can(roles: readonly string[] | undefined, module: ModuleCode, action: ActionCode): boolean {
  if (!roles?.length) return false;
  const sensible = MODULES_SENSIBLES.includes(module);
  for (const role of roles) {
    const def = ROLES[role as CodeRole];
    if (!def) continue; // rôle inconnu → ignoré (fail-closed)
    for (const perm of def.permissions) {
      if (
        perm === "*" ||
        perm === `${module}:*` ||
        perm === `${module}:${action}` ||
        (perm === `*:${action}` && !sensible)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function aRole(roles: readonly string[] | undefined, role: CodeRole): boolean {
  return !!roles?.includes(role);
}

export function estAdmin(roles: readonly string[] | undefined): boolean {
  return aRole(roles, "SUPER_ADMIN") || aRole(roles, "RESP_PEDAGO");
}

/** Rôle principal, pour l'affichage (le plus élevé). */
export function rolePrincipal(roles: readonly string[] | undefined): CodeRole {
  const ordre: CodeRole[] = ["SUPER_ADMIN", "RESP_PEDAGO", "CHARGE_SUIVI", "RESP_RH", "FORMATEUR", "MEMBRE"];
  return ordre.find((r) => roles?.includes(r)) ?? "MEMBRE";
}

export function libelleRole(role: string): string {
  return ROLES[role as CodeRole]?.libelle ?? role;
}
