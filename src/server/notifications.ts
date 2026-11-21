import { and, arrayOverlaps, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications, utilisateurs } from "@/db/schema";
import { envoyerEmail, gabaritEmail, urlApp } from "@/server/email";

/**
 * Notifications in-app (+ e-mail si demandé).
 * Idempotent quand `cle` est fournie : la clé (cle:destinataire) est unique,
 * un rappel rejoué ne prévient pas deux fois.
 *
 * Types : BADGE, NIVEAU, CERTIFICAT, VALIDATION, COMMENTAIRE, LIKE,
 * EVALUATION_FROID, AUTO_EVALUATION, RATTACHEMENT, MODERATION, INFO.
 */

export type ContenuNotification = {
  type: string;
  titre: string;
  message: string;
  lien?: string;
  donnees?: Record<string, unknown>;
  email?: boolean;
  cle?: string;
};

export async function notifier(destinataires: string[], contenu: ContenuNotification): Promise<number> {
  const ids = [...new Set(destinataires.filter(Boolean))];
  if (!ids.length) return 0;
  let crees = 0;
  for (const id of ids) {
    const resultat = await db
      .insert(notifications)
      .values({
        utilisateurId: id,
        type: contenu.type,
        titre: contenu.titre,
        message: contenu.message,
        lien: contenu.lien ?? null,
        donnees: contenu.donnees ?? {},
        cleIdempotence: contenu.cle ? `${contenu.cle}:${id}` : null,
      })
      .onConflictDoNothing({ target: notifications.cleIdempotence })
      .returning({ id: notifications.id });
    if (!resultat.length) continue;
    crees++;
  }

  if (contenu.email && crees > 0) {
    const cibles = await db
      .select({ email: utilisateurs.email })
      .from(utilisateurs)
      .where(and(inArray(utilisateurs.id, ids), eq(utilisateurs.actif, true)));
    for (const c of cibles) {
      await envoyerEmail({
        a: c.email,
        sujet: `Cursus — ${contenu.titre}`,
        html: gabaritEmail(
          contenu.titre,
          contenu.message,
          contenu.lien ? { url: urlApp(contenu.lien), libelle: "Ouvrir Cursus" } : undefined
        ),
      });
    }
  }
  return crees;
}

/** Destinataires par rôle (tous les comptes actifs portant l'un des rôles). */
export async function idsParRoles(roles: string[]): Promise<string[]> {
  const lignes = await db
    .select({ id: utilisateurs.id })
    .from(utilisateurs)
    .where(and(eq(utilisateurs.actif, true), arrayOverlaps(utilisateurs.roles, roles)));
  return lignes.map((l) => l.id);
}
