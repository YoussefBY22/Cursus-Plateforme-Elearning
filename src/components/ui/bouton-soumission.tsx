"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Bouton, type BoutonProps } from "./bouton";

/** Bouton d'envoi qui montre l'attente pendant l'aller-retour serveur. */
export function BoutonSoumission({ children, enCours, ...props }: BoutonProps & { enCours?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Bouton type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending && enCours ? enCours : children}
    </Bouton>
  );
}
