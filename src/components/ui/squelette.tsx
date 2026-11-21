import { cn } from "@/lib/utils";

export function Squelette({ className }: { className?: string }) {
  return <div aria-hidden className={cn("squelette", className)} />;
}

/** Squelette de page générique : en-tête + grille de cartes. */
export function SqueletteePage({ cartes = 6 }: { cartes?: number }) {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <Squelette className="mb-3 h-9 w-72" />
      <Squelette className="mb-8 h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cartes }).map((_, i) => (
          <Squelette key={i} className="h-56" />
        ))}
      </div>
    </div>
  );
}
