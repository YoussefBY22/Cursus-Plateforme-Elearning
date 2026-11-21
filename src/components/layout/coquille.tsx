"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, Menu, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { Toasts } from "@/components/ui/toasts";
import { BarreLaterale, type NiveauResume } from "./barre-laterale";
import { Cloche } from "./cloche";
import { MenuCompte } from "./menu-compte";
import type { SectionNav } from "./navigation";
import { Celebrations } from "@/components/gamification/celebrations";
import { Battement } from "./battement";

export function Coquille({
  sections,
  niveau,
  nonLues,
  serie,
  compte,
  theme,
  bandeau,
  children,
}: {
  sections: SectionNav[];
  niveau: NiveauResume;
  nonLues: number;
  serie: number;
  compte: { nom: string; email: string; photo: string | null; role: string };
  theme: string;
  bandeau?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [menuOuvert, setMenuOuvert] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu
      </a>
      <BarreLaterale sections={sections} niveau={niveau} ouverte={menuOuvert} onFermer={() => setMenuOuvert(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            className="-ml-1 rounded-full p-2 hover:bg-muted lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/accueil" className="text-[16px] lg:hidden">
            <Logo compact />
          </Link>

          <form action="/catalogue" className="relative hidden max-w-md flex-1 md:block" role="search">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Rechercher une formation, un parcours, un formateur…"
              aria-label="Rechercher dans le catalogue"
              className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
            />
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {serie > 0 ? (
              <span
                title={`${serie} jour${serie > 1 ? "s" : ""} d'affilée sur Cursus`}
                className="chiffres hidden items-center gap-1 rounded-full bg-or-soft px-3 py-1.5 text-[13px] font-bold sm:inline-flex"
              >
                <Flame className="h-4 w-4 text-[#4f46e5]" aria-hidden />
                {serie} j
              </span>
            ) : null}
            <Cloche nonLuesInitiales={nonLues} />
            <MenuCompte {...compte} theme={theme} />
          </div>
        </header>

        {bandeau}

        <main id="contenu" className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>
      </div>

      <Toasts />
      <Celebrations />
      <Battement />
    </div>
  );
}
