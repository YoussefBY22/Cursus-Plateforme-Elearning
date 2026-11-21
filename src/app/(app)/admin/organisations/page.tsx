import { GestionJE } from "@/components/admin/gestion-je";
import { EntetePage } from "@/components/ui/entete-page";
import { exigerSuperAdminPage } from "@/server/requetes/admin-acces";
import { listeOrganisations } from "@/server/requetes/admin-je";

export const metadata = { title: "Organisations" };

export default async function PageOrganisations() {
  await exigerSuperAdminPage();
  const jes = await listeOrganisations();
  const actives = jes.filter((j) => j.active).length;
  return (
    <div>
      <EntetePage
        titre="Organisations"
        description={`${actives} organisation actives sur ${jes.length}. Une organisation désactivée disparaît de l'inscription et du pilotage, sans rien perdre de ses membres ni de leur historique.`}
      />
      <GestionJE jes={jes} />
    </div>
  );
}
