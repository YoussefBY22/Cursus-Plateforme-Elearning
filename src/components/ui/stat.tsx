import * as React from "react";
import { cn } from "@/lib/utils";

/** Indicateur chiffré : la valeur domine, le libellé dit ce qu'elle mesure. */
export function Stat({
  libelle,
  valeur,
  indice,
  icone,
  className,
  accent,
}: {
  libelle: string;
  valeur: React.ReactNode;
  indice?: React.ReactNode;
  icone?: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex items-center gap-2.5 text-[13px] font-semibold text-muted-foreground">
        {icone ? (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
            style={{ background: accent ?? "var(--nuit)" }}
          >
            {icone}
          </span>
        ) : null}
        {libelle}
      </div>
      <p className="chiffres mt-3 text-[30px] font-extrabold leading-none tracking-tight">{valeur}</p>
      {indice ? <p className="mt-2 text-xs text-muted-foreground">{indice}</p> : null}
    </div>
  );
}
