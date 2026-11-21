import { notFound } from "next/navigation";
import { EntetePage } from "@/components/ui/entete-page";
import { FormulaireFroid } from "@/components/evaluations/formulaire-froid";
import { preparerEvaluationFroid } from "@/server/requetes/evaluations";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Évaluation à froid" };

export default async function PageEvaluationFroid({ params }: PageProps<"/evaluations/[slug]">) {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const { slug } = await params;
  const p = await preparerEvaluationFroid(u.id, slug);
  // Déjà faite, ou formation non terminée : rien à évaluer ici.
  if (!p) notFound();

  return (
    <div>
      <EntetePage
        titre="Évaluation à froid"
        description="Cinq questions, deux minutes. C'est le dernier maillon de la mesure."
        retour={{ href: "/evaluations", libelle: "Évaluations" }}
      />
      <FormulaireFroid p={p} />
    </div>
  );
}
