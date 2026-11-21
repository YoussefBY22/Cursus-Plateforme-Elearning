import { ListeAnnuaire } from "@/components/profils/liste-annuaire";
import { EntetePage } from "@/components/ui/entete-page";
import { annuaire, jePourFiltre } from "@/server/requetes/profils";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Annuaire" };

export default async function PageAnnuaire({ searchParams }: PageProps<"/annuaire">) {
  const u = await exigerPermissionPage("annuaire", "lire");
  const q = await searchParams;
  const filtres = {
    q: typeof q.q === "string" ? q.q.slice(0, 80) : undefined,
    jeId: typeof q.je === "string" ? q.je : undefined,
    role: typeof q.role === "string" ? q.role : undefined,
  };

  const [lignes, jes] = await Promise.all([annuaire(u, filtres), jePourFiltre()]);

  return (
    <div>
      <EntetePage
        titre="Annuaire"
        description="Les membres des organisations de la plateforme. Pas de messagerie ici : on se joint par LinkedIn."
      />
      <ListeAnnuaire lignes={lignes} jes={jes} />
    </div>
  );
}
