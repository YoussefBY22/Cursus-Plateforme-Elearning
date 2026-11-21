import Link from "next/link";
import { cn } from "@/lib/utils";

/** Onglets en liens (l'état vit dans l'URL : partageable, bouton retour fiable). */
export function Onglets({
  onglets,
  actif,
  className,
}: {
  onglets: { cle: string; libelle: string; href: string; compteur?: number }[];
  actif: string;
  className?: string;
}) {
  return (
    <nav className={cn("-mx-1 mb-6 flex gap-1 overflow-x-auto px-1", className)} aria-label="Sections">
      {onglets.map((o) => {
        const estActif = o.cle === actif;
        return (
          <Link
            key={o.cle}
            href={o.href}
            aria-current={estActif ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              estActif ? "bg-nuit text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {o.libelle}
            {o.compteur !== undefined ? (
              <span
                className={cn(
                  "chiffres rounded-full px-1.5 text-[11px]",
                  estActif ? "bg-white/15" : "bg-muted text-muted-foreground"
                )}
              >
                {o.compteur}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
