"use client";

import * as React from "react";
import { Check, Lock, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PointLecture } from "@/server/requetes/lecture";
import { horodatage, type Segment } from "@/services/visionnage";

/**
 * Barre de lecture de Cursus.
 *
 * Elle montre trois choses que les lecteurs ordinaires cachent :
 *   — le visionnage réellement comptabilisé (les segments vus, pas la
 *     position atteinte) ;
 *   — les quiz à venir, posés sur la ligne de temps ;
 *   — la zone verrouillée au-delà du prochain quiz non fait, hachurée.
 * La règle devient lisible : on voit pourquoi on ne peut pas avancer.
 */

export function BarreLecture({
  position,
  duree,
  segments,
  points,
  barriere,
  enLecture,
  volume,
  muet,
  vitesse,
  pleinEcran,
  couleur,
  onBasculerLecture,
  onAller,
  onVolume,
  onMuet,
  onVitesse,
  onPleinEcran,
  vitesseMax,
}: {
  position: number;
  duree: number;
  segments: Segment[];
  points: PointLecture[];
  barriere: number | null;
  enLecture: boolean;
  volume: number;
  muet: boolean;
  vitesse: number;
  pleinEcran: boolean;
  couleur: string;
  onBasculerLecture: () => void;
  onAller: (s: number) => void;
  onVolume: (v: number) => void;
  onMuet: (m: boolean) => void;
  onVitesse: (v: number) => void;
  onPleinEcran: () => void;
  vitesseMax: number;
}) {
  const piste = React.useRef<HTMLDivElement>(null);
  const [survol, setSurvol] = React.useState<number | null>(null);
  const pct = (s: number) => (duree > 0 ? Math.min(100, Math.max(0, (s / duree) * 100)) : 0);
  const limite = barriere ?? duree;

  function positionAu(clientX: number): number {
    const r = piste.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    const brute = ((clientX - r.left) / r.width) * duree;
    return Math.min(limite, Math.max(0, brute));
  }

  const vitesses = [0.75, 1, 1.25, 1.5, 2].filter((v) => v <= vitesseMax + 1e-9);

  return (
    <div className="bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pb-3 pt-10 sm:px-4">
      {/* Ligne de temps */}
      <div
        ref={piste}
        role="slider"
        tabIndex={0}
        aria-label="Position dans la vidéo"
        aria-valuemin={0}
        aria-valuemax={Math.round(duree)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${horodatage(position)} sur ${horodatage(duree)}`}
        className="group relative h-8 cursor-pointer touch-none select-none"
        onPointerMove={(e) => setSurvol(positionAu(e.clientX))}
        onPointerLeave={() => setSurvol(null)}
        onPointerDown={(e) => {
          e.preventDefault();
          onAller(positionAu(e.clientX));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            onAller(Math.min(limite, position + 5));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            onAller(Math.max(0, position - 5));
          } else if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onBasculerLecture();
          }
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-[height] group-hover:h-2.5">
          {/* Zone verrouillée au-delà du prochain quiz */}
          {barriere !== null ? (
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.22)_0_4px,transparent_4px_9px)]"
              style={{ left: `${pct(barriere)}%` }}
            />
          ) : null}

          {/* Visionnage réellement compté */}
          {segments.map(([a, b], i) => (
            <span
              key={`${a}-${b}-${i}`}
              aria-hidden
              className="absolute inset-y-0 bg-white/55"
              style={{ left: `${pct(a)}%`, width: `${Math.max(0.4, pct(b) - pct(a))}%` }}
            />
          ))}

          {/* Position courante */}
          <span aria-hidden className="absolute inset-y-0 left-0 rounded-r-full" style={{ width: `${pct(position)}%`, background: couleur }} />

          {/* Repère de survol */}
          {survol !== null ? (
            <span aria-hidden className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `${pct(survol)}%` }} />
          ) : null}
        </div>

        {/* Marqueurs de quiz */}
        {points
          .filter((p) => p.type === "INTEGRE" && p.tempsSec !== null)
          .map((p) => (
            <span
              key={p.id}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pct(p.tempsSec!)}%` }}
              title={`${p.titre} — ${horodatage(p.tempsSec!)}${p.realise ? " (fait)" : ""}`}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-black/40",
                  p.realise ? "bg-success text-white" : "bg-[var(--or)] text-black"
                )}
              >
                {p.realise ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden /> : <span className="h-1 w-1 rounded-full bg-black/70" aria-hidden />}
              </span>
              <span className="sr-only">
                Quiz « {p.titre} » à {horodatage(p.tempsSec!)}
                {p.realise ? ", fait" : ", à faire"}
              </span>
            </span>
          ))}

        {/* Curseur */}
        <span
          aria-hidden
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ left: `${pct(position)}%` }}
        />

        {survol !== null ? (
          <span
            className="pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full rounded-md bg-black/90 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white"
            style={{ left: `${pct(survol)}%` }}
          >
            {horodatage(survol)}
          </span>
        ) : null}
      </div>

      {/* Commandes */}
      <div className="flex items-center gap-1.5 text-white">
        <button
          type="button"
          onClick={onBasculerLecture}
          aria-label={enLecture ? "Mettre en pause" : "Lire"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
        >
          {enLecture ? <Pause className="h-5 w-5 fill-current" aria-hidden /> : <Play className="h-5 w-5 fill-current" aria-hidden />}
        </button>

        <div className="group/son flex items-center">
          <button
            type="button"
            onClick={() => onMuet(!muet)}
            aria-label={muet ? "Rétablir le son" : "Couper le son"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
          >
            {muet || volume === 0 ? <VolumeX className="h-[18px] w-[18px]" aria-hidden /> : <Volume2 className="h-[18px] w-[18px]" aria-hidden />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muet ? 0 : volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              onVolume(v);
              if (v > 0 && muet) onMuet(false);
            }}
            aria-label="Volume"
            className="h-1 w-0 cursor-pointer accent-white opacity-0 transition-all duration-200 group-hover/son:mr-2 group-hover/son:w-16 group-hover/son:opacity-100 focus-visible:mr-2 focus-visible:w-16 focus-visible:opacity-100"
          />
        </div>

        <span className="ml-1 text-xs font-semibold tabular-nums text-white/90">
          {horodatage(position)} <span className="text-white/50">/ {horodatage(duree)}</span>
        </span>

        {barriere !== null ? (
          <span className="ml-2 hidden items-center gap-1 rounded-full bg-[var(--or)]/90 px-2 py-0.5 text-[11px] font-bold text-black sm:inline-flex">
            <Lock className="h-3 w-3" aria-hidden />
            Quiz à {horodatage(barriere)}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <select
            value={vitesse}
            onChange={(e) => onVitesse(Number(e.target.value))}
            aria-label="Vitesse de lecture"
            // `appearance-none` : sans lui, Chromium repeint le champ en blanc
            // avec sa propre flèche, et le fond clair jure sur la barre sombre.
            className="h-8 cursor-pointer appearance-none rounded-lg bg-white/15 px-2 text-center text-xs font-semibold text-white outline-none hover:bg-white/25"
          >
            {vitesses.map((v) => (
              <option key={v} value={v} className="text-black">
                {v}×
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onPleinEcran}
            aria-label={pleinEcran ? "Quitter le plein écran" : "Plein écran"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
          >
            {pleinEcran ? <Minimize className="h-[18px] w-[18px]" aria-hidden /> : <Maximize className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}
