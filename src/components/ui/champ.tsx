import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 " +
  "transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger";

export const Champ = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Champ({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, "h-11", className)} {...props} />;
  }
);

export const ZoneTexte = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function ZoneTexte({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(base, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
  }
);

export const Selecteur = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Selecteur({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(base, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23566a6f' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
        {...props}
      >
        {children}
      </select>
    );
  }
);

export function Etiquette({
  className,
  children,
  aide,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { aide?: React.ReactNode }) {
  return (
    <label className={cn("mb-1.5 block text-[13px] font-semibold text-foreground", className)} {...props}>
      {children}
      {aide ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{aide}</span> : null}
    </label>
  );
}

/** Champ complet : étiquette, contrôle, aide et erreur, correctement reliés. */
export function Groupe({
  id,
  label,
  aide,
  erreur,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  aide?: React.ReactNode;
  erreur?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Etiquette htmlFor={id}>{label}</Etiquette>
      {children}
      {erreur ? (
        <p id={`${id}-erreur`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {erreur}
        </p>
      ) : aide ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{aide}</p>
      ) : null}
    </div>
  );
}

export function CaseACocher({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-2 -m-2 hover:bg-muted/60", className)}>
      <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--primary)]" {...props} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}
