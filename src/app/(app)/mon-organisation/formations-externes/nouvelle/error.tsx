"use client";

import { ErreurRh } from "@/components/rh/erreur-rh";

export default function ErreurNouvelleFormation({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErreurRh error={error} reset={reset} ecran="le formulaire de formation externe" />;
}
