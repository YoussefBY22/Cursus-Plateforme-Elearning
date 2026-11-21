import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variante = "primaire" | "nuit" | "contour" | "fantome" | "danger" | "succes";
type Taille = "sm" | "md" | "lg" | "icone";

const variantes: Record<Variante, string> = {
  primaire:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_6px_16px_-8px_var(--primary)] active:translate-y-px",
  nuit: "bg-nuit text-white hover:bg-nuit-3 active:translate-y-px",
  contour: "border border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted",
  fantome: "text-foreground hover:bg-muted",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:bg-danger hover:text-white",
  succes: "bg-success text-white hover:brightness-110 active:translate-y-px",
};

const tailles: Record<Taille, string> = {
  sm: "h-8 px-3.5 text-[13px] gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-[15px] gap-2.5",
  icone: "h-10 w-10 gap-0",
};

export function classesBouton(variante: Variante = "primaire", taille: Taille = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap",
    "transition-[background-color,border-color,color,transform,box-shadow] duration-200",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    variantes[variante],
    tailles[taille],
    className
  );
}

export interface BoutonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  taille?: Taille;
}

export function Bouton({ className, variante, taille, type = "button", ...props }: BoutonProps) {
  return <button type={type} className={classesBouton(variante, taille, className)} {...props} />;
}

export function LienBouton({
  className,
  variante,
  taille,
  ...props
}: React.ComponentProps<typeof Link> & { variante?: Variante; taille?: Taille }) {
  return <Link className={classesBouton(variante, taille, className)} {...props} />;
}
