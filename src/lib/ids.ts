import { randomBytes } from "node:crypto";

/**
 * Identifiant aléatoire de 24 caractères (base 36, ~124 bits).
 *
 * Pas d'entier séquentiel : un système tiers pourra recevoir ces identifiants
 * sans qu'ils trahissent les volumes, et personne ne devine l'identifiant
 * voisin. Préfixe temporel pour garder un ordre d'insertion approximatif
 * dans les index.
 */
export function nouvelId(): string {
  const temps = Date.now().toString(36).padStart(9, "0");
  const alea = randomBytes(10)
    .reduce((acc, octet) => acc + (octet % 36).toString(36), "")
    .padEnd(15, "0");
  return `c${temps}${alea}`.slice(0, 24);
}

/** Jeton opaque 256 bits, base64url : liens de vérification, certificats. */
export function jetonAleatoire(octets = 32): string {
  return randomBytes(octets).toString("base64url");
}
