"use client";

import { useEffect } from "react";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur } from "@/components/ui/etat-vide";

export default function ErreurVerification({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[verification] :", error);
  }, [error]);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <EtatErreur
        titre="La vérification n'a pas pu aboutir"
        description="Le service est momentanément indisponible. Réessayez dans un instant : le lien reste valable."
        action={
          <Bouton variante="contour" onClick={reset}>
            Réessayer
          </Bouton>
        }
      />
    </div>
  );
}
