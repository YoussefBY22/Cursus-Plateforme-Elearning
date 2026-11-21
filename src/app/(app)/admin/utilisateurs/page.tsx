import { asc } from "drizzle-orm";
import { TableauUtilisateurs } from "@/components/admin/tableau-utilisateurs";
import { Carte, CorpsCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { db } from "@/db";
import { juniorEntreprises } from "@/db/schema";
import { listeUtilisateurs } from "@/server/requetes/admin-utilisateurs";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";

export const metadata = { title: "Membres et rôles" };

export default async function PageUtilisateurs() {
  const u = await exigerPermissionPage("utilisateurs", "lire");
  const [lignes, jes] = await Promise.all([
    listeUtilisateurs(),
    db.select({ id: juniorEntreprises.id, nom: juniorEntreprises.nom }).from(juniorEntreprises).orderBy(asc(juniorEntreprises.nom)),
  ]);
  const peutEcrire = can(u.roles, "utilisateurs", "ecrire") && u.roles.includes("SUPER_ADMIN");
  const actifs = lignes.filter((l) => l.actif).length;

  return (
    <div>
      <EntetePage
        titre="Membres et rôles"
        description={
          peutEcrire
            ? `${actifs.toLocaleString("fr-FR")} comptes actifs sur ${lignes.length.toLocaleString("fr-FR")}. Ouvrez une fiche pour changer les rôles, l'organisation ou réinitialiser un mot de passe.`
            : `${actifs.toLocaleString("fr-FR")} comptes actifs sur ${lignes.length.toLocaleString("fr-FR")}. Consultation seule : seul le super admin modifie les comptes.`
        }
      />
      <Carte>
        <CorpsCarte className="pt-5">
          <TableauUtilisateurs
            lignes={lignes.map((l) => ({
              id: l.id,
              prenom: l.prenom,
              nom: l.nom,
              email: l.email,
              photoUrl: l.photoUrl,
              roles: l.roles,
              actif: l.actif,
              rattachement: l.rattachement,
              jeId: l.jeId,
              je: l.je,
              jeSigle: l.jeSigle,
              xp: l.xp,
              niveau: l.niveau,
              titreNiveau: l.titreNiveau,
              dernierAcces: l.dernierAcces,
            }))}
            jes={jes}
          />
        </CorpsCarte>
      </Carte>
    </div>
  );
}
