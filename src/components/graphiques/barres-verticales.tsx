import { cn } from "@/lib/utils";

export type PointBarre = { cle: string; libelle: string; libelleLong?: string; valeur: number };

/** Graduation « ronde » au-dessus du maximum (1, 2, 5 × 10^n). */
function plafondRond(max: number): number {
  if (max <= 0) return 4;
  const puissance = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (max <= m * puissance) return m * puissance;
  return 10 * puissance;
}

/**
 * Histogramme vertical en SVG fait main.
 *
 * Les barres et le quadrillage sont dans un SVG qui s'étire à la largeur ;
 * les libellés restent en HTML pour garder une taille de texte fixe à
 * 375 px comme sur grand écran. La dernière barre (période en cours) est
 * pleine, les précédentes adoucies : l'œil va d'abord au présent.
 */
export function BarresVerticales({
  donnees,
  unite,
  couleur = "var(--primary)",
  hauteur = 176,
  className,
  titre,
}: {
  donnees: PointBarre[];
  /** Unité pour la lecture vocale (« formations terminées »). */
  unite: string;
  couleur?: string;
  hauteur?: number;
  className?: string;
  titre: string;
}) {
  const max = plafondRond(Math.max(0, ...donnees.map((d) => d.valeur)));
  const graduations = [0, 0.5, 1];
  const largeurSlot = 100 / Math.max(1, donnees.length);
  const resume = donnees.map((d) => `${d.libelleLong ?? d.libelle} : ${d.valeur}`).join(", ");

  return (
    <figure className={cn("w-full", className)}>
      <figcaption className="sr-only">
        {titre} ({unite}) — {resume}
      </figcaption>
      <div className="flex gap-2 pt-5" aria-hidden>
        {/* Axe des valeurs */}
        <div className="relative w-7 shrink-0 text-right text-[11px] text-muted-foreground" style={{ height: hauteur }}>
          {graduations.map((g) => (
            <span key={g} className="chiffres absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${(1 - g) * 100}%` }}>
              {Math.round(max * g).toLocaleString("fr-FR")}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: hauteur }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              {graduations.map((g) => (
                <line
                  key={g}
                  x1="0"
                  x2="100"
                  y1={(1 - g) * 100}
                  y2={(1 - g) * 100}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray={g === 0 ? undefined : "3 4"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {donnees.map((d, i) => {
                const h = (d.valeur / max) * 100;
                const dernier = i === donnees.length - 1;
                return (
                  <rect
                    key={d.cle}
                    x={i * largeurSlot + largeurSlot * 0.22}
                    width={largeurSlot * 0.56}
                    y={100 - h}
                    height={Math.max(h, d.valeur > 0 ? 0.8 : 0)}
                    fill={dernier ? couleur : `color-mix(in oklab, ${couleur} 50%, var(--card))`}
                  >
                    <title>{`${d.libelleLong ?? d.libelle} : ${d.valeur} ${unite}`}</title>
                  </rect>
                );
              })}
            </svg>
            {/* Valeurs au-dessus des barres */}
            <div className="absolute inset-0 flex">
              {donnees.map((d) => (
                <div key={d.cle} className="relative flex-1">
                  <span
                    className="chiffres absolute inset-x-0 text-center text-xs font-bold text-foreground"
                    style={{ bottom: `calc(${(d.valeur / max) * 100}% + 4px)` }}
                  >
                    {d.valeur.toLocaleString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex">
            {donnees.map((d, i) => (
              <span
                key={d.cle}
                className={cn(
                  "flex-1 truncate text-center text-[11px] sm:text-xs",
                  i === donnees.length - 1 ? "font-bold text-foreground" : "text-muted-foreground"
                )}
              >
                {d.libelle}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
