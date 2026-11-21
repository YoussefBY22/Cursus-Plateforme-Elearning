"use client";

import { ErreurRh } from "@/components/rh/erreur-rh";

export default function ErreurMaJe({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErreurRh error={error} reset={reset} ecran="l'espace de votre organisation" />;
}
