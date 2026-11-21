import "server-only";
import { redirect } from "next/navigation";
import { AccesRefuse, exigerConnecte, exigerSession, type Utilisateur } from "@/server/session";

/**
 * Gardes réservées au super admin (organisations, écriture des comptes).
 * La matrice RBAC donne `*` au super admin ; on vérifie ici le rôle lui-même,
 * pour qu'aucune combinaison de permissions ne puisse s'y substituer.
 */

export async function exigerSuperAdminPage(): Promise<Utilisateur> {
  const u = await exigerSession();
  if (!u.roles.includes("SUPER_ADMIN")) redirect("/accueil?refus=1");
  return u;
}

export async function exigerSuperAdmin(): Promise<Utilisateur> {
  const u = await exigerConnecte();
  if (!u.roles.includes("SUPER_ADMIN")) throw new AccesRefuse("Réservé au super admin.");
  return u;
}
