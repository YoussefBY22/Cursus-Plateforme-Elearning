import { notFound } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { SectionCompetencesProfil } from "@/components/competences/section-profil";
import { CarteProfil, FriseProfil, StatsProfilCartes } from "@/components/profils/carte-profil";
import { LienBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { profilPublic } from "@/server/requetes/profils";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Profil d'un membre" };

export default async function PageMembre({ params }: PageProps<"/membres/[id]">) {
  const u = await exigerPermissionPage("annuaire", "lire");
  const { id } = await params;
  const profil = await profilPublic(u, id);
  // Un profil masqué et un profil inexistant répondent pareil : rien ne
  // permet de deviner qui existe mais se cache.
  if (!profil) notFound();

  const formateur = profil.roles.includes("FORMATEUR");

  return (
    <div className="space-y-6">
      <EntetePage
        titre={profil.cEstMoi ? "Mon profil public" : profil.nom}
        description={profil.cEstMoi ? "C'est ce que les autres membres voient." : undefined}
        retour={{ href: "/annuaire", libelle: "Annuaire" }}
        actions={
          profil.cEstMoi ? (
            <LienBouton href="/profil" variante="contour">
              Modifier mon profil
            </LienBouton>
          ) : formateur ? (
            <LienBouton href={`/formateurs/${profil.id}`} variante="contour">
              <GraduationCap className="h-4 w-4" aria-hidden />
              Profil formateur
            </LienBouton>
          ) : undefined
        }
      />

      <CarteProfil profil={profil} />
      <StatsProfilCartes profil={profil} />
      {profil.stats ? <SectionCompetencesProfil utilisateurId={profil.id} /> : null}
      <FriseProfil profil={profil} />
    </div>
  );
}
