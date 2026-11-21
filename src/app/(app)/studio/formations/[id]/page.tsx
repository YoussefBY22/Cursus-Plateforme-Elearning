import { notFound } from "next/navigation";
import { EditeurFormation } from "@/components/studio/editeur-formation";
import { EntetePage } from "@/components/ui/entete-page";
import { formationPourEdition, optionsStudio } from "@/server/requetes/studio";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Modifier une formation" };

export default async function PageEditionFormation({ params }: PageProps<"/studio/formations/[id]">) {
  const u = await exigerPermissionPage("studio", "lire");
  const { id } = await params;
  const [formation, options] = await Promise.all([formationPourEdition(u, id), optionsStudio()]);
  if (!formation) notFound();

  return (
    <div>
      <EntetePage
        titre={formation.titre || "Formation sans titre"}
        description="Enregistrez quand vous voulez, même incomplète. La soumission attend que tout soit là."
        retour={{ href: "/studio", libelle: "Espace formateur" }}
      />
      <EditeurFormation formation={formation} options={options} />
    </div>
  );
}
