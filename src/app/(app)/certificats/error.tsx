"use client";

import { useEffect } from "react";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur } from "@/components/ui/etat-vide";

export default function ErreurMesCertificats({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[certificats] Mes certificats :", error);
  }, [error]);
  return (
    <EtatErreur
      titre="Impossible d'afficher vos certificats"
      description="Le serveur n'a pas répondu à temps. Vos certificats sont en sécurité : réessayez dans un instant."
      action={
        <Bouton variante="contour" onClick={reset}>
          Réessayer
        </Bouton>
      }
    />
  );
}
