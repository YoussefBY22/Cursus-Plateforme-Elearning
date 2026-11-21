import { TableauFormationsAdmin, TableauParcoursAdmin } from "@/components/admin/tableaux-contenus";
import { Carte, CorpsCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Onglets } from "@/components/ui/onglets";
import { contenusAdmin } from "@/server/requetes/admin-contenus";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";

export const metadata = { title: "Contenus" };

export default async function PageContenus({ searchParams }: PageProps<"/admin/contenus">) {
  const u = await exigerPermissionPage("validation", "lire");
  const { onglet } = await searchParams;
  const actif = onglet === "parcours" ? "parcours" : "formations";
  const d = await contenusAdmin();
  const peutAgir = can(u.roles, "validation", "valider");
  const publiees = d.formations.filter((f) => f.statut === "PUBLIE").length;

  return (
    <div>
      <EntetePage
        titre="Contenus"
        description={`${publiees} formations publiées sur ${d.formations.length}. Archivez ce qui n'est plus d'actualité : rien n'est effacé, et un contenu archivé se republie d'un clic.`}
      />
      <Onglets
        actif={actif}
        onglets={[
          { cle: "formations", libelle: "Formations", href: "/admin/contenus", compteur: d.formations.length },
          { cle: "parcours", libelle: "Parcours certifiants", href: "/admin/contenus?onglet=parcours", compteur: d.parcours.length },
        ]}
      />
      <Carte>
        <CorpsCarte className="pt-5">
          {actif === "formations" ? (
            <TableauFormationsAdmin lignes={d.formations} domaines={d.domaines} peutAgir={peutAgir} />
          ) : (
            <TableauParcoursAdmin lignes={d.parcours} domaines={d.domaines} peutAgir={peutAgir} />
          )}
        </CorpsCarte>
      </Carte>
    </div>
  );
}
