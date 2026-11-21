import { cn } from "@/lib/utils";

export function BarreProgression({
  valeur,
  className,
  couleur = "var(--primary)",
  hauteur = "h-2",
  libelle,
}: {
  /** 0–1 */
  valeur: number;
  className?: string;
  couleur?: string;
  hauteur?: string;
  libelle?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, valeur)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={libelle}
      className={cn("w-full overflow-hidden rounded-full bg-muted", hauteur, className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-sortie)]"
        style={{ width: `${pct}%`, background: couleur }}
      />
    </div>
  );
}

/** Anneau de progression (formations en cours, complétude du profil). */
export function Anneau({
  valeur,
  taille = 44,
  epaisseur = 4,
  couleur = "var(--primary)",
  children,
}: {
  valeur: number;
  taille?: number;
  epaisseur?: number;
  couleur?: string;
  children?: React.ReactNode;
}) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, valeur));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} className="-rotate-90" aria-hidden>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={epaisseur} />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke={couleur}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      {children ? <span className="absolute inset-0 flex items-center justify-center">{children}</span> : null}
    </span>
  );
}
