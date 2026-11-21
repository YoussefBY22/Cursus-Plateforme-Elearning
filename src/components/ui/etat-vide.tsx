import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * État vide : une icône, un titre, et une phrase qui dit QUOI FAIRE — jamais
 * seulement qu'il n'y a rien. Aucune liste vide ne reste muette.
 */
export function EtatVide({
  icone,
  titre,
  description,
  action,
  className,
  compact,
}: {
  icone?: React.ReactNode;
  titre: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 text-center",
        compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-14",
        className
      )}
    >
      {icone ? (
        <div className="relative mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-nuit text-white">
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" aria-hidden />
          {icone}
        </div>
      ) : null}
      <p className="text-[15px] font-bold tracking-tight">{titre}</p>
      {description ? <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Erreur récupérable : dit ce qui s'est passé et comment s'en sortir. */
export function EtatErreur({ titre, description, action }: { titre: string; description?: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger/25 bg-danger-soft/60 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger text-white">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[15px] font-bold text-danger">{titre}</p>
      {description ? <p className="max-w-md text-sm text-foreground/80">{description}</p> : null}
      {action}
    </div>
  );
}
