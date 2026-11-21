"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fenêtre modale sur l'élément natif <dialog> : focus piégé, Échap et
 * arrière-plan gérés par le navigateur, sans bibliothèque.
 */
export function Dialogue({
  ouvert,
  onFermer,
  titre,
  description,
  children,
  className,
  fermable = true,
}: {
  ouvert: boolean;
  onFermer?: () => void;
  titre?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fermable?: boolean;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) d.showModal();
    if (!ouvert && d.open) d.close();
  }, [ouvert]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (fermable) onFermer?.();
      }}
      onClick={(e) => {
        if (fermable && e.target === ref.current) onFermer?.();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-border bg-card p-0 text-foreground shadow-haut",
        "backdrop:bg-nuit/55 backdrop:backdrop-blur-[2px] open:animate-[apparition-echelle_380ms_cubic-bezier(0.34,1.56,0.64,1)_both]",
        className
      )}
    >
      {ouvert ? (
        <div className="p-6 sm:p-7">
          {titre || fermable ? (
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                {titre ? <h2 className="text-lg font-extrabold tracking-tight">{titre}</h2> : null}
                {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
              </div>
              {fermable ? (
                <button
                  type="button"
                  onClick={onFermer}
                  className="-mr-2 -mt-1 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
