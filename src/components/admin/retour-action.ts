"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toasts";
import type { Resultat } from "@/lib/resultat";

/**
 * Affiche un toast à chaque nouveau retour d'action serveur (`useActionState`).
 * Le succès reprend le verbe du bouton (« Badge enregistré ») ; l'échec dit
 * ce qui bloque. Les erreurs de champ restent sous les champs.
 */
export function useRetourAction<T>(etat: Resultat<T>, options?: { succes?: string; onSucces?: (e: Resultat<T>) => void }) {
  const dernier = useRef<Resultat<T> | null>(null);
  useEffect(() => {
    if (etat === dernier.current) return;
    dernier.current = etat;
    if (etat.ok) {
      toast({ titre: etat.message ?? options?.succes ?? "Modifications enregistrées", ton: "succes" });
      options?.onSucces?.(etat);
    } else if (etat.erreur) {
      toast({ titre: "Action impossible", description: etat.erreur, ton: "erreur" });
    } else if (etat.erreurs && Object.keys(etat.erreurs).length) {
      toast({ titre: "Formulaire incomplet", description: "Corrigez les champs signalés en rouge.", ton: "erreur" });
    }
  }, [etat, options]);
}

/** Exécute une action serveur hors formulaire et en fait un toast. */
export async function lancerAction<T>(
  action: () => Promise<Resultat<T>>,
  succes?: string
): Promise<Resultat<T>> {
  try {
    const r = await action();
    if (r.ok) toast({ titre: r.message ?? succes ?? "C'est fait", ton: "succes" });
    else toast({ titre: "Action impossible", description: r.erreur ?? "Réessayez dans un instant.", ton: "erreur" });
    return r;
  } catch {
    toast({ titre: "Action impossible", description: "Le serveur n'a pas répondu. Réessayez.", ton: "erreur" });
    return { ok: false, erreur: "Le serveur n'a pas répondu." };
  }
}
