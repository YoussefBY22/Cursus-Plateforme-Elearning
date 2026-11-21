import { EditeurBadge } from "@/components/admin/editeur-badge";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { referencesEditeurBadge } from "@/server/requetes/admin-badges";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Nouveau badge" };

export default async function PageNouveauBadge() {
  await exigerPermissionPage("badges", "ecrire");
  const refs = await referencesEditeurBadge();
  return (
    <div>
      <EntetePage
        retour={{ href: "/admin/badges", libelle: "Badges" }}
        titre="Nouveau badge"
        description="Composez l'apparence, choisissez le critère et le seuil : l'aperçu montre exactement ce que verront les membres."
      />
      {refs.criteres.length === 0 ? (
        <EtatVide titre="Aucun critère de déblocage en base" description="La table des critères est vide : relancez le semis de la base (npm run db:seed) avant de créer un badge." />
      ) : (
        <EditeurBadge badge={null} criteres={refs.criteres} domaines={refs.domaines} parcours={refs.parcours} />
      )}
    </div>
  );
}
