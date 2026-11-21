"use client";

import { useEffect } from "react";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur } from "@/components/ui/etat-vide";

/** Contenu commun des `error.tsx` de l'espace RH. */
export function ErreurRh({ error, reset, ecran }: { error: Error & { digest?: string }; reset: () => void; ecran: string }) {
  useEffect(() => {
    console.error(`[mon-organisation] ${ecran} :`, error);
  }, [error, ecran]);
  return (
    <EtatErreur
      titre={`Impossible d'afficher ${ecran}`}
      description="La base de données n'a pas répondu à temps ou une donnée est incohérente. Réessayez ; si le problème persiste, téléchargez vos exports et signalez l'heure de l'erreur."
      action={
        <Bouton variante="contour" onClick={reset}>
          Réessayer
        </Bouton>
      }
    />
  );
}
