"use client";

import { useActionState, useRef } from "react";
import { NotebookPen, UserRoundCog } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Groupe, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EtatVide } from "@/components/ui/etat-vide";
import { formaterDate } from "@/lib/utils";
import type { Resultat } from "@/lib/resultat";
import { ajouterNoteSuivi, attribuerChargeSuivi } from "@/server/actions/admin-suivi";
import { useRetourAction } from "./retour-action";

export type NoteVue = {
  id: string;
  contenu: string;
  creeLe: Date;
  auteur: string;
  auteurPhoto: string | null;
};

const VIDE: Resultat = { ok: false };

/** Attribution du référent : réservée au équipe pédagogique. */
export function AttributionCharge({
  jeId,
  chargeActuelId,
  charges,
}: {
  jeId: string;
  chargeActuelId: string | null;
  charges: { id: string; prenom: string; nom: string }[];
}) {
  const [etat, action] = useActionState(
    async (_: Resultat, formData: FormData) => attribuerChargeSuivi(formData),
    VIDE
  );
  useRetourAction(etat);

  return (
    <Carte>
      <EnteteCarte
        titre="Chargé de suivi"
        description="La personne de la plateforme qui suit cette organisation et tient son carnet."
      />
      <CorpsCarte>
        <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="jeId" value={jeId} />
          <Groupe id="chargeId" label="Référent">
            <Selecteur id="chargeId" name="chargeId" defaultValue={chargeActuelId ?? ""}>
              <option value="">Personne</option>
              {charges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}
                </option>
              ))}
            </Selecteur>
          </Groupe>
          <BoutonSoumission enCours="Enregistrement…">Enregistrer le référent</BoutonSoumission>
        </form>
      </CorpsCarte>
    </Carte>
  );
}

/** Carnet de suivi : notes datées, la plus récente en premier. */
export function CarnetSuivi({
  jeId,
  notes,
  peutEcrire,
}: {
  jeId: string;
  notes: NoteVue[];
  peutEcrire: boolean;
}) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [etat, action] = useActionState(async (_: Resultat, formData: FormData) => ajouterNoteSuivi(formData), VIDE);
  useRetourAction(etat, { onSucces: () => formulaire.current?.reset() });

  return (
    <Carte>
      <EnteteCarte
        titre="Carnet de suivi"
        description="Ce que les chiffres ne disent pas : passation de bureau, période d'examens, relance faite. Les notes restent après le changement de mandat."
      />
      <CorpsCarte className="space-y-5">
        {peutEcrire ? (
          <form ref={formulaire} action={action} className="space-y-3">
            <input type="hidden" name="jeId" value={jeId} />
            <Groupe
              id="contenu"
              label="Nouvelle note"
              aide="Datée automatiquement et signée de votre nom."
              erreur={etat.erreurs?.contenu}
            >
              <ZoneTexte
                id="contenu"
                name="contenu"
                rows={3}
                maxLength={2000}
                placeholder="Appel avec la présidente : le bureau change bientôt, relance prévue après la passation."
              />
            </Groupe>
            <BoutonSoumission enCours="Enregistrement…">Ajouter la note</BoutonSoumission>
          </form>
        ) : null}

        {notes.length === 0 ? (
          <EtatVide
            icone={<NotebookPen size={22} />}
            titre="Carnet vide"
            description={
              peutEcrire
                ? "Écrivez la première note après votre prochain échange avec cette organisation."
                : "Le chargé de suivi de cette organisation n'a pas encore écrit de note."
            }
          />
        ) : (
          <ol className="space-y-4">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <Avatar nom={n.auteur} photo={n.auteurPhoto} taille="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-bold">{n.auteur}</span>{" "}
                    <span className="text-muted-foreground">· {formaterDate(n.creeLe)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.contenu}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CorpsCarte>
    </Carte>
  );
}

export const IconeAttribution = UserRoundCog;
