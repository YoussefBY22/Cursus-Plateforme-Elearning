import { GestionReferentiel } from "@/components/admin/gestion-referentiel";
import { EntetePage } from "@/components/ui/entete-page";
import { donneesReferentiel } from "@/server/requetes/admin-referentiel";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";

export const metadata = { title: "Référentiel de compétences" };

export default async function PageReferentiel() {
  const u = await exigerPermissionPage("referentiel", "lire");
  const domaines = await donneesReferentiel();
  const peutEcrire = can(u.roles, "referentiel", "ecrire");
  const total = domaines.reduce((s, d) => s + d.competences.filter((c) => c.active).length, 0);

  return (
    <div>
      <EntetePage
        titre="Référentiel de compétences"
        description={`${domaines.length} domaines, ${total} compétences actives : le socle commun. Chaque organisation peut l'adapter ; les mesures restent comparables grâce au lien vers la compétence d'origine.`}
      />
      {peutEcrire ? null : (
        <p className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground">
          Consultation seule. Pour adapter une compétence à votre organisation, passez par l&apos;espace « Mon organisation ».
        </p>
      )}
      <GestionReferentiel
        peutEcrire={peutEcrire}
        domaines={domaines.map((d) => ({
          id: d.id,
          nom: d.nom,
          description: d.description,
          couleur: d.couleur,
          icone: d.icone,
          jesAdaptees: d.jesAdaptees,
          competences: d.competences.map((c) => ({
            id: c.id,
            nom: c.nom,
            description: c.description,
            question: c.question,
            pistes: c.pistes,
            active: c.active,
            adaptations: c.adaptations,
          })),
        }))}
      />
    </div>
  );
}
