import { notFound } from "next/navigation";
import { EditeurBadge } from "@/components/admin/editeur-badge";
import { EntetePage } from "@/components/ui/entete-page";
import { badgeParId, referencesEditeurBadge } from "@/server/requetes/admin-badges";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";
import { pluriel } from "@/lib/utils";

export const metadata = { title: "Modifier le badge" };

export default async function PageEditionBadge({ params }: PageProps<"/admin/badges/[id]">) {
  const u = await exigerPermissionPage("badges", "lire");
  const { id } = await params;
  const [badge, refs] = await Promise.all([badgeParId(id), referencesEditeurBadge()]);
  if (!badge) notFound();
  const peutEcrire = can(u.roles, "badges", "ecrire");

  return (
    <div>
      <EntetePage
        retour={{ href: "/admin/badges", libelle: "Badges" }}
        titre={badge.nom}
        description={
          badge.obtenus > 0
            ? `Obtenu par ${pluriel(badge.obtenus, "membre")}. Relever le seuil ne retire le badge à personne ; l'abaisser se répercute à la prochaine vérification ou via « Attribuer rétroactivement ».`
            : "Personne ne l'a encore obtenu."
        }
      />
      {peutEcrire ? (
        <EditeurBadge
          badge={{
            id: badge.id,
            nom: badge.nom,
            description: badge.description,
            couleur: badge.couleur,
            forme: badge.forme,
            matiere: badge.matiere,
            rarete: badge.rarete,
            effet: badge.effet,
            icone: badge.icone,
            critereCode: badge.critereCode,
            seuil: badge.seuil,
            parametre: badge.parametre,
            xpBonus: badge.xpBonus,
            secret: badge.secret,
            actif: badge.actif,
            obtenus: badge.obtenus,
          }}
          criteres={refs.criteres}
          domaines={refs.domaines}
          parcours={refs.parcours}
        />
      ) : (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Consultation seule : la conception des badges est réservée au responsable pédagogique et au super admin.
        </p>
      )}
    </div>
  );
}
