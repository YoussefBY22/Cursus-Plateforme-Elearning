"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Icone } from "@/components/icones";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { SectionNav } from "./navigation";

export type NiveauResume = { niveau: number; titre: string; avancement: number; xp: number; xpSuivant: number };

export function BarreLaterale({
  sections,
  niveau,
  ouverte,
  onFermer,
}: {
  sections: SectionNav[];
  niveau: NiveauResume;
  ouverte: boolean;
  onFermer: () => void;
}) {
  const chemin = usePathname();
  const toutesLesEntrees = sections.flatMap((s) => s.entrees);
  // L'entrée active est la plus longue qui préfixe le chemin : /admin/badges
  // n'allume pas aussi /admin.
  const active = toutesLesEntrees
    .filter((e) => chemin === e.href || chemin.startsWith(`${e.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      <div
        aria-hidden
        onClick={onFermer}
        className={cn(
          "fixed inset-0 z-40 bg-nuit/60 backdrop-blur-[2px] transition-opacity lg:hidden",
          ouverte ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-[var(--ease-sortie)]",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          ouverte ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-between px-6 pb-5 pt-6">
          <Link href="/accueil" className="text-[19px]" onClick={onFermer}>
            <Logo clair />
          </Link>
          <button
            type="button"
            onClick={onFermer}
            className="rounded-full p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
          {sections.map((section) => (
            <div key={section.titre}>
              <p className="px-3 pb-1.5 text-[12px] font-semibold text-sidebar-muted">{section.titre}</p>
              <ul className="space-y-0.5">
                {section.entrees.map((e) => {
                  const estActive = e.href === active;
                  return (
                    <li key={e.href}>
                      <Link
                        href={e.href}
                        onClick={onFermer}
                        aria-current={estActive ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors",
                          estActive ? "bg-white/[0.09] text-white" : "hover:bg-white/[0.05] hover:text-white"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#4f46e5] transition-transform duration-300",
                            estActive ? "scale-y-100" : "scale-y-0"
                          )}
                        />
                        <Icone
                          nom={e.icone}
                          className={cn("h-[18px] w-[18px] shrink-0", estActive ? "text-white" : "text-sidebar-muted group-hover:text-white")}
                        />
                        <span className="flex-1 truncate">{e.libelle}</span>
                        {e.compteur ? (
                          <span className="chiffres rounded-full bg-[#4f46e5] px-1.5 py-px text-[11px] font-bold text-white">
                            {e.compteur}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <Link
          href="/competences"
          onClick={onFermer}
          className="mx-3 mb-4 block rounded-2xl bg-white/[0.06] p-4 transition-colors hover:bg-white/[0.1]"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-white">
              Niveau <span className="chiffres text-[17px] font-extrabold">{niveau.niveau}</span>
            </span>
            <span className="text-[12px] text-sidebar-muted">{niveau.titre}</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#4f46e5] transition-[width] duration-700"
              style={{ width: `${Math.round(niveau.avancement * 100)}%` }}
            />
          </div>
          <p className="chiffres mt-1.5 text-[11px] text-sidebar-muted">
            {niveau.xp.toLocaleString("fr-FR")} / {niveau.xpSuivant.toLocaleString("fr-FR")} XP
          </p>
        </Link>
      </aside>
    </>
  );
}
