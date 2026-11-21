import "server-only";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { badges, badgesObtenus, criteresBadge, domaines, notifications, parcours, utilisateurs } from "@/db/schema";
import { statistiquesMembre } from "@/server/moteur/gamification";
import { avancementBadge, CRITERES_PAR_CODE, valeurCritere } from "@/services/badges";
import { etatNiveau } from "@/services/xp";

/*
 * Collection de badges et notifications d'un membre.
 *
 * Un badge non obtenu affiche son avancement : savoir qu'il reste deux
 * formations à terminer motive, là où une silhouette grise ne dit rien. Les
 * badges secrets, eux, restent muets jusqu'à leur obtention — c'est leur
 * raison d'être.
 */

export type BadgeCollection = {
  id: string;
  nom: string;
  description: string;
  couleur: string;
  forme: string;
  matiere: string;
  rarete: string;
  effet: string;
  icone: string;
  xpBonus: number;
  secret: boolean;
  obtenuLe: Date | null;
  /** Avancement 0–1 vers l'obtention ; 1 si obtenu. */
  avancement: number;
  /** Phrase du critère, masquée pour un badge secret non obtenu. */
  critere: string | null;
  valeurActuelle: number | null;
  seuil: number | null;
  unite: string | null;
  obtenusAilleurs: number;
};

export type MaCollection = {
  badges: BadgeCollection[];
  obtenus: number;
  total: number;
  xp: number;
  niveau: ReturnType<typeof etatNiveau>;
  parRarete: { rarete: string; obtenus: number; total: number }[];
};

const RARETES_ORDRE = ["MYTHIQUE", "LEGENDAIRE", "EPIQUE", "RARE", "COMMUN"];

export async function maCollection(utilisateurId: string): Promise<MaCollection> {
  const [lignes, miens, stats, compte, [moi]] = await Promise.all([
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
        xpBonus: badges.xpBonus,
        secret: badges.secret,
        actif: badges.actif,
        critereCode: badges.critereCode,
        seuil: badges.seuil,
        parametre: badges.parametre,
        critereLibelle: criteresBadge.libelle,
        unite: criteresBadge.unite,
      })
      .from(badges)
      .innerJoin(criteresBadge, eq(criteresBadge.code, badges.critereCode))
      .where(eq(badges.actif, true))
      .orderBy(asc(badges.nom)),
    db
      .select({ badgeId: badgesObtenus.badgeId, obtenuLe: badgesObtenus.obtenuLe })
      .from(badgesObtenus)
      .where(eq(badgesObtenus.utilisateurId, utilisateurId)),
    statistiquesMembre(utilisateurId),
    db
      .select({ badgeId: badgesObtenus.badgeId, n: count() })
      .from(badgesObtenus)
      .groupBy(badgesObtenus.badgeId),
    db.select({ xp: utilisateurs.xp }).from(utilisateurs).where(eq(utilisateurs.id, utilisateurId)).limit(1),
  ]);

  const iMiens = new Map(miens.map((m) => [m.badgeId, m.obtenuLe]));
  const iCompte = new Map(compte.map((c) => [c.badgeId, c.n]));

  // Nom lisible du paramètre (domaine ou parcours) pour la phrase du critère.
  const idsDomaine = lignes.filter((l) => l.critereCode === "FORMATIONS_DOMAINE" && l.parametre).map((l) => l.parametre!);
  const idsParcours = lignes.filter((l) => l.critereCode === "PARCOURS_SPECIFIQUE" && l.parametre).map((l) => l.parametre!);
  const [nomsDom, nomsParc] = await Promise.all([
    idsDomaine.length
      ? db.select({ id: domaines.id, nom: domaines.nom }).from(domaines).where(inArray(domaines.id, idsDomaine))
      : Promise.resolve([]),
    idsParcours.length
      ? db.select({ id: parcours.id, nom: parcours.titre }).from(parcours).where(inArray(parcours.id, idsParcours))
      : Promise.resolve([]),
  ]);
  const iNoms = new Map([...nomsDom, ...nomsParc].map((n) => [n.id, n.nom]));

  const collection: BadgeCollection[] = lignes.map((l) => {
    const obtenuLe = iMiens.get(l.id) ?? null;
    const regle = { id: l.id, critereCode: l.critereCode, seuil: l.seuil, parametre: l.parametre, actif: l.actif };
    const def = CRITERES_PAR_CODE.get(l.critereCode);
    const masque = l.secret && !obtenuLe;
    const precision = l.parametre ? ` (${iNoms.get(l.parametre) ?? "élément retiré"})` : "";
    return {
      id: l.id,
      nom: masque ? "Badge secret" : l.nom,
      description: masque ? "Celui-là se découvre en jouant le jeu." : l.description,
      couleur: l.couleur,
      forme: l.forme,
      matiere: l.matiere,
      rarete: l.rarete,
      effet: l.effet,
      icone: masque ? "HelpCircle" : l.icone,
      xpBonus: l.xpBonus,
      secret: l.secret,
      obtenuLe,
      avancement: obtenuLe ? 1 : masque ? 0 : avancementBadge(regle, stats),
      critere: masque ? null : `${l.critereLibelle}${precision}`,
      valeurActuelle: masque ? null : Math.round(valeurCritere(regle, stats) * 10) / 10,
      seuil: masque ? null : l.seuil,
      unite: masque ? null : (def?.unite ?? l.unite),
      obtenusAilleurs: iCompte.get(l.id) ?? 0,
    };
  });

  const parRarete = RARETES_ORDRE.map((rarete) => ({
    rarete,
    obtenus: collection.filter((b) => b.rarete === rarete && b.obtenuLe).length,
    total: collection.filter((b) => b.rarete === rarete).length,
  })).filter((r) => r.total > 0);

  return {
    badges: collection,
    obtenus: collection.filter((b) => b.obtenuLe).length,
    total: collection.length,
    xp: moi?.xp ?? 0,
    niveau: etatNiveau(moi?.xp ?? 0),
    parRarete,
  };
}

export type LigneNotification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  lien: string | null;
  lue: boolean;
  creeLe: Date;
};

export async function mesNotifications(
  utilisateurId: string,
  options: { seulementNonLues?: boolean; limite?: number } = {}
): Promise<{ lignes: LigneNotification[]; nonLues: number }> {
  const conditions = [eq(notifications.utilisateurId, utilisateurId)];
  if (options.seulementNonLues) conditions.push(eq(notifications.lue, false));

  const [lignes, [{ nonLues }]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        titre: notifications.titre,
        message: notifications.message,
        lien: notifications.lien,
        lue: notifications.lue,
        creeLe: notifications.creeLe,
      })
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.creeLe))
      .limit(options.limite ?? 100),
    db
      .select({ nonLues: count() })
      .from(notifications)
      .where(and(eq(notifications.utilisateurId, utilisateurId), eq(notifications.lue, false))),
  ]);
  return { lignes, nonLues };
}
