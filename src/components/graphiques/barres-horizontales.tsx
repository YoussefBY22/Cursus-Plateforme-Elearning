import { cn } from "@/lib/utils";
import { couleurLisible } from "./couleurs";

export type LigneBarre = {
  cle: string;
  libelle: string;
  valeur: number;
  /** Couleur de marque (hex) ; rendue lisible sur les deux thèmes. */
  couleur?: string | null;
  /** Texte secondaire à droite de la valeur (« 4,2 ★ »). */
  complement?: string;
};

/**
 * Barres horizontales en SVG fait main : un libellé, une barre colorée, la
 * valeur. Les libellés ne sont jamais tournés ; à 375 px, ils passent au-dessus
 * de la barre. Chaque barre porte sa couleur de domaine : pas de légende.
 */
export function BarresHorizontales({
  donnees,
  unite,
  titre,
  className,
  formater = (v) => v.toLocaleString("fr-FR"),
}: {
  donnees: LigneBarre[];
  unite: string;
  titre: string;
  className?: string;
  formater?: (v: number) => string;
}) {
  const max = Math.max(1, ...donnees.map((d) => d.valeur));
  return (
    <figure className={cn("w-full", className)}>
      <figcaption className="sr-only">
        {titre} ({unite}) — {donnees.map((d) => `${d.libelle} : ${formater(d.valeur)}`).join(", ")}
      </figcaption>
      <ul className="grid gap-3" aria-hidden>
        {donnees.map((d) => {
          const couleur = couleurLisible(d.couleur);
          const part = (d.valeur / max) * 100;
          return (
            <li key={d.cle} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
              <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleur }} />
                <span className="truncate" title={d.libelle}>
                  {d.libelle}
                </span>
              </span>
              <svg
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                className="order-3 col-span-2 h-2.5 w-full overflow-hidden rounded-full sm:order-none sm:col-span-1"
              >
                <rect x="0" y="0" width="100" height="10" rx="0" fill="var(--muted)" />
                <rect x="0" y="0" width={Math.max(part, d.valeur > 0 ? 1.2 : 0)} height="10" fill={couleur}>
                  <title>{`${d.libelle} : ${formater(d.valeur)} ${unite}`}</title>
                </rect>
              </svg>
              <span className="chiffres text-right text-[13px] font-bold">
                {formater(d.valeur)}
                {d.complement ? <span className="ml-1.5 font-medium text-muted-foreground">{d.complement}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
