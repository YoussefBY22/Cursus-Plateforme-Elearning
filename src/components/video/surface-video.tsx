"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CodeFournisseur } from "./fournisseurs";
import { PILOTES, type ControleVideo, type EvenementsVideo } from "./pilotes";

/**
 * Surface vidéo : monte le pilote du fournisseur et rend la main via
 * `onPret(controle)`. Aucune interface ici — le lecteur suivi et le studio
 * posent leurs propres contrôles par-dessus.
 *
 * Exemple (studio) :
 *   <SurfaceVideo fournisseur="YOUTUBE" reference="dQw4w9WgXcQ" controlesNatifs
 *     onPret={(c) => setDuree(c.duree())} />
 */
export function SurfaceVideo({
  fournisseur,
  reference,
  controlesNatifs = false,
  debut,
  className,
  onPret,
  onEtat,
  onErreur,
}: {
  fournisseur: CodeFournisseur;
  reference: string;
  controlesNatifs?: boolean;
  debut?: number;
  className?: string;
} & EvenementsVideo) {
  const conteneur = React.useRef<HTMLDivElement>(null);
  // Les rappels changent à chaque rendu : on les lit via une référence pour
  // ne pas remonter la vidéo (et perdre la lecture) à chaque fois.
  const rappels = React.useRef<EvenementsVideo>({ onPret, onEtat, onErreur });
  React.useEffect(() => {
    rappels.current = { onPret, onEtat, onErreur };
  });
  const debutInitial = React.useRef(debut);

  React.useEffect(() => {
    const el = conteneur.current;
    if (!el || !reference) return;
    const demonter = PILOTES[fournisseur](
      el,
      reference,
      { controlesNatifs, debut: debutInitial.current },
      {
        onPret: (c: ControleVideo) => rappels.current.onPret?.(c),
        onEtat: (e) => rappels.current.onEtat?.(e),
        onErreur: (m) => rappels.current.onErreur?.(m),
      }
    );
    return demonter;
  }, [fournisseur, reference, controlesNatifs]);

  return <div ref={conteneur} className={cn("relative h-full w-full overflow-hidden bg-black", className)} />;
}
