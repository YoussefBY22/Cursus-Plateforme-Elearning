import { FormulairesParametres } from "@/components/admin/formulaires-parametres";
import { EntetePage } from "@/components/ui/entete-page";
import { lireParametres } from "@/server/parametres";
import { exigerSuperAdminPage } from "@/server/requetes/admin-acces";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Paramètres" };

const SOMMAIRE = [
  { href: "#circuit", libelle: "Circuit de validation" },
  { href: "#visionnage", libelle: "Visionnage" },
  { href: "#quiz", libelle: "Quiz" },
  { href: "#auto-evaluation", libelle: "Auto-évaluation" },
  { href: "#evaluation-froid", libelle: "Évaluation à froid" },
  { href: "#ponderations", libelle: "Pondérations" },
  { href: "#inscriptions", libelle: "Inscriptions" },
  { href: "#signataires", libelle: "Signataires" },
];

export default async function PageParametres() {
  await exigerPermissionPage("parametres", "lire");
  await exigerSuperAdminPage();
  const p = await lireParametres();
  return (
    <div>
      <EntetePage
        titre="Paramètres"
        description="Les règles de la plateforme. Chaque section s'enregistre séparément, s'applique tout de suite et reste tracée dans le journal."
      />
      <nav aria-label="Sections des paramètres" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {SOMMAIRE.map((s) => (
          <a key={s.href} href={s.href} className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-semibold hover:bg-muted">
            {s.libelle}
          </a>
        ))}
      </nav>
      <FormulairesParametres p={p} />
    </div>
  );
}
