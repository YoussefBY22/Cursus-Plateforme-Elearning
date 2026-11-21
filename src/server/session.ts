import "server-only";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/server/auth";
import { can, type ActionCode, type CodeRole, type ModuleCode } from "@/services/rbac";

/**
 * Gardes d'autorisation — à appeler en tête de chaque page protégée et de
 * chaque action serveur. Toute mutation passe par ici : session vérifiée +
 * permission RBAC. Le client ne décide jamais de rien.
 */

export type Utilisateur = Session["user"];

export class AccesRefuse extends Error {
  constructor(message = "Accès refusé.") {
    super(message);
    this.name = "AccesRefuse";
  }
}

/** Page : redirige vers la connexion si besoin. */
export async function exigerSession(): Promise<Utilisateur> {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session.user;
}

/** Page : redirige vers l'accueil si la permission manque. */
export async function exigerPermissionPage(module: ModuleCode, action: ActionCode): Promise<Utilisateur> {
  const u = await exigerSession();
  if (!can(u.roles, module, action)) redirect("/accueil?refus=1");
  return u;
}

/** Action serveur : lève une erreur explicite plutôt que de rediriger. */
export async function exigerPermission(module: ModuleCode, action: ActionCode): Promise<Utilisateur> {
  const session = await auth();
  if (!session?.user?.id) throw new AccesRefuse("Session expirée : reconnectez-vous.");
  if (!can(session.user.roles, module, action)) {
    throw new AccesRefuse(`Permission « ${module}:${action} » requise.`);
  }
  return session.user;
}

export async function exigerConnecte(): Promise<Utilisateur> {
  const session = await auth();
  if (!session?.user?.id) throw new AccesRefuse("Session expirée : reconnectez-vous.");
  return session.user;
}

export function aLeRole(u: Pick<Utilisateur, "roles">, ...roles: CodeRole[]): boolean {
  return roles.some((r) => u.roles.includes(r));
}

export async function sessionFacultative(): Promise<Utilisateur | null> {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}
