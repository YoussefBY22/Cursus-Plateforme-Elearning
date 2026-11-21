"use client";

import * as React from "react";
import { NotationInteractive } from "@/components/catalogue/etoiles";
import { toast } from "@/components/ui/toasts";
import { noterFormation } from "@/server/actions/apprentissage";
import { formaterNote } from "@/services/notation";

/**
 * Notation d'une formation par le membre, réservée à qui l'a commencée :
 * noter ce qu'on n'a pas vu n'informe personne.
 */
export function BlocNotation({
  formationId,
  maNote,
  note,
  nbNotes,
  repartition,
}: {
  formationId: string;
  maNote: number | null;
  note: number | null;
  nbNotes: number;
  repartition: number[];
}) {
  const [valeur, setValeur] = React.useState(maNote);
  const [enCours, setEnCours] = React.useState(false);

  async function noter(n: number) {
    const precedente = valeur;
    setValeur(n); // retour immédiat, corrigé si le serveur refuse
    setEnCours(true);
    const r = await noterFormation({ formationId, note: n });
    setEnCours(false);
    if (r.erreur) {
      setValeur(precedente);
      toast({ titre: "Note non enregistrée", description: r.erreur, ton: "erreur" });
      return;
    }
    if (r.donnees) setValeur(r.donnees.note);
    toast({ titre: "Note enregistrée", description: r.message, ton: "succes" });
  }

  const max = Math.max(1, ...repartition);

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
      <div>
        <NotationInteractive note={valeur} enCours={enCours} onNoter={noter} />
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Votre note est anonyme pour les autres membres. Le formateur voit la moyenne, jamais qui a mis quoi.
        </p>
      </div>

      {nbNotes > 0 ? (
        <div className="min-w-48">
          <p className="mb-2 text-[13px] font-semibold">
            {formaterNote(note)} / 5 — {nbNotes} avis
          </p>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((etoiles) => {
              const n = repartition[etoiles - 1] ?? 0;
              return (
                <div key={etoiles} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-3 tabular-nums">{etoiles}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-or" style={{ width: `${(n / max) * 100}%` }} />
                  </span>
                  <span className="w-5 text-right tabular-nums">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
