"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COULEURS_THEME, HEX_COULEUR } from "@/services/certificats/edition";

/**
 * Petits contrôles compacts de l'éditeur de certificats : un panneau de
 * réglages se lit d'un coup d'œil, il ne doit pas défiler sur trois écrans.
 */

export function Panneau({
  titre,
  action,
  children,
  className,
}: {
  titre: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[13px] font-bold tracking-tight">{titre}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const baseChamp =
  "h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

export function ChampNombre({
  id,
  libelle,
  valeur,
  onChange,
  pas = 0.5,
  min,
  max,
  disabled,
  suffixe,
}: {
  id: string;
  libelle: string;
  valeur: number;
  onChange: (v: number) => void;
  pas?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  suffixe?: string;
}) {
  // Brouillon local : on peut effacer le champ pour retaper sans que le bloc
  // saute à 0 entre deux touches.
  const [brouillon, setBrouillon] = React.useState(String(valeur));
  const [suivie, setSuivie] = React.useState(valeur);
  if (valeur !== suivie) {
    setSuivie(valeur);
    setBrouillon(String(valeur));
  }
  return (
    <label htmlFor={id} className="block text-[11px] font-semibold text-muted-foreground">
      {libelle}
      <span className="relative mt-1 block">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={pas}
          min={min}
          max={max}
          value={brouillon}
          disabled={disabled}
          onChange={(e) => {
            setBrouillon(e.target.value);
            const n = Number(e.target.value.replace(",", "."));
            if (e.target.value.trim() !== "" && Number.isFinite(n)) {
              const borne = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
              setSuivie(borne);
              onChange(borne);
            }
          }}
          className={cn(baseChamp, "chiffres", suffixe ? "pr-8" : "")}
        />
        {suffixe ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {suffixe}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function ChampTexte({
  id,
  libelle,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; libelle: string }) {
  return (
    <label htmlFor={id} className="block text-[11px] font-semibold text-muted-foreground">
      {libelle}
      <input id={id} {...props} className={cn(baseChamp, "mt-1", props.className)} />
    </label>
  );
}

/** Couleur d'un élément du certificat : pastilles rapides + sélecteur natif + hexadécimal. */
export function ChampCouleur({
  id,
  libelle,
  valeur,
  onChange,
  suggestions = [],
  aucune,
  disabled,
}: {
  id: string;
  libelle: string;
  valeur: string;
  onChange: (hex: string) => void;
  suggestions?: string[];
  /** Libellé de l'option « sans couleur » (fond transparent, pas de filet). */
  aucune?: string;
  disabled?: boolean;
}) {
  const [brouillon, setBrouillon] = React.useState(valeur);
  const [suivie, setSuivie] = React.useState(valeur);
  if (valeur !== suivie) {
    setSuivie(valeur);
    setBrouillon(valeur);
  }
  const pastilles = [...new Set(suggestions.map((s) => s.toUpperCase()))];
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold text-muted-foreground">
        {libelle}
      </label>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="color"
          aria-label={`${libelle} : sélecteur`}
          value={HEX_COULEUR.test(valeur) ? valeur : "#ffffff"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-0.5"
        />
        <input
          id={id}
          value={brouillon}
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          placeholder={aucune ? "Aucune" : "#RRGGBB"}
          onChange={(e) => {
            const v = e.target.value.trim();
            const avecDiese = v && !v.startsWith("#") ? `#${v}` : v;
            setBrouillon(avecDiese);
            if (HEX_COULEUR.test(avecDiese)) onChange(avecDiese.toUpperCase());
            else if (!avecDiese && aucune) onChange("");
          }}
          className={cn(baseChamp, "chiffres min-w-0 flex-1 uppercase")}
        />
      </div>
      {pastilles.length || aucune ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {pastilles.map((hex) => (
            <button
              key={hex}
              type="button"
              disabled={disabled}
              onClick={() => onChange(hex)}
              title={hex}
              aria-label={`${libelle} : ${hex}`}
              className={cn(
                "h-5 w-5 rounded-full ring-offset-1 ring-offset-card",
                valeur.toUpperCase() === hex ? "ring-2 ring-foreground" : "ring-1 ring-border"
              )}
              style={{ background: hex }}
            />
          ))}
          {aucune ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className={cn(
                "ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                valeur ? "text-muted-foreground hover:bg-muted" : "bg-nuit text-white"
              )}
            >
              {aucune}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Groupe de boutons exclusifs (alignements, orientation…). */
export function Segments<T extends string>({
  libelle,
  options,
  valeur,
  onChange,
  disabled,
}: {
  libelle: string;
  options: { valeur: T; libelle: string; icone?: React.ReactNode }[];
  valeur: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">{libelle}</p>
      <div role="radiogroup" aria-label={libelle} className="mt-1 flex rounded-lg border border-border bg-muted/50 p-0.5">
        {options.map((o) => {
          const actif = o.valeur === valeur;
          return (
            <button
              key={o.valeur}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={o.libelle}
              title={o.libelle}
              disabled={disabled}
              onClick={() => onChange(o.valeur)}
              className={cn(
                "flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition-colors",
                actif ? "bg-card text-foreground shadow-doux" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.icone ?? o.libelle}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Bouton bascule (gras, italique, majuscules). */
export function Bascule({
  actif,
  libelle,
  children,
  onClick,
  disabled,
}: {
  actif: boolean;
  libelle: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      aria-label={libelle}
      title={libelle}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-9 items-center justify-center rounded-lg border text-xs transition-colors",
        actif ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

export function BoutonIcone({
  libelle,
  children,
  onClick,
  disabled,
  danger,
  className,
}: {
  libelle: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={libelle}
      aria-label={libelle}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border transition-colors disabled:opacity-40",
        danger ? "text-danger hover:border-danger/40 hover:bg-danger-soft" : "hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Couleur de thème : six teintes suggérées + hexadécimal libre. */
export function ChoixTheme({
  valeur,
  onChange,
  disabled,
}: {
  valeur: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const [brouillon, setBrouillon] = React.useState(valeur);
  const [suivie, setSuivie] = React.useState(valeur);
  if (valeur !== suivie) {
    setSuivie(valeur);
    setBrouillon(valeur);
  }
  const invalide = brouillon.length > 0 && !HEX_COULEUR.test(brouillon);
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">Couleur de thème</p>
      <div role="radiogroup" aria-label="Couleur de thème" className="mt-1.5 grid grid-cols-6 gap-1.5">
        {COULEURS_THEME.map((c) => {
          const actif = c.hex.toLowerCase() === valeur.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={c.nom}
              title={`${c.nom} · ${c.hex}`}
              disabled={disabled}
              onClick={() => onChange(c.hex)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl ring-offset-2 ring-offset-card transition-transform hover:scale-105",
                actif ? "ring-2 ring-foreground" : "ring-1 ring-black/10"
              )}
              style={{ background: c.hex }}
            >
              {actif ? <Check size={14} className="text-white drop-shadow" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          type="color"
          aria-label="Couleur de thème libre"
          value={HEX_COULEUR.test(valeur) ? valeur : "#4f46e5"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-0.5"
        />
        <input
          aria-label="Code hexadécimal de la couleur de thème"
          value={brouillon}
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          aria-invalid={invalide}
          onChange={(e) => {
            const v = e.target.value.trim();
            const avecDiese = v && !v.startsWith("#") ? `#${v}` : v;
            setBrouillon(avecDiese);
            if (HEX_COULEUR.test(avecDiese)) onChange(avecDiese.toUpperCase());
          }}
          className={cn(baseChamp, "chiffres min-w-0 flex-1 uppercase aria-invalid:border-danger")}
        />
      </div>
      <p className={cn("mt-1 text-[11px]", invalide ? "font-medium text-danger" : "text-muted-foreground")}>
        {invalide ? "Format attendu : #RRGGBB." : "Teinte la bordure ; les éléments de la même couleur suivent."}
      </p>
    </div>
  );
}
