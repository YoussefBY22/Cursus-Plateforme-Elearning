"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formaterNote, noteDepuisPosition, remplissageEtoile } from "@/services/notation";

/**
 * Rangée d'étoiles, au quart d'étoile près.
 *
 * `Etoiles` affiche une note ; `NotationInteractive` la fait saisir : le
 * pointeur peint la rangée en direct, la note déjà donnée reste visible en
 * gris derrière pour qu'on voie ce qu'on remplace.
 */

function Etoile({ remplissage, cle, className }: { remplissage: number; cle: string; className?: string }) {
  const pct = Math.round(remplissage * 100);
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={cle} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${pct}%`} stopColor="currentColor" />
          <stop offset={`${pct}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6l2.9 5.88 6.49.95-4.7 4.58 1.11 6.46L12 17.42l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.95z"
        fill={`url(#${cle})`}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        className="opacity-100"
      />
    </svg>
  );
}

export function Etoiles({
  note,
  nb,
  taille = "sm",
  className,
}: {
  note: number | null;
  nb?: number;
  taille?: "sm" | "md";
  className?: string;
}) {
  const id = React.useId();
  if (note === null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {nb === 0 || nb === undefined ? "Pas encore notée" : "—"}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("inline-flex text-or", taille === "md" && "[&>svg]:h-5 [&>svg]:w-5")} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Etoile key={i} cle={`${id}-${i}`} remplissage={remplissageEtoile(note, i)} />
        ))}
      </span>
      <span className={cn("font-bold tabular-nums", taille === "md" ? "text-sm" : "text-xs")}>{formaterNote(note)}</span>
      {nb !== undefined ? <span className="text-xs text-muted-foreground">({nb})</span> : null}
      <span className="sr-only">{formaterNote(note)} sur 5</span>
    </span>
  );
}

export function NotationInteractive({
  note,
  enCours,
  onNoter,
}: {
  note: number | null;
  enCours?: boolean;
  onNoter: (note: number) => void;
}) {
  const id = React.useId();
  const rangee = React.useRef<HTMLDivElement>(null);
  const [survol, setSurvol] = React.useState<number | null>(null);
  const affichee = survol ?? note ?? 0;

  function noteAu(clientX: number): number {
    const r = rangee.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return noteDepuisPosition((clientX - r.left) / r.width);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        ref={rangee}
        role="slider"
        tabIndex={0}
        aria-label="Noter cette formation"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={note ?? undefined}
        aria-valuetext={note ? `${formaterNote(note)} sur 5` : "aucune note"}
        aria-disabled={enCours}
        className={cn(
          "inline-flex cursor-pointer touch-none items-center gap-0.5 rounded-lg px-1 py-0.5 transition-opacity",
          enCours && "pointer-events-none opacity-60"
        )}
        onPointerMove={(e) => setSurvol(noteAu(e.clientX))}
        onPointerLeave={() => setSurvol(null)}
        onPointerDown={(e) => {
          e.preventDefault();
          onNoter(noteAu(e.clientX));
        }}
        onKeyDown={(e) => {
          const pas = e.shiftKey ? 0.25 : 1;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onNoter(Math.min(5, (note ?? 0) + pas));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onNoter(Math.max(1, (note ?? 5) - pas));
          }
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="relative inline-flex">
            {/* La note déjà donnée reste en gris derrière la nouvelle. */}
            {note !== null && survol !== null ? (
              <Etoile
                cle={`${id}-fond-${i}`}
                remplissage={remplissageEtoile(note, i)}
                className="absolute inset-0 h-5 w-5 text-muted-foreground/60"
              />
            ) : null}
            <Etoile
              cle={`${id}-${i}`}
              remplissage={remplissageEtoile(affichee, i)}
              className={cn(
                "h-5 w-5 transition-transform duration-150",
                survol !== null ? "text-or" : note !== null ? "text-or" : "text-muted-foreground",
                survol !== null && survol > i && "scale-110"
              )}
            />
          </span>
        ))}
      </div>
      <span className="text-[13px] text-muted-foreground">
        {survol !== null
          ? `Noter ${formaterNote(survol)} / 5`
          : note !== null
            ? `Votre note : ${formaterNote(note)} / 5 — cliquez pour la changer`
            : "Donnez votre note"}
      </span>
    </div>
  );
}
