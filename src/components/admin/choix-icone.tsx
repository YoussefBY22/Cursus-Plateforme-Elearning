"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Icone, NOMS_ICONES } from "@/components/icones";
import { cn } from "@/lib/utils";

/** Grille cliquable des icônes du registre, avec un filtre par nom. */
export function ChoixIcone({
  name,
  valeur,
  onChange,
  couleur,
}: {
  name: string;
  valeur: string;
  onChange: (nom: string) => void;
  /** Couleur de fond de l'icône choisie (aperçu). */
  couleur?: string;
}) {
  const [filtre, setFiltre] = useState("");
  const visibles = useMemo(() => {
    const f = filtre.trim().toLowerCase();
    return f ? NOMS_ICONES.filter((n) => n.toLowerCase().includes(f)) : NOMS_ICONES;
  }, [filtre]);

  return (
    <div>
      <input type="hidden" name={name} value={valeur} />
      <div className="relative mb-2">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          placeholder="Filtrer les icônes (anglais : star, leaf…)"
          aria-label="Filtrer les icônes"
          className="h-9 w-full rounded-full border border-border bg-card pl-8 pr-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div
        role="radiogroup"
        aria-label="Icône"
        className="grid max-h-52 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 overflow-y-auto rounded-xl border border-border p-2"
      >
        {visibles.map((nom) => {
          const actif = nom === valeur;
          return (
            <button
              key={nom}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={nom}
              title={nom}
              onClick={() => onChange(nom)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg transition-colors",
                actif ? "text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              style={actif ? { background: couleur ?? "var(--nuit)" } : undefined}
            >
              <Icone nom={nom} className="h-[18px] w-[18px]" />
            </button>
          );
        })}
        {visibles.length === 0 ? (
          <p className="col-span-full py-4 text-center text-xs text-muted-foreground">Aucune icône ne correspond. Essayez un mot anglais.</p>
        ) : null}
      </div>
    </div>
  );
}
