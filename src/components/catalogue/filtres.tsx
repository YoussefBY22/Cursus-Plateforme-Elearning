"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Icone } from "@/components/icones";
import { Champ, Selecteur } from "@/components/ui/champ";
import { cn } from "@/lib/utils";
import { DUREES, ETATS_AVANCEMENT, NIVEAUX, TRIS } from "@/services/catalogue";

/**
 * Filtres du catalogue — tout l'état vit dans l'URL : la page reste rendue
 * côté serveur, et un filtre se partage ou se met en favori tel quel.
 */

type Domaine = { id: string; nom: string; couleur: string; icone: string; nb: number };

export function FiltresCatalogue({ domaines, total }: { domaines: Domaine[]; total: number }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [recherche, setRecherche] = React.useState(params.get("q") ?? "");
  const [enAttente, setEnAttente] = React.useState(false);

  // L'URL fait foi : un retour arrière du navigateur remet le champ en phase.
  const qUrl = params.get("q") ?? "";
  React.useEffect(() => {
    setRecherche(qUrl);
  }, [qUrl]);

  const appliquer = React.useCallback(
    (modifs: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [cle, valeur] of Object.entries(modifs)) {
        if (valeur) p.set(cle, valeur);
        else p.delete(cle);
      }
      const suite = p.toString();
      router.replace(suite ? `${chemin}?${suite}` : chemin, { scroll: false });
    },
    [chemin, params, router]
  );

  // Recherche différée : on ne requête pas à chaque frappe.
  React.useEffect(() => {
    if (recherche === qUrl) return;
    setEnAttente(true);
    const t = setTimeout(() => {
      appliquer({ q: recherche.trim() || null });
      setEnAttente(false);
    }, 350);
    return () => clearTimeout(t);
  }, [recherche, qUrl, appliquer]);

  const domaineActif = params.get("domaine");
  const actifs = ["niveau", "duree", "etat", "domaine", "q"].filter((c) => params.get(c));

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Champ
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={`Chercher parmi ${total} ${total === 1 ? "formation" : "formations"}…`}
          aria-label="Chercher une formation"
          className="pl-10"
        />
        {enAttente ? (
          <span className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-primary" aria-hidden />
        ) : null}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Puce actif={!domaineActif} onClick={() => appliquer({ domaine: null })}>
          Tous les domaines
        </Puce>
        {domaines
          .filter((d) => d.nb > 0)
          .map((d) => (
            <Puce
              key={d.id}
              actif={domaineActif === d.id}
              couleur={d.couleur}
              onClick={() => appliquer({ domaine: domaineActif === d.id ? null : d.id })}
            >
              <Icone nom={d.icone} className="h-3.5 w-3.5" />
              {d.nom}
              <span className="opacity-60">{d.nb}</span>
            </Puce>
          ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Selecteur
          aria-label="Niveau"
          value={params.get("niveau") ?? ""}
          onChange={(e) => appliquer({ niveau: e.target.value || null })}
          className="h-10 w-auto min-w-36 text-[13px]"
        >
          <option value="">Tous les niveaux</option>
          {Object.entries(NIVEAUX).map(([code, libelle]) => (
            <option key={code} value={code}>
              {libelle}
            </option>
          ))}
        </Selecteur>

        <Selecteur
          aria-label="Durée"
          value={params.get("duree") ?? ""}
          onChange={(e) => appliquer({ duree: e.target.value || null })}
          className="h-10 w-auto min-w-36 text-[13px]"
        >
          <option value="">Toutes les durées</option>
          {Object.entries(DUREES).map(([code, d]) => (
            <option key={code} value={code}>
              {d.libelle}
            </option>
          ))}
        </Selecteur>

        <Selecteur
          aria-label="Avancement"
          value={params.get("etat") ?? ""}
          onChange={(e) => appliquer({ etat: e.target.value || null })}
          className="h-10 w-auto min-w-40 text-[13px]"
        >
          <option value="">Où j'en suis : tout</option>
          {Object.entries(ETATS_AVANCEMENT).map(([code, libelle]) => (
            <option key={code} value={code}>
              {libelle}
            </option>
          ))}
        </Selecteur>

        <Selecteur
          aria-label="Trier"
          value={params.get("tri") ?? "pertinence"}
          onChange={(e) => appliquer({ tri: e.target.value === "pertinence" ? null : e.target.value })}
          className="h-10 w-auto min-w-44 text-[13px] sm:ml-auto"
        >
          {Object.entries(TRIS).map(([code, libelle]) => (
            <option key={code} value={code}>
              {libelle}
            </option>
          ))}
        </Selecteur>

        {actifs.length ? (
          <button
            type="button"
            onClick={() => router.replace(chemin, { scroll: false })}
            className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Tout afficher
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Puce({
  actif,
  couleur,
  onClick,
  children,
}: {
  actif: boolean;
  couleur?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
        actif ? "border-transparent text-white" : "border-border bg-card text-foreground hover:bg-muted"
      )}
      style={actif ? { background: couleur ?? "var(--nuit)" } : undefined}
    >
      {children}
    </button>
  );
}
