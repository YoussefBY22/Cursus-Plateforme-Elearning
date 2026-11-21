import { cn } from "@/lib/utils";

/**
 * Logo de Cursus — composant UNIQUE : remplacer ce fichier par un autre logo
 * (SVG ou <img>) suffit à le changer partout.
 *
 * Le symbole est un escalier : une progression qui monte marche par marche,
 * comme le niveau d'un apprenant. Le mot-symbole reste en texte, pour suivre
 * le thème clair ou sombre.
 */
export function Logo({
  className,
  clair = false,
  compact = false,
}: {
  className?: string;
  /** Sur fond sombre (barre latérale, carte joueur). */
  clair?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-[0.5em] select-none leading-none", className)}
      aria-label="Cursus"
      role="img"
    >
      <svg aria-hidden viewBox="0 0 32 32" className="h-[1.6em] w-[1.6em] shrink-0">
        <rect width="32" height="32" rx="9" fill="#4f46e5" />
        <path
          d="M8 22.5h5v-5h5v-5h6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="12.5" r="2.4" fill="#ffffff" />
      </svg>
      {compact ? null : (
        <span
          aria-hidden
          className={cn("text-[1.2em] font-extrabold tracking-[-0.03em]", clair ? "text-white" : "text-foreground")}
        >
          Cursus
        </span>
      )}
    </span>
  );
}
