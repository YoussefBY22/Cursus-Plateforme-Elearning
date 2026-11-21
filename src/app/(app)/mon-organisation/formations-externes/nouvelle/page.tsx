import { Building2 } from "lucide-react";
import { FormulaireFormationExterne } from "@/components/rh/formulaire-formation-externe";
import { LienBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { donneesNouvelleFormation, resoudreJe } from "@/server/requetes/rh";
import { exigerPermissionPage } from "@/server/session";
import { avecJe } from "@/services/rh";

export const metadata = { title: "Nouvelle formation externe" };

export default async function PageNouvelleFormationExterne({ searchParams }: PageProps<"/mon-organisation/formations-externes/nouvelle">) {
  const u = await exigerPermissionPage("rh", "ecrire");
  const sp = await searchParams;
  const jeParam = typeof sp.je === "string" ? sp.je : null;
  const je = await resoudreJe(u, jeParam);
  if (!je) {
    return (
      <div>
        <EntetePage titre="Nouvelle formation externe" retour={{ href: "/mon-organisation", libelle: "Mon organisation" }} />
        <EtatVide
          icone={<Building2 className="h-6 w-6" />}
          titre="Aucune organisation"
          description="Une formation externe se rattache à une organisation. Rattachez votre compte à la vôtre depuis votre profil."
          action={<LienBouton href="/profil">Choisir mon organisation</LienBouton>}
        />
      </div>
    );
  }
  const lienJe = u.roles.includes("SUPER_ADMIN") ? je.id : null;
  const d = await donneesNouvelleFormation(je.id);

  return (
    <div>
      <EntetePage
        titre="Nouvelle formation externe"
        description={`Une formation animée au sein de ${je.sigle ?? je.nom}, hors Cursus. Après la création, vous enverrez les auto-évaluations et saisirez l'évaluation du formateur.`}
        retour={{ href: avecJe("/mon-organisation?onglet=formations", lienJe), libelle: "Formations externes" }}
      />
      <div className="max-w-4xl">
        <FormulaireFormationExterne domaines={d.domaines} membres={d.membres} je={je.id} jeParam={lienJe} />
      </div>
    </div>
  );
}
