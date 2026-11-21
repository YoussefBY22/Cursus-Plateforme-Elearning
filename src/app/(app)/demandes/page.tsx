import { MurDemandes } from "@/components/demandes/mur-demandes";
import { EntetePage } from "@/components/ui/entete-page";
import { domainesPourDemande, listerDemandes } from "@/server/requetes/demandes";
import { exigerSession } from "@/server/session";
import { can } from "@/services/rbac";

export const metadata = { title: "Demandes de formation" };

export default async function PageDemandes() {
  const u = await exigerSession();
  const [demandes, domaines] = await Promise.all([listerDemandes(u.id), domainesPourDemande()]);

  return (
    <div>
      <EntetePage
        titre="Demandes de formation"
        description="Ce qui manque au catalogue, dit par celles et ceux qui en ont besoin. Une demande soutenue par plusieurs organisations passe devant."
      />
      <MurDemandes demandes={demandes} domaines={domaines} peutArbitrer={can(u.roles, "suivi", "valider")} />
    </div>
  );
}
