"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ANNEAUX,
  NOTE_MAX,
  adoucir,
  anneauxGrille,
  attributPoints,
  estimerBoite,
  geometrieRadar,
  interpoler,
  placerLibelles,
  pointAxe,
  pointsPolygone,
  libelleCourt,
} from "@/services/radar";
import type { DomaineProfil } from "@/server/requetes/competences";

/**
 * Radar de compétences.
 *
 * Deux surfaces se superposent : le niveau de départ (auto-évaluation
 * initiale, en pointillés) et le niveau actuel. L'écart entre les deux EST le
 * message — c'est la progression, pas la note, qui motive.
 *
 * Un axe se clique pour zoomer sur son domaine. La géométrie, le placement
 * des libellés et l'interpolation viennent de `services/radar`, testés.
 */
export function Radar({
  domaines,
  actif,
  onActiver,
  largeur = 460,
  compact = false,
  className,
}: {
  domaines: DomaineProfil[];
  actif?: string | null;
  onActiver?: (domaineId: string | null) => void;
  largeur?: number;
  compact?: boolean;
  className?: string;
}) {
  const g = React.useMemo(() => geometrieRadar(largeur, { compact }), [largeur, compact]);
  const n = domaines.length;
  const cibles = React.useMemo(() => domaines.map((d) => d.niveau ?? 0), [domaines]);
  const initiaux = React.useMemo(() => domaines.map((d) => d.niveauInitial ?? 0), [domaines]);

  // Animation d'entrée : le polygone se déplie depuis le centre.
  const [t, setT] = React.useState(0);
  const anime = React.useRef(false);
  React.useEffect(() => {
    if (anime.current) {
      setT(1);
      return;
    }
    anime.current = true;
    let image = 0;
    const depart = performance.now();
    const DUREE = 900;
    const pas = (maintenant: number) => {
      const avance = Math.min(1, (maintenant - depart) / DUREE);
      setT(adoucir(avance));
      if (avance < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, []);

  const valeurs = React.useMemo(() => interpoler(new Array(n).fill(0), cibles, t), [cibles, n, t]);
  const valeursInitiales = React.useMemo(() => interpoler(new Array(n).fill(0), initiaux, t), [initiaux, n, t]);

  const grille = React.useMemo(() => anneauxGrille(n, g.rayon, g.centre), [n, g]);
  const sommets = pointsPolygone(valeurs, g.rayon, g.centre);
  const sommetsInitiaux = pointsPolygone(valeursInitiales, g.rayon, g.centre);

  const libelles = React.useMemo(() => domaines.map((d) => libelleCourt(d.nom)), [domaines]);
  const boites = React.useMemo(
    () => libelles.map((l) => estimerBoite(l, { taillePolice: compact ? 10 : 11, largeurMax: g.largeurLibelle })),
    [libelles, g.largeurLibelle, compact]
  );
  const places = React.useMemo(() => placerLibelles(boites, g), [boites, g]);

  if (n < 3) {
    return (
      <p className={cn("rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground", className)}>
        Le radar s'affiche à partir de trois domaines dans le référentiel.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${g.largeur} ${g.hauteur}`}
      className={cn("w-full select-none", className)}
      role="img"
      aria-label={`Radar de compétences : ${domaines.map((d) => `${d.nom} ${d.niveau ?? 0} sur 99`).join(", ")}`}
    >
      <defs>
        <radialGradient id="radar-remplissage" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.16" />
        </radialGradient>
      </defs>

      {/* Anneaux */}
      {grille.map((a) => (
        <polygon
          key={a.niveau}
          points={attributPoints(a.points)}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={a.niveau === NOTE_MAX ? 1.4 : 1}
        />
      ))}

      {/* Axes */}
      {domaines.map((d, i) => {
        const bout = pointAxe(i, n, g.rayon, g.centre);
        return (
          <line
            key={d.id}
            x1={g.centre.x}
            y1={g.centre.y}
            x2={bout.x}
            y2={bout.y}
            stroke="currentColor"
            className={cn("text-border transition-colors", actif === d.id && "text-foreground/40")}
            strokeWidth={1}
          />
        );
      })}

      {/* Niveau de départ */}
      <polygon
        points={attributPoints(sommetsInitiaux)}
        fill="none"
        stroke="currentColor"
        className="text-muted-foreground/70"
        strokeWidth={1.4}
        strokeDasharray="4 4"
      />

      {/* Niveau actuel */}
      <polygon
        points={attributPoints(sommets)}
        fill="url(#radar-remplissage)"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Sommets cliquables */}
      {domaines.map((d, i) => {
        const p = sommets[i];
        const estActif = actif === d.id;
        return (
          <circle
            key={d.id}
            cx={p.x}
            cy={p.y}
            r={estActif ? 6 : 4.5}
            fill={d.couleur}
            stroke="var(--card)"
            strokeWidth={2}
            className="transition-[r]"
          />
        );
      })}

      {/* Libellés et valeurs */}
      {domaines.map((d, i) => {
        const p = places[i];
        const estActif = actif === d.id;
        const ancreX = p.alignement === "milieu" ? p.x + p.largeur / 2 : p.alignement === "debut" ? p.x : p.x + p.largeur;
        const ancre = p.alignement === "milieu" ? "middle" : p.alignement === "debut" ? "start" : "end";
        const lignes = boites[i].lignes;
        return (
          <g
            key={d.id}
            onClick={() => onActiver?.(estActif ? null : d.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActiver?.(estActif ? null : d.id);
              }
            }}
            tabIndex={onActiver ? 0 : -1}
            role={onActiver ? "button" : undefined}
            aria-pressed={onActiver ? estActif : undefined}
            aria-label={`${d.nom} : ${d.niveau ?? "non évalué"} sur 99`}
            className={cn(onActiver && "cursor-pointer outline-none", "group")}
          >
            <rect
              x={p.x - 4}
              y={p.y - 3}
              width={p.largeur + 8}
              height={p.hauteur + 6}
              rx={7}
              fill={estActif ? d.couleur : "transparent"}
              fillOpacity={estActif ? 0.14 : 0}
              className="transition-[fill-opacity] group-hover:fill-current group-hover:text-muted group-focus-visible:fill-current group-focus-visible:text-muted"
            />
            {lignes.map((ligne, j) => (
              <text
                key={j}
                x={ancreX}
                y={p.y + (j + 1) * (compact ? 12 : 13) - 2}
                textAnchor={ancre}
                className={cn(
                  compact ? "text-[10px]" : "text-[11px]",
                  estActif ? "font-bold" : "font-semibold",
                  "fill-current"
                )}
                style={{ color: estActif ? d.couleur : undefined }}
              >
                {ligne}
              </text>
            ))}
            <text
              x={ancreX}
              y={p.y + lignes.length * (compact ? 12 : 13) + (compact ? 7 : 8)}
              textAnchor={ancre}
              className={cn(compact ? "text-[10px]" : "text-[11px]", "fill-current font-bold tabular-nums")}
              style={{ color: d.niveau === null ? "var(--muted-foreground)" : d.couleur }}
            >
              {d.niveau === null ? "—" : d.niveau}
            </text>
          </g>
        );
      })}

      {/* Échelle */}
      {!compact
        ? ANNEAUX.map((a) => (
            <text
              key={a}
              x={g.centre.x + 3}
              y={g.centre.y - (a / NOTE_MAX) * g.rayon - 2}
              className="fill-current text-[9px] text-muted-foreground/70"
            >
              {a}
            </text>
          ))
        : null}
    </svg>
  );
}
