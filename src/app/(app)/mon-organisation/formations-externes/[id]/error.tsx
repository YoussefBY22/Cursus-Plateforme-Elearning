"use client";

import { ErreurRh } from "@/components/rh/erreur-rh";

export default function ErreurFormationExterne({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErreurRh error={error} reset={reset} ecran="cette formation externe" />;
}
