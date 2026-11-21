import { notFound } from "next/navigation";
import { LienBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { FormulaireProfil } from "@/components/profils/formulaire-profil";
import { monProfil } from "@/server/requetes/profils";
import { exigerSession } from "@/server/session";

export const metadata = { title: "Mon profil" };

export default async function PageProfil() {
  const u = await exigerSession();
  const profil = await monProfil(u.id);
  if (!profil) notFound();

  return (
    <div>
      <EntetePage
        titre="Mon profil"
        description="Un profil complet se fait contacter. C'est tout l'intérêt du réseau."
        actions={
          <LienBouton href={`/membres/${profil.id}`} variante="contour">
            Voir mon profil public
          </LienBouton>
        }
      />
      <FormulaireProfil profil={profil} />
    </div>
  );
}
