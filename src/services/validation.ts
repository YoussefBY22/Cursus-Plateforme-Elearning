/**
 * Circuit de validation des contenus — logique pure, testée.
 *
 * Règles du brief, traduites en paramètres (stockés en base, modifiables
 * par le super admin) :
 *
 *  - Le super admin publie sans validation.
 *  - Le responsable pédagogique peut-il créer ? `pedagoPeutCreer` (défaut : oui).
 *    Ses contenus doivent-ils être validés par le super admin ?
 *    `pedagoValidationRequise` (défaut : oui). Décoché, il publie directement.
 *  - Tout contenu d'un formateur est validé par un admin avant publication.
 *  - Le responsable pédagogique reçoit en validation tout ce qu'il n'a pas créé
 *    lui-même ; le super admin, tout.
 */

export type ParametresValidation = {
  pedagoPeutCreer: boolean;
  pedagoValidationRequise: boolean;
};

export const PARAMETRES_VALIDATION_DEFAUT: ParametresValidation = {
  pedagoPeutCreer: true,
  pedagoValidationRequise: true,
};

export type Circuit = "PUBLICATION_DIRECTE" | "VALIDATION_REQUISE" | "INTERDIT";

/** Que se passe-t-il quand cet auteur soumet un contenu ? */
export function circuitPour(roles: readonly string[], p: ParametresValidation): Circuit {
  if (roles.includes("SUPER_ADMIN")) return "PUBLICATION_DIRECTE";
  if (roles.includes("RESP_PEDAGO")) {
    if (!p.pedagoPeutCreer) return roles.includes("FORMATEUR") ? "VALIDATION_REQUISE" : "INTERDIT";
    return p.pedagoValidationRequise ? "VALIDATION_REQUISE" : "PUBLICATION_DIRECTE";
  }
  if (roles.includes("FORMATEUR")) return "VALIDATION_REQUISE";
  return "INTERDIT";
}

export function peutCreer(roles: readonly string[], p: ParametresValidation): boolean {
  return circuitPour(roles, p) !== "INTERDIT";
}

/**
 * Ce validateur peut-il statuer sur ce contenu ?
 * Personne ne valide son propre contenu, sauf le super admin (qui publie
 * de toute façon directement).
 */
export function peutValider(
  validateur: { id: string; roles: readonly string[] },
  contenu: { auteurId: string; auteurRoles: readonly string[] }
): boolean {
  if (validateur.roles.includes("SUPER_ADMIN")) return true;
  if (!validateur.roles.includes("RESP_PEDAGO")) return false;
  if (contenu.auteurId === validateur.id) return false;
  // Un contenu d'un autre responsable pédagogique remonte au super admin.
  if (contenu.auteurRoles.includes("RESP_PEDAGO")) return false;
  return true;
}

/** Statut à poser lors d'une soumission. */
export function statutApresSoumission(circuit: Circuit): "PUBLIE" | "EN_VALIDATION" {
  if (circuit === "INTERDIT") throw new Error("Vous n'êtes pas autorisé à publier de contenu.");
  return circuit === "PUBLICATION_DIRECTE" ? "PUBLIE" : "EN_VALIDATION";
}

/** Un contenu publié et modifié par un formateur repasse-t-il en validation ? */
export function modificationRepasseEnValidation(
  statut: string,
  roles: readonly string[],
  p: ParametresValidation
): boolean {
  return statut === "PUBLIE" && circuitPour(roles, p) === "VALIDATION_REQUISE";
}
