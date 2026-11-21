import { Plus } from "lucide-react";
import { BoutonAttributionRetroactive, GalerieBadges } from "@/components/admin/galerie-badges";
import { LienBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { galerieBadges, referencesEditeurBadge } from "@/server/requetes/admin-badges";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";

export const metadata = { title: "Badges" };

export default async function PageBadges() {
  const u = await exigerPermissionPage("badges", "lire");
  const [{ badges, membresActifs }, refs] = await Promise.all([galerieBadges(), referencesEditeurBadge()]);
  const peutEcrire = can(u.roles, "badges", "ecrire");
  const nomsParametres = Object.fromEntries([...refs.domaines, ...refs.parcours].map((x) => [x.id, x.nom]));
  const actifs = badges.filter((b) => b.actif).length;

  return (
    <div>
      <EntetePage
        titre="Badges"
        description={`${actifs} badges actifs. Chacun se débloque seul quand son critère atteint le seuil ; rien ne s'attribue à la main.`}
        actions={
          peutEcrire ? (
            <>
              <BoutonAttributionRetroactive />
              <LienBouton href="/admin/badges/nouveau">
                <Plus size={16} /> Créer un badge
              </LienBouton>
            </>
          ) : null
        }
      />
      <GalerieBadges
        badges={badges.map((b) => ({ ...b, parametre: b.parametre ?? null }))}
        membresActifs={membresActifs}
        nomsParametres={nomsParametres}
      />
    </div>
  );
}
