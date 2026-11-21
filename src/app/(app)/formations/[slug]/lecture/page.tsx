import { notFound } from "next/navigation";
import { Lecteur } from "@/components/lecteur/lecteur";
import { Icone } from "@/components/icones";
import { EntetePage } from "@/components/ui/entete-page";
import { Pastille } from "@/components/ui/pastille";
import { nomComplet } from "@/lib/utils";
import { preparerLecture } from "@/server/requetes/lecture";
import { exigerPermissionPage } from "@/server/session";
import { formaterDuree } from "@/services/visionnage";

export async function generateMetadata({ params }: PageProps<"/formations/[slug]/lecture">) {
  const { slug } = await params;
  return { title: `Lecture — ${slug.replace(/-/g, " ")}` };
}

export default async function PageLecture({ params }: PageProps<"/formations/[slug]/lecture">) {
  const u = await exigerPermissionPage("apprentissage", "ecrire");
  const { slug } = await params;
  const d = await preparerLecture(slug, u.id);
  if (!d) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <EntetePage
        retour={{ href: `/formations/${d.formation.slug}`, libelle: "Fiche de la formation" }}
        titre={d.formation.titre}
        description={d.formation.resume}
      />

      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
        <Pastille couleur={d.formation.domaine.couleur}>
          <Icone nom={d.formation.domaine.icone} className="h-3.5 w-3.5" />
          {d.formation.domaine.nom}
        </Pastille>
        <span>{formaterDuree(d.formation.dureeSec)}</span>
        {d.formation.formateur ? <span>Animée par {nomComplet(d.formation.formateur)}</span> : null}
      </div>

      <Lecteur d={d} />
    </div>
  );
}
