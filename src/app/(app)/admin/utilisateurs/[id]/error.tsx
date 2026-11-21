"use client";

import { ErreurAdmin } from "@/components/admin/erreur-admin";

export default function ErreurFicheCompte({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErreurAdmin error={error} reset={reset} ecran="la fiche du compte" />;
}
