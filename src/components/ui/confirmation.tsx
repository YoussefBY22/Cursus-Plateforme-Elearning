"use client";

import * as React from "react";
import { Bouton, type BoutonProps } from "./bouton";
import { Dialogue } from "./dialogue";

/**
 * Bouton qui demande confirmation avant d'envoyer son formulaire.
 * Toute action destructive passe par là : rien ne disparaît sur un clic
 * distrait, et le message dit précisément ce qui va se passer.
 */
export function BoutonConfirme({
  action,
  message,
  titre = "Confirmer",
  libelleConfirmation = "Confirmer",
  champs,
  children,
  variante = "danger",
  ...props
}: Omit<BoutonProps, "onClick"> & {
  action: (formData: FormData) => void | Promise<void>;
  message: React.ReactNode;
  titre?: string;
  libelleConfirmation?: string;
  champs?: Record<string, string>;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const [enCours, demarrer] = React.useTransition();
  return (
    <>
      <Bouton variante={variante} {...props} onClick={() => setOuvert(true)}>
        {children}
      </Bouton>
      <Dialogue ouvert={ouvert} onFermer={() => setOuvert(false)} titre={titre}>
        <div className="text-sm leading-relaxed text-muted-foreground">{message}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="contour" onClick={() => setOuvert(false)}>
            Annuler
          </Bouton>
          <Bouton
            variante={variante === "danger" ? "primaire" : variante}
            disabled={enCours}
            onClick={() => {
              const fd = new FormData();
              for (const [k, v] of Object.entries(champs ?? {})) fd.set(k, v);
              demarrer(async () => {
                await action(fd);
                setOuvert(false);
              });
            }}
          >
            {enCours ? "En cours…" : libelleConfirmation}
          </Bouton>
        </div>
      </Dialogue>
    </>
  );
}
