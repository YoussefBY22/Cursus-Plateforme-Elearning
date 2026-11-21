import { Archive, Download, FileSpreadsheet } from "lucide-react";
import { classesBouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { avecJe, EXPORTS_RH, TYPES_EXPORT_RH } from "@/services/rh";

/**
 * Onglet « Exports » : chaque lien télécharge un CSV (UTF-8 avec BOM, ouvert
 * tel quel par Excel). L'archive regroupe tout dans un seul fichier.
 */
export function ExportsRh({ je }: { je: string | null }) {
  const simples = TYPES_EXPORT_RH.filter((t) => t !== "tout");
  return (
    <div className="grid gap-6">
      <Carte className="flex flex-wrap items-center gap-4 border-nuit/30 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-nuit text-white">
          <Archive size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="text-[15px] font-bold tracking-tight">{EXPORTS_RH.tout.titre}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{EXPORTS_RH.tout.description}</p>
        </div>
        <a href={avecJe("/api/mon-organisation/export/tout", je)} className={classesBouton("primaire")} download>
          <Download size={16} aria-hidden /> Télécharger l&apos;archive
        </a>
      </Carte>

      <ul className="grid gap-3 sm:grid-cols-2">
        {simples.map((t) => (
          <li key={t}>
            <Carte className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                  <FileSpreadsheet size={17} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold">{EXPORTS_RH[t].titre}</h3>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{EXPORTS_RH[t].description}</p>
                </div>
              </div>
              <a href={avecJe(`/api/mon-organisation/export/${t}`, je)} className={classesBouton("contour", "sm", "mt-auto self-start")} download>
                <Download size={14} aria-hidden /> Télécharger le CSV
              </a>
            </Carte>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Les fichiers sont en UTF-8, séparés par des virgules ; les nombres utilisent le point décimal et les dates le format
        AAAA-MM-JJ. Gardez une copie à chaque fin de mandat : vos données restent lisibles même sans la plateforme.
      </p>
    </div>
  );
}
