import { cn, initiales } from "@/lib/utils";

const PALETTE = ["#0f1226", "#4f46e5", "#1e7a86", "#c77c00", "#5b3a8c", "#12a150", "#181c3a"];

function hachage(texte: string): number {
  let h = 0;
  for (let i = 0; i < texte.length; i++) h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  return h;
}

const TAILLES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl",
  xxl: "h-32 w-32 text-4xl",
};

/** Photo si elle existe, sinon initiales sur une couleur stable dérivée du nom. */
export function Avatar({
  nom,
  photo,
  taille = "md",
  className,
}: {
  nom: string;
  photo?: string | null;
  taille?: keyof typeof TAILLES;
  className?: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-card", TAILLES[taille], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-card",
        TAILLES[taille],
        className
      )}
      style={{ backgroundColor: PALETTE[hachage(nom) % PALETTE.length] }}
    >
      {initiales(nom)}
    </span>
  );
}
