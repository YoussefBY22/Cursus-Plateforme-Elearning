import "server-only";
import { headers } from "next/headers";
import { FenetreGlissante, type Decision } from "@/services/certificats/fenetre-glissante";
import { ipDepuisEntetes } from "@/services/certificats/verification";

/**
 * Limiteur en mémoire pour les pages publiques de vérification de
 * certificat (page et PDF) : 30 requêtes par IP sur 10 minutes glissantes.
 *
 * Il ne vise pas à arrêter un attaquant déterminé (le jeton fait 256 bits,
 * l'énumération est de toute façon vaine) mais à couper court aux robots
 * qui martèlent l'URL. En mémoire : propre à chaque instance du serveur et
 * remis à zéro au redémarrage — suffisant pour cet usage. Rangé sur
 * `globalThis` pour survivre aux rechargements à chaud du développement.
 */

const LIMITE = 30;
const DUREE_MS = 10 * 60 * 1000;

const globale = globalThis as typeof globalThis & { __limiteurVerification?: FenetreGlissante };
const fenetre = (globale.__limiteurVerification ??= new FenetreGlissante(LIMITE, DUREE_MS));

/** IP du client d'une requête (route handler). */
export function ipDeLaRequete(req: Request): string {
  return ipDepuisEntetes(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip"));
}

/** IP du client de la page en cours de rendu. */
export async function ipDeLaPage(): Promise<string> {
  const h = await headers();
  return ipDepuisEntetes(h.get("x-forwarded-for"), h.get("x-real-ip"));
}

/** Compte une consultation de vérification pour cette IP. */
export function limiterVerification(ip: string): Decision {
  return fenetre.essayer(`verification:${ip}`);
}
