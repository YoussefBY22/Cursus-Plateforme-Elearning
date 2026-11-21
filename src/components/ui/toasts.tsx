"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toasts discrets en bas à droite. Un petit magasin global
 * (useSyncExternalStore) : n'importe quel composant client appelle
 * `toast(...)` sans fournisseur à traverser.
 */

export type Toast = {
  id: number;
  titre: string;
  description?: string;
  ton?: "succes" | "info" | "erreur";
  visuel?: React.ReactNode;
  duree?: number;
};

let suivant = 1;
let toasts: Toast[] = [];
const abonnes = new Set<() => void>();
const emettre = () => abonnes.forEach((f) => f());

export function toast(t: Omit<Toast, "id">) {
  const id = suivant++;
  toasts = [...toasts.slice(-3), { id, ...t }];
  emettre();
  setTimeout(() => fermer(id), t.duree ?? 5200);
  return id;
}

function fermer(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emettre();
}

export function Toasts() {
  const liste = React.useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => toasts,
    () => toasts
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {liste.map((t) => (
        <div
          key={t.id}
          role="status"
          className="anim-glissement pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 pr-2 shadow-haut"
        >
          <div className="shrink-0">
            {t.visuel ??
              (t.ton === "erreur" ? (
                <TriangleAlert className="h-5 w-5 text-danger" />
              ) : t.ton === "info" ? (
                <Info className="h-5 w-5 text-turquoise" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ))}
          </div>
          <div className={cn("min-w-0 flex-1", t.visuel ? "pt-0.5" : "")}>
            <p className="text-sm font-bold leading-snug">{t.titre}</p>
            {t.description ? <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{t.description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => fermer(t.id)}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fermer la notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
