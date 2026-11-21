"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { changerTheme, deconnexion } from "@/server/actions/theme";
import { cn } from "@/lib/utils";

export function MenuCompte({
  nom,
  email,
  photo,
  role,
  theme,
}: {
  nom: string;
  email: string;
  photo: string | null;
  role: string;
  theme: string;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const [themeCourant, setThemeCourant] = React.useState(theme);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOuvert(false);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  function appliquerTheme(t: string) {
    setThemeCourant(t);
    const racine = document.documentElement;
    racine.setAttribute("data-theme-transition", "off");
    if (t === "systeme") racine.removeAttribute("data-theme");
    else racine.setAttribute("data-theme", t);
    requestAnimationFrame(() => racine.removeAttribute("data-theme-transition"));
    changerTheme(t).then(() => router.refresh());
  }

  const themes = [
    { cle: "clair", libelle: "Clair", I: Sun },
    { cle: "sombre", libelle: "Sombre", I: Moon },
    { cle: "systeme", libelle: "Auto", I: Monitor },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="flex items-center gap-2.5 rounded-full p-0.5 pr-0.5 hover:bg-muted sm:pr-3"
        aria-expanded={ouvert}
        aria-label="Mon compte"
      >
        <Avatar nom={nom} photo={photo} taille="sm" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[140px] truncate text-[13px] font-bold">{nom}</span>
          <span className="block text-[11px] text-muted-foreground">{role}</span>
        </span>
      </button>
      {ouvert ? (
        <div className="anim-echelle absolute right-0 top-12 z-50 w-64 origin-top-right rounded-2xl border border-border bg-card p-1.5 shadow-haut">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-bold">{nom}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link href="/profil" onClick={() => setOuvert(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">
            <UserRound className="h-4 w-4 text-muted-foreground" /> Mon profil
          </Link>
          <Link href="/notifications" onClick={() => setOuvert(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">
            <Bell className="h-4 w-4 text-muted-foreground" /> Notifications
          </Link>
          <div className="my-1 h-px bg-border" />
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">Apparence</p>
          <div className="mx-1.5 mb-1.5 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {themes.map(({ cle, libelle, I }) => (
              <button
                key={cle}
                type="button"
                onClick={() => appliquerTheme(cle)}
                aria-pressed={themeCourant === cle}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors",
                  themeCourant === cle ? "bg-card text-foreground shadow-doux" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <I className="h-4 w-4" />
                {libelle}
              </button>
            ))}
          </div>
          <div className="my-1 h-px bg-border" />
          <form action={deconnexion}>
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
