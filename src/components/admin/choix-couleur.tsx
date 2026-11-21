"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Champ } from "@/components/ui/champ";
import { cn } from "@/lib/utils";

/** Teintes de la charte Cursus et couleurs d'accompagnement (données, pas couleurs d'interface). */
export const PALETTE_MARQUE: { hex: string; nom: string }[] = [
  { hex: "#4f46e5", nom: "Indigo" },
  { hex: "#0f1226", nom: "Encre" },
  { hex: "#8E172C", nom: "Bordeaux" },
  { hex: "#C2417A", nom: "Framboise" },
  { hex: "#5B3A8C", nom: "Violet" },
  { hex: "#2563EB", nom: "Bleu" },
  { hex: "#1E7A86", nom: "Turquoise" },
  { hex: "#12A150", nom: "Vert" },
  { hex: "#C77C00", nom: "Ambre" },
  { hex: "#E2A400", nom: "Or" },
  { hex: "#64748B", nom: "Ardoise" },
];

export const HEX_VALIDE = /^#[0-9a-fA-F]{6}$/;

/**
 * Choix d'une couleur : palette cliquable + champ hexadécimal validé.
 * Contrôlé (valeur / onChange) ; le champ caché `name` porte la dernière
 * couleur valide, jamais une saisie à moitié tapée.
 */
export function ChoixCouleur({
  id,
  name,
  valeur,
  onChange,
  erreur,
}: {
  id: string;
  name: string;
  valeur: string;
  onChange: (hex: string) => void;
  erreur?: string;
}) {
  const [brouillon, setBrouillon] = useState(valeur);
  const [suivie, setSuivie] = useState(valeur);
  // Une couleur choisie ailleurs (palette, rareté) remplace la saisie en cours.
  if (valeur !== suivie) {
    setSuivie(valeur);
    setBrouillon(valeur);
  }
  const invalide = brouillon.length > 0 && !HEX_VALIDE.test(brouillon);

  return (
    <div>
      <input type="hidden" name={name} value={valeur} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Palette de couleurs">
        {PALETTE_MARQUE.map((c) => {
          const actif = c.hex.toLowerCase() === valeur.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={c.nom}
              title={`${c.nom} ${c.hex}`}
              onClick={() => onChange(c.hex)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110",
                actif ? "ring-2 ring-foreground" : "ring-1 ring-border"
              )}
              style={{ background: c.hex }}
            >
              {actif ? <Check size={14} className="text-white drop-shadow" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="h-11 w-11 shrink-0 rounded-xl border border-border" style={{ background: HEX_VALIDE.test(valeur) ? valeur : "transparent" }} aria-hidden />
        <Champ
          id={id}
          value={brouillon}
          onChange={(e) => {
            const v = e.target.value.trim();
            const avecDiese = v && !v.startsWith("#") ? `#${v}` : v;
            setBrouillon(avecDiese);
            if (HEX_VALIDE.test(avecDiese)) onChange(avecDiese.toUpperCase());
          }}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          placeholder="#RRGGBB"
          className="chiffres max-w-[9rem] uppercase"
          aria-invalid={invalide || !!erreur}
          aria-describedby={`${id}-aide`}
        />
      </div>
      <p id={`${id}-aide`} className={cn("mt-1.5 text-xs", invalide || erreur ? "font-medium text-danger" : "text-muted-foreground")}>
        {erreur ?? (invalide ? "Format attendu : # suivi de 6 chiffres hexadécimaux, par exemple #4f46e5." : "Choisissez une teinte ou saisissez un code hexadécimal.")}
      </p>
    </div>
  );
}
