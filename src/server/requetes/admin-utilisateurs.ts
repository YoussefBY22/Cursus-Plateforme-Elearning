import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { journal, juniorEntreprises, utilisateurs } from "@/db/schema";
import { etatNiveau } from "@/services/xp";

export async function listeUtilisateurs() {
  const lignes = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      photoUrl: utilisateurs.photoUrl,
      roles: utilisateurs.roles,
      actif: utilisateurs.actif,
      rattachement: utilisateurs.rattachement,
      jeId: utilisateurs.jeId,
      je: juniorEntreprises.nom,
      jeSigle: juniorEntreprises.sigle,
      xp: utilisateurs.xp,
      dernierAcces: utilisateurs.dernierAcces,
      creeLe: utilisateurs.creeLe,
    })
    .from(utilisateurs)
    .leftJoin(juniorEntreprises, eq(juniorEntreprises.id, utilisateurs.jeId))
    .orderBy(asc(utilisateurs.nom), asc(utilisateurs.prenom));
  return lignes.map((l) => {
    const n = etatNiveau(l.xp);
    return { ...l, niveau: n.niveau, titreNiveau: n.titre };
  });
}

export type LigneUtilisateur = Awaited<ReturnType<typeof listeUtilisateurs>>[number];

export async function ficheUtilisateur(id: string) {
  const [u] = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      email: utilisateurs.email,
      photoUrl: utilisateurs.photoUrl,
      roles: utilisateurs.roles,
      actif: utilisateurs.actif,
      rattachement: utilisateurs.rattachement,
      jeId: utilisateurs.jeId,
      poste: utilisateurs.poste,
      departement: utilisateurs.departement,
      xp: utilisateurs.xp,
      googleId: utilisateurs.googleId,
      aMotDePasse: utilisateurs.motDePasseHash,
      emailVerifieLe: utilisateurs.emailVerifieLe,
      dernierAcces: utilisateurs.dernierAcces,
      creeLe: utilisateurs.creeLe,
    })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, id))
    .limit(1);
  if (!u) return null;

  const [jes, historique] = await Promise.all([
    db
      .select({ id: juniorEntreprises.id, nom: juniorEntreprises.nom, active: juniorEntreprises.active })
      .from(juniorEntreprises)
      .orderBy(asc(juniorEntreprises.nom)),
    db
      .select({
        id: journal.id,
        action: journal.action,
        details: journal.details,
        creeLe: journal.creeLe,
        acteurPrenom: utilisateurs.prenom,
        acteurNom: utilisateurs.nom,
      })
      .from(journal)
      .leftJoin(utilisateurs, eq(utilisateurs.id, journal.acteurId))
      .where(and(eq(journal.entite, "utilisateur"), eq(journal.entiteId, id)))
      .orderBy(desc(journal.creeLe))
      .limit(12),
  ]);

  return {
    utilisateur: { ...u, aMotDePasse: !!u.aMotDePasse, niveau: etatNiveau(u.xp) },
    jes,
    historique,
  };
}
