import { Download, FileSpreadsheet } from "lucide-react";
import { Icone } from "@/components/icones";
import { classesBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { volumesRapports } from "@/server/requetes/admin-rapports";
import { exigerPermissionPage } from "@/server/session";
import { DESCRIPTIONS_RAPPORTS, TYPES_RAPPORT } from "@/services/rapports";

export const metadata = { title: "Rapports" };

export default async function PageRapports() {
  await exigerPermissionPage("rapports", "lire");
  const volumes = await volumesRapports();
  return (
    <div>
      <EntetePage
        titre="Rapports"
        description="Les données brutes de la plateforme, en CSV lisible par Excel, Google Sheets ou un outil de BI. Chaque export est tracé dans le journal."
      />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TYPES_RAPPORT.map((type) => {
          const r = DESCRIPTIONS_RAPPORTS[type];
          const n = volumes[type];
          return (
            <li key={type} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nuit text-white">
                  <Icone nom={r.icone} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold">{r.titre}</h2>
                  <p className="chiffres text-xs text-muted-foreground">
                    {n.toLocaleString("fr-FR")} ligne{n > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">{r.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileSpreadsheet size={14} aria-hidden /> CSV, UTF-8
                </span>
                {n === 0 ? (
                  <span className="text-xs text-muted-foreground">Rien à exporter pour l&apos;instant</span>
                ) : (
                  <a href={`/api/admin/rapports/${type}`} download className={classesBouton("contour", "sm")}>
                    <Download size={14} aria-hidden /> Télécharger
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-muted-foreground">
        Les fichiers contiennent des données personnelles (noms, e-mails, niveaux) : ne les partagez qu&apos;avec les personnes
        habilitées et supprimez les copies devenues inutiles.
      </p>
    </div>
  );
}
