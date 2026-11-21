import { notFound } from "next/navigation";
import { EditeurParcours } from "@/components/studio/editeur-parcours";
import { EntetePage } from "@/components/ui/entete-page";
import { optionsStudio, parcoursPourEdition } from "@/server/requetes/studio";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Modifier un parcours" };

export default async function PageEditionParcours({ params }: PageProps<"/studio/parcours/[id]">) {
  const u = await exigerPermissionPage("studio", "lire");
  const { id } = await params;
  const [parcours, options] = await Promise.all([parcoursPourEdition(u, id), optionsStudio()]);
  if (!parcours) notFound();

  return (
    <div>
      <EntetePage
        titre={parcours.titre || "Parcours sans titre"}
        description="L'ordre des étapes est celui que suivra l'apprenant. Le certificat part à la dernière."
        retour={{ href: "/studio", libelle: "Espace formateur" }}
      />
      <EditeurParcours parcours={parcours} options={options} />
    </div>
  );
}
