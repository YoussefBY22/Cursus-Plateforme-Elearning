"use client";

import { useEffect } from "react";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur } from "@/components/ui/etat-vide";

/** Contenu commun des `error.tsx` de l'espace d'administration. */
export function ErreurAdmin({
  error,
  reset,
  ecran,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** « le tableau de bord », « la liste des membres »… */
  ecran: string;
}) {
  useEffect(() => {
    console.error(`[admin] ${ecran} :`, error);
  }, [error, ecran]);
  return (
    <EtatErreur
      titre={`Impossible d'afficher ${ecran}`}
      description="La base de données n'a pas répondu à temps ou une donnée est incohérente. Réessayez ; si le problème persiste, signalez-le avec l'heure de l'erreur."
      action={
        <Bouton variante="contour" onClick={reset}>
          Réessayer
        </Bouton>
      }
    />
  );
}
