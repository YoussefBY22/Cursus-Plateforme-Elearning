import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { badges, badgesObtenus, criteresBadge, domaines, parcours, utilisateurs } from "@/db/schema";

export async function galerieBadges() {
  const [liste, obtentions, [membres]] = await Promise.all([
    db
      .select({
        id: badges.id,
        nom: badges.nom,
        description: badges.description,
        couleur: badges.couleur,
        forme: badges.forme,
        matiere: badges.matiere,
        rarete: badges.rarete,
        effet: badges.effet,
        icone: badges.icone,
        critereCode: badges.critereCode,
        critere: criteresBadge.libelle,
        unite: criteresBadge.unite,
        seuil: badges.seuil,
        parametre: badges.parametre,
        xpBonus: badges.xpBonus,
        secret: badges.secret,
        actif: badges.actif,
      })
      .from(badges)
      .innerJoin(criteresBadge, eq(criteresBadge.code, badges.critereCode))
      .orderBy(asc(badges.ordre), asc(badges.nom)),
    db.select({ badgeId: badgesObtenus.badgeId, n: count() }).from(badgesObtenus).groupBy(badgesObtenus.badgeId),
    db.select({ n: count() }).from(utilisateurs).where(eq(utilisateurs.actif, true)),
  ]);
  const iObt = new Map(obtentions.map((o) => [o.badgeId, o.n]));
  return {
    badges: liste.map((b) => ({ ...b, obtenus: iObt.get(b.id) ?? 0 })),
    membresActifs: membres?.n ?? 0,
  };
}

/** Listes nécessaires à l'éditeur : critères (table en base), domaines, parcours publiés. */
export async function referencesEditeurBadge() {
  const [criteres, listeDomaines, listeParcours] = await Promise.all([
    db.select().from(criteresBadge).orderBy(asc(criteresBadge.ordre), asc(criteresBadge.libelle)),
    db.select({ id: domaines.id, nom: domaines.nom }).from(domaines).orderBy(asc(domaines.ordre)),
    db
      .select({ id: parcours.id, nom: parcours.titre })
      .from(parcours)
      .where(eq(parcours.statut, "PUBLIE"))
      .orderBy(asc(parcours.titre)),
  ]);
  return { criteres, domaines: listeDomaines, parcours: listeParcours };
}

export async function badgeParId(id: string) {
  const [b] = await db.select().from(badges).where(eq(badges.id, id)).limit(1);
  if (!b) return null;
  const [o] = await db.select({ n: count() }).from(badgesObtenus).where(eq(badgesObtenus.badgeId, id));
  return { ...b, obtenus: o?.n ?? 0 };
}
