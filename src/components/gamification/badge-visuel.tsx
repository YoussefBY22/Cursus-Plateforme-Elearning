import * as React from "react";
import { Lock } from "lucide-react";
import { Icone } from "@/components/icones";
import { cn } from "@/lib/utils";

/**
 * Le badge dessiné : forme × matière × couleur × effet de rareté.
 * Rendu côté serveur comme côté client (aucun état), en SVG + CSS : pas
 * d'image à produire, et le super admin voit exactement ce qu'il compose.
 */

export type ApparenceBadge = {
  forme: string;
  matiere: string;
  rarete: string;
  effet: string;
  couleur: string;
  icone: string;
};

const MATIERES: Record<string, string[]> = {
  BRONZE: ["#f6c08f", "#c97a3d", "#7a3d17"],
  ARGENT: ["#ffffff", "#c3ccd5", "#6f7c8a"],
  OR: ["#fff3b0", "#f2c230", "#9c6a06"],
  PLATINE: ["#ffffff", "#dbe7ee", "#86a3b4"],
  DIAMANT: ["#e8fdff", "#8be3ff", "#7b83ff", "#d59bff"],
};

function lueur(rarete: string, c: string): string {
  switch (rarete) {
    case "RARE":
      return `drop-shadow(0 0 5px ${c}88)`;
    case "EPIQUE":
      return `drop-shadow(0 0 9px ${c}aa)`;
    case "LEGENDAIRE":
      return `drop-shadow(0 0 13px ${c}cc) drop-shadow(0 0 3px #ffffff88)`;
    case "MYTHIQUE":
      return "drop-shadow(0 0 15px #b98cff) drop-shadow(0 0 5px #7ff3ff)";
    default:
      return "none";
  }
}

function melanger(hex: string, cible: string, t: number): string {
  const lire = (h: string) => {
    const v = h.replace("#", "");
    const n = v.length === 3 ? v.split("").map((x) => x + x).join("") : v.padEnd(6, "0");
    return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) || 0);
  };
  const a = lire(hex);
  const b = lire(cible);
  return `#${a.map((x, i) => Math.round(x + (b[i] - x) * t).toString(16).padStart(2, "0")).join("")}`;
}

function etoile(branches: number, rExt: number, rInt: number): string {
  const pts: string[] = [];
  for (let i = 0; i < branches * 2; i++) {
    const r = i % 2 === 0 ? rExt : rInt;
    const a = (Math.PI * i) / branches - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/** Contour de chaque forme, sur un repère 100 × 100. */
function contour(forme: string, echelle = 1): React.ReactElement {
  const t = `translate(50 50) scale(${echelle}) translate(-50 -50)`;
  switch (forme) {
    case "CARRE":
      return <rect x="8" y="8" width="84" height="84" rx="20" transform={t} />;
    case "HEXAGONE":
      return <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" strokeLinejoin="round" transform={t} />;
    case "BOUCLIER":
      return <path d="M50 4 L88 16 V46 C88 72 70 88 50 96 C30 88 12 72 12 46 V16 Z" transform={t} />;
    case "ETOILE":
      return <polygon points={etoile(12, 47, 40)} transform={t} />;
    case "DIAMANT":
      return <polygon points="50,3 97,50 50,97 3,50" transform={t} />;
    default:
      return <circle cx="50" cy="50" r="46" transform={t} />;
  }
}

const CLIP: Record<string, string> = {
  ROND: "circle(46% at 50% 50%)",
  CARRE: "inset(8% round 20%)",
  HEXAGONE: "polygon(50% 4%, 90% 27%, 90% 73%, 50% 96%, 10% 73%, 10% 27%)",
  BOUCLIER: "polygon(50% 4%, 88% 16%, 88% 50%, 75% 78%, 50% 96%, 25% 78%, 12% 50%, 12% 16%)",
  ETOILE: "circle(44% at 50% 50%)",
  DIAMANT: "polygon(50% 3%, 97% 50%, 50% 97%, 3% 50%)",
};

export function BadgeVisuel({
  apparence,
  taille = 72,
  verrouille = false,
  anime = true,
  className,
}: {
  apparence: ApparenceBadge;
  taille?: number;
  verrouille?: boolean;
  anime?: boolean;
  className?: string;
}) {
  const uid = React.useId().replace(/:/g, "");
  const metal = MATIERES[apparence.matiere] ?? MATIERES.BRONZE;
  const effet = verrouille || !anime ? "AUCUN" : apparence.effet;
  const c = apparence.couleur || "#0f1226";

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={
        {
          width: taille,
          height: taille,
          filter: verrouille ? "grayscale(1)" : lueur(apparence.rarete, c),
          opacity: verrouille ? 0.42 : 1,
        } as React.CSSProperties
      }
      aria-hidden
    >
      {effet === "FLAMME" ? <Flammes /> : null}
      {effet === "COSMOS" ? <Cosmos /> : null}
      {effet === "NATURE" ? <Feuilles /> : null}

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`m-${uid}`} x1="0" y1="0" x2="1" y2="1">
            {metal.map((s, i) => (
              <stop key={i} offset={`${(i / (metal.length - 1)) * 100}%`} stopColor={s} />
            ))}
          </linearGradient>
          <radialGradient id={`c-${uid}`} cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor={melanger(c, "#ffffff", 0.45)} />
            <stop offset="55%" stopColor={c} />
            <stop offset="100%" stopColor={melanger(c, "#000000", 0.3)} />
          </radialGradient>
        </defs>
        <g fill={`url(#m-${uid})`}>{contour(apparence.forme)}</g>
        <g fill={`url(#c-${uid})`}>{contour(apparence.forme, 0.78)}</g>
        <g fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="1.2">
          {contour(apparence.forme, 0.7)}
        </g>
        {/* reflet supérieur */}
        <ellipse cx="42" cy="28" rx="22" ry="9" fill="white" opacity="0.18" />
      </svg>

      {effet === "BRILLANCE" || effet === "GIVRE" ? (
        <span className="effet-brillance absolute inset-0 overflow-hidden" style={{ clipPath: CLIP[apparence.forme] ?? CLIP.ROND }} />
      ) : null}
      {effet === "ELECTRICITE" ? <Eclairs /> : null}
      {effet === "GIVRE" ? <Givre /> : null}

      <span className="relative flex items-center justify-center text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
        {verrouille ? (
          <Lock style={{ width: taille * 0.3, height: taille * 0.3 }} strokeWidth={2.2} />
        ) : (
          <span style={{ width: taille * 0.38, height: taille * 0.38 }} className="flex">
            <Icone nom={apparence.icone} className="h-full w-full" strokeWidth={2.1} />
          </span>
        )}
      </span>
    </span>
  );
}

function Flammes() {
  const langues = [
    { x: 18, h: 0.5, d: 0, c: "#ff6a00" },
    { x: 34, h: 0.7, d: 0.25, c: "#ff3d00" },
    { x: 50, h: 0.85, d: 0.1, c: "#ffb300" },
    { x: 66, h: 0.7, d: 0.35, c: "#ff3d00" },
    { x: 82, h: 0.5, d: 0.18, c: "#ff6a00" },
  ];
  return (
    <span className="pointer-events-none absolute inset-[-14%] -top-[30%]">
      {langues.map((l, i) => (
        <span
          key={i}
          className="absolute bottom-[22%] origin-bottom rounded-[50%_50%_45%_45%/70%_70%_30%_30%]"
          style={{
            left: `${l.x - 9}%`,
            width: "18%",
            height: `${l.h * 62}%`,
            background: `radial-gradient(ellipse at 50% 85%, #fff4b0 0%, ${l.c} 45%, transparent 75%)`,
            animation: `flamme ${0.9 + i * 0.13}s ease-in-out ${l.d}s infinite`,
            filter: "blur(0.6px)",
          }}
        />
      ))}
    </span>
  );
}

function Eclairs() {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-[-12%] h-[124%] w-[124%] overflow-visible">
      {[
        "M8 30 L18 38 L12 44 L24 54",
        "M92 26 L82 36 L90 42 L78 52",
        "M30 96 L38 84 L44 90 L52 78",
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#9be7ff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: `eclair ${2.4 + i * 0.7}s linear ${i * 0.6}s infinite`, filter: "drop-shadow(0 0 3px #4fc3ff)" }}
        />
      ))}
    </svg>
  );
}

function Feuilles() {
  return (
    <span className="pointer-events-none absolute inset-0">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="absolute h-[14%] w-[9%] rounded-[0_100%_0_100%]"
          style={
            {
              left: `${15 + i * 22}%`,
              top: "-6%",
              background: i % 2 ? "#3fae5a" : "#8fd36b",
              "--dx": `${(i % 2 ? -1 : 1) * 14}px`,
              animation: `feuille ${3.2 + i * 0.5}s ease-in ${i * 0.8}s infinite`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

function Givre() {
  return (
    <span className="pointer-events-none absolute inset-[-8%]">
      {[
        [12, 18],
        [84, 22],
        [78, 82],
        [16, 78],
        [50, 4],
      ].map(([x, y], i) => (
        <span
          key={i}
          className="absolute h-[12%] w-[12%]"
          style={{ left: `${x}%`, top: `${y}%`, animation: `givre ${2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" stroke="#c9f4ff" strokeWidth="1.6" strokeLinecap="round">
            <path d="M10 1v18M1 10h18M3.6 3.6l12.8 12.8M16.4 3.6 3.6 16.4" />
          </svg>
        </span>
      ))}
    </span>
  );
}

function Cosmos() {
  return (
    <span className="pointer-events-none absolute inset-[-18%] animate-[cosmos_9s_linear_infinite]">
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${50 + 47 * Math.cos(a)}%`,
              top: `${50 + 47 * Math.sin(a)}%`,
              width: i % 3 === 0 ? 5 : 3,
              height: i % 3 === 0 ? 5 : 3,
              boxShadow: "0 0 6px #c9a4ff, 0 0 2px #fff",
              animation: `etincelle ${1.6 + (i % 4) * 0.4}s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        );
      })}
    </span>
  );
}
