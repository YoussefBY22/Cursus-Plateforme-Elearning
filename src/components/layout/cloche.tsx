"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Bell, CheckCheck, ClipboardCheck, Heart, Info, MessageCircle, ScrollText, Sparkles, TrendingUp } from "lucide-react";
import { cn, depuis } from "@/lib/utils";

type NotificationCourte = {
  id: string;
  type: string;
  titre: string;
  message: string;
  lien: string | null;
  lue: boolean;
  creeLe: string;
};

const ICONES_TYPE: Record<string, React.ComponentType<{ className?: string }>> = {
  BADGE: Award,
  NIVEAU: TrendingUp,
  CERTIFICAT: ScrollText,
  VALIDATION: ClipboardCheck,
  COMMENTAIRE: MessageCircle,
  LIKE: Heart,
  AUTO_EVALUATION: Sparkles,
};

export function Cloche({ nonLuesInitiales }: { nonLuesInitiales: number }) {
  const [ouvert, setOuvert] = React.useState(false);
  const [nonLues, setNonLues] = React.useState(nonLuesInitiales);
  const [liste, setListe] = React.useState<NotificationCourte[] | null>(null);
  const [secoue, setSecoue] = React.useState(false);
  const panneau = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Le serveur fait foi quand il renvoie un nouveau compte : on se recale
  // pendant le rendu, pas dans un effet, pour éviter un rendu en cascade.
  const [compteServeur, setCompteServeur] = React.useState(nonLuesInitiales);
  if (compteServeur !== nonLuesInitiales) {
    setCompteServeur(nonLuesInitiales);
    setNonLues(nonLuesInitiales);
  }

  const charger = React.useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { nonLues: number; notifications: NotificationCourte[] };
      setListe(d.notifications);
      setNonLues((avant) => {
        if (d.nonLues > avant) {
          setSecoue(true);
          setTimeout(() => setSecoue(false), 900);
        }
        return d.nonLues;
      });
    } catch {
      // Réseau coupé : la cloche garde son dernier état.
    }
  }, []);

  React.useEffect(() => {
    const t = setInterval(charger, 45_000);
    const surEvenement = () => charger();
    window.addEventListener("cursus:verifier", surEvenement);
    return () => {
      clearInterval(t);
      window.removeEventListener("cursus:verifier", surEvenement);
    };
  }, [charger]);

  React.useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => {
      if (panneau.current && !panneau.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  async function toutLire() {
    await fetch("/api/notifications", { method: "POST", body: JSON.stringify({ tout: true }) });
    setNonLues(0);
    setListe((l) => l?.map((n) => ({ ...n, lue: true })) ?? null);
    router.refresh();
  }

  async function ouvrir(n: NotificationCourte) {
    if (!n.lue) {
      fetch("/api/notifications", { method: "POST", body: JSON.stringify({ id: n.id }) });
      setNonLues((v) => Math.max(0, v - 1));
    }
    setOuvert(false);
    if (n.lien) router.push(n.lien);
  }

  return (
    <div className="relative" ref={panneau}>
      <button
        type="button"
        onClick={() => {
          setOuvert((o) => !o);
          if (!ouvert) charger();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
        aria-label={`Notifications${nonLues ? ` (${nonLues} non lues)` : ""}`}
        aria-expanded={ouvert}
      >
        <Bell className={cn("h-[18px] w-[18px] origin-top", secoue && "animate-[rebond-cloche_0.9s_ease-in-out]")} />
        {nonLues > 0 ? (
          <span className="chiffres absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {nonLues > 99 ? "99+" : nonLues}
          </span>
        ) : null}
      </button>

      {ouvert ? (
        <div className="anim-echelle absolute right-0 top-12 z-50 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-haut">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            {nonLues > 0 ? (
              <button
                type="button"
                onClick={toutLire}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {liste === null ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="squelette h-12" />
                ))}
              </div>
            ) : liste.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-semibold">Rien de neuf pour l&apos;instant</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Badges, validations et réponses à vos commentaires apparaîtront ici.
                </p>
              </div>
            ) : (
              <ul>
                {liste.map((n) => {
                  const I = ICONES_TYPE[n.type] ?? Info;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => ouvrir(n)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/70",
                          !n.lue && "bg-primary-soft/40"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            n.type === "BADGE" ? "bg-or-soft text-or" : "bg-muted text-foreground"
                          )}
                        >
                          <I className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold leading-snug">{n.titre}</span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>
                          <span className="mt-1 block text-[11px] text-muted-foreground/80">{depuis(n.creeLe)}</span>
                        </span>
                        {!n.lue ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lue" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOuvert(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Voir toutes les notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
