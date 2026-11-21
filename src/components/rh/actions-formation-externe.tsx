"use client";

import { useTransition } from "react";
import { Calculator, Send } from "lucide-react";
import { lancerAction } from "@/components/admin/retour-action";
import { Bouton } from "@/components/ui/bouton";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { cloturerFormationExterne, demanderAutoEvaluation } from "@/server/actions/rh";

function BoutonDemande({
  type,
  formationExterneId,
  je,
  restants,
}: {
  type: "initiale" | "finale";
  formationExterneId: string;
  je: string;
  restants: number;
}) {
  const [enCours, demarrer] = useTransition();
  return (
    <Bouton
      variante="contour"
      taille="sm"
      disabled={enCours || restants === 0}
      title={restants === 0 ? "Tous les participants l'ont terminée" : undefined}
      onClick={() =>
        demarrer(async () => {
          const fd = new FormData();
          fd.set("je", je);
          fd.set("formationExterneId", formationExterneId);
          fd.set("type", type);
          await lancerAction(() => demanderAutoEvaluation(fd));
        })
      }
    >
      <Send size={14} aria-hidden /> Demander l&apos;auto-évaluation {type}
    </Bouton>
  );
}

/** Actions d'une formation externe ouverte : demandes d'auto-évaluation et clôture. */
export function ActionsFormationExterne({
  formationExterneId,
  je,
  restantsInitiale,
  restantsFinale,
  cloturePossible,
  avertissements,
}: {
  formationExterneId: string;
  je: string;
  restantsInitiale: number;
  restantsFinale: number;
  cloturePossible: boolean;
  avertissements: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BoutonDemande type="initiale" formationExterneId={formationExterneId} je={je} restants={restantsInitiale} />
      <BoutonDemande type="finale" formationExterneId={formationExterneId} je={je} restants={restantsFinale} />
      <BoutonConfirme
        variante="primaire"
        disabled={!cloturePossible}
        title={cloturePossible ? undefined : "Aucune mesure : saisissez d'abord l'évaluation du formateur ou un score de test."}
        titre="Clôturer et calculer"
        libelleConfirmation="Clôturer et calculer"
        champs={{ formationExterneId, je }}
        action={async (fd) => {
          await lancerAction(() => cloturerFormationExterne(fd));
        }}
        message={
          <div className="grid gap-3">
            <p>
              Les niveaux de chaque participant seront recalculés avec la méthode standardisée de Cursus (test interne, évaluation
              du formateur, auto-évaluation finale). La formation ne sera plus modifiable.
            </p>
            {avertissements.length ? (
              <ul className="grid gap-1.5 rounded-xl bg-warning-soft px-3 py-2.5 text-[13px] text-foreground">
                {avertissements.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
          </div>
        }
      >
        <Calculator size={15} aria-hidden /> Clôturer et calculer
      </BoutonConfirme>
    </div>
  );
}
