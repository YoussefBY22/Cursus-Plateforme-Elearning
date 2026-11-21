"use client";

import { ErreurAdmin } from "@/components/admin/erreur-admin";

export default function ErreurCertificatsAdmin({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErreurAdmin error={error} reset={reset} ecran="les certificats" />;
}
