"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { toast } from "@/components/ui/toasts";
import { BadgeVisuel, type ApparenceBadge } from "./badge-visuel";

type BadgeCelebre = ApparenceBadge & {
  id: string;
  nom: string;
  description: string;
  xpBonus: number;
};

type Evenement =
  | { genre: "badge"; badge: BadgeCelebre }
  | { genre: "niveau"; niveau: number; titre: string; id: string };

const RARETE: Record<string, string> = {
  COMMUN: "Commun",
  RARE: "Rare",
  EPIQUE: "Épique",
  LEGENDAIRE: "Légendaire",
  MYTHIQUE: "Mythique",
};

/**
 * Célébrations : à l'obtention d'un badge, un toast discret en bas à droite
 * ET une fenêtre de célébration — une à la fois, jamais en rafale, fermable
 * d'un clic ou d'Échap. Le mouvement est fort mais court, et disparaît si
 * l'utilisateur a demandé moins d'animations.
 */
export function Celebrations() {
  const [file, setFile] = React.useState<Evenement[]>([]);
  const router = useRouter();
  const enCours = React.useRef(false);

  const verifier = React.useCallback(async () => {
    if (enCours.current) return;
    enCours.current = true;
    try {
      const r = await fetch("/api/celebrations", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { badges: BadgeCelebre[]; niveaux: { id: string; niveau: number; titre: string }[] };
      const nouveaux: Evenement[] = [
        ...d.niveaux.map((n) => ({ genre: "niveau" as const, ...n })),
        ...d.badges.map((b) => ({ genre: "badge" as const, badge: b })),
      ];
      if (!nouveaux.length) return;
      for (const e of nouveaux) {
        if (e.genre === "badge") {
          toast({
            titre: `Badge débloqué : ${e.badge.nom}`,
            description: e.badge.description,
            visuel: <BadgeVisuel apparence={e.badge} taille={40} anime={false} />,
            duree: 7000,
          });
        }
      }
      setFile((f) => [...f, ...nouveaux]);
      // Marqué « célébré » dès la réception : un autre onglet ne le rejouera pas.
      await fetch("/api/celebrations", {
        method: "POST",
        body: JSON.stringify({
          badges: d.badges.map((b) => b.id),
          niveaux: d.niveaux.map((n) => n.id),
        }),
      });
      router.refresh();
    } catch {
      // Silencieux : la célébration n'est jamais bloquante.
    } finally {
      enCours.current = false;
    }
  }, [router]);

  React.useEffect(() => {
    // Hors du corps de l'effet : `verifier` pose de l'état, et le faire
    // pendant l'effet déclencherait un rendu en cascade.
    const premier = setTimeout(verifier, 0);
    const surEvenement = () => verifier();
    window.addEventListener("cursus:verifier", surEvenement);
    return () => {
      clearTimeout(premier);
      window.removeEventListener("cursus:verifier", surEvenement);
    };
  }, [verifier]);

  const courant = file[0];
  const suivant = () => setFile((f) => f.slice(1));

  React.useEffect(() => {
    if (!courant) return;
    const echap = (e: KeyboardEvent) => e.key === "Escape" && suivant();
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [courant]);

  if (!courant) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-titre"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    >
      <div className="anim-apparition absolute inset-0 bg-nuit/70 backdrop-blur-sm" onClick={suivant} aria-hidden />
      <div className="anim-echelle relative w-full max-w-sm overflow-hidden rounded-[28px] bg-nuit px-7 pb-7 pt-10 text-center text-white shadow-haut">
        <Confettis />
        <div className="relative mx-auto mb-6 flex h-40 w-40 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-white/25 animate-[halo_1.8s_ease-out_infinite]" />
          <span className="absolute inset-0 rounded-full border-2 border-[#4f46e5]/50 animate-[halo_1.8s_ease-out_0.6s_infinite]" />
          <span className="animate-[entree-badge_900ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
            {courant.genre === "badge" ? (
              <BadgeVisuel apparence={courant.badge} taille={128} />
            ) : (
              <span className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#4f46e5] shadow-[0_0_40px_#E3071988]">
                <TrendingUp className="h-7 w-7" />
                <span className="chiffres text-5xl font-black leading-none">{courant.niveau}</span>
              </span>
            )}
          </span>
        </div>

        {courant.genre === "badge" ? (
          <>
            <p className="text-[13px] font-semibold text-white/60">
              Badge débloqué · {RARETE[courant.badge.rarete] ?? courant.badge.rarete}
            </p>
            <h2 id="celebration-titre" className="mt-1 text-2xl font-extrabold tracking-tight">
              {courant.badge.nom}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{courant.badge.description}</p>
            {courant.badge.xpBonus > 0 ? (
              <p className="chiffres mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                +{courant.badge.xpBonus} XP
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-white/60">Nouveau niveau</p>
            <h2 id="celebration-titre" className="mt-1 text-2xl font-extrabold tracking-tight">
              Niveau {courant.niveau} — {courant.titre}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Chaque formation terminée, chaque quiz et chaque heure d&apos;apprentissage vous ont mené ici.
            </p>
          </>
        )}

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Bouton onClick={suivant} autoFocus>
            Continuer
          </Bouton>
          <Link
            href={courant.genre === "badge" ? "/badges" : "/competences"}
            onClick={suivant}
            className="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            {courant.genre === "badge" ? "Voir ma collection" : "Voir ma progression"}
          </Link>
        </div>
        {file.length > 1 ? (
          <p className="mt-4 text-xs text-white/50">Encore {file.length - 1} à découvrir</p>
        ) : null}
      </div>
    </div>
  );
}

function Confettis() {
  const couleurs = ["#4f46e5", "#ffffff", "#f2c230", "#4fb3c0", "#ff8a95"];
  const morceaux = React.useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => {
        const angle = (i / 36) * Math.PI * 2;
        const distance = 120 + ((i * 37) % 90);
        return {
          x: `${Math.cos(angle) * distance}px`,
          y: `${Math.sin(angle) * distance + 60}px`,
          r: `${(i * 47) % 360}deg`,
          c: couleurs[i % couleurs.length],
          d: (i % 6) * 40,
          w: i % 3 === 0 ? 8 : 5,
        };
      }),
    []
  );
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[110px]">
      {morceaux.map((m, i) => (
        <span
          key={i}
          className="absolute block rounded-[2px]"
          style={
            {
              width: m.w,
              height: m.w * 1.6,
              background: m.c,
              "--x": m.x,
              "--y": m.y,
              "--r": m.r,
              animation: `confetti 1.6s cubic-bezier(0.16,1,0.3,1) ${m.d}ms both`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
