import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function EntetePage({
  titre,
  description,
  actions,
  retour,
  className,
}: {
  titre: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  retour?: { href: string; libelle: string };
  className?: string;
}) {
  return (
    <header className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 max-w-3xl">
        {retour ? (
          <Link
            href={retour.href}
            className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {retour.libelle}
          </Link>
        ) : null}
        <h1 className="titre-page text-[28px] sm:text-[34px]">{titre}</h1>
        {description ? <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
