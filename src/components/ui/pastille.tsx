import * as React from "react";
import { cn } from "@/lib/utils";

type Ton = "neutre" | "primaire" | "nuit" | "succes" | "alerte" | "danger" | "or" | "contour";

const tons: Record<Ton, string> = {
  neutre: "bg-muted text-muted-foreground",
  primaire: "bg-primary-soft text-primary",
  nuit: "bg-nuit text-white",
  succes: "bg-success-soft text-success",
  alerte: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  or: "bg-or-soft text-[color-mix(in_srgb,var(--or)_70%,var(--foreground))]",
  contour: "border border-border text-foreground",
};

export function Pastille({
  ton = "neutre",
  className,
  style,
  couleur,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { ton?: Ton; couleur?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        couleur ? "" : tons[ton],
        className
      )}
      style={
        couleur
          ? { backgroundColor: `color-mix(in srgb, ${couleur} 14%, transparent)`, color: `color-mix(in srgb, ${couleur} 82%, var(--foreground))`, ...style }
          : style
      }
      {...props}
    />
  );
}
