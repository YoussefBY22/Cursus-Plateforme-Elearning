"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Champ, Groupe, Selecteur } from "@/components/ui/champ";
import { Dialogue } from "@/components/ui/dialogue";
import type { Resultat } from "@/lib/resultat";
import { cn } from "@/lib/utils";
import { creerFormation, creerParcours } from "@/server/actions/studio";
import { useRetourAction } from "@/components/admin/retour-action";

/**
 * Création d'un contenu : un titre, un domaine, et on ouvre l'éditeur.
 *
 * Demander le strict minimum ici est volontaire — le reste se remplit dans
 * l'éditeur, où l'on voit la vidéo et les questions côte à côte.
 */
export function Creation({ domaines }: { domaines: { id: string; nom: string }[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState<"formation" | "parcours">("formation");

  return (
    <>
      <Bouton onClick={() => setOuvert(true)} taille="lg">
        <Plus className="h-4 w-4" aria-hidden />
        Créer un contenu
      </Bouton>
      <Dialogue
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        titre="Nouveau contenu"
        description="Vous pourrez tout modifier ensuite : ce brouillon n'est visible que de vous."
      >
        <div className="mb-4 flex gap-1.5" role="radiogroup" aria-label="Type de contenu">
          {(
            [
              ["formation", "Formation", "Une vidéo et ses quiz"],
              ["parcours", "Parcours certifiant", "Plusieurs formations, un certificat"],
            ] as const
          ).map(([v, libelle, aide]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={type === v}
              onClick={() => setType(v)}
              className={cn(
                "flex-1 rounded-xl border p-3 text-left transition-colors",
                type === v ? "border-foreground bg-muted" : "border-border hover:bg-muted/60"
              )}
            >
              <span className="block text-[13px] font-semibold">{libelle}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{aide}</span>
            </button>
          ))}
        </div>
        <Formulaire key={type} type={type} domaines={domaines} onAnnuler={() => setOuvert(false)} />
      </Dialogue>
    </>
  );
}

function Formulaire({
  type,
  domaines,
  onAnnuler,
}: {
  type: "formation" | "parcours";
  domaines: { id: string; nom: string }[];
  onAnnuler: () => void;
}) {
  const router = useRouter();
  const action = type === "formation" ? creerFormation : creerParcours;
  const [etat, envoyer] = useActionState<Resultat<{ id: string }>, FormData>(action, {});
  useRetourAction(etat);

  useEffect(() => {
    if (etat.ok && etat.donnees) {
      router.push(`/studio/${type === "formation" ? "formations" : "parcours"}/${etat.donnees.id}`);
    }
  }, [etat, router, type]);

  return (
    <form action={envoyer} className="space-y-4">
      <Groupe
        id="titre"
        label={type === "formation" ? "Titre de la formation" : "Titre du parcours"}
        aide="Ce que l'apprenant lira dans le catalogue. Modifiable."
        erreur={etat.erreurs?.titre}
      >
        <Champ
          id="titre"
          name="titre"
          required
          maxLength={140}
          autoFocus
          placeholder={type === "formation" ? "Tenir la trésorerie d'une organisation" : "Reprendre la trésorerie de A à Z"}
        />
      </Groupe>
      <Groupe id="domaineId" label="Domaine" aide="Il détermine les compétences disponibles." erreur={etat.erreurs?.domaineId}>
        <Selecteur id="domaineId" name="domaineId" required defaultValue="">
          <option value="" disabled>
            Choisir un domaine
          </option>
          {domaines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nom}
            </option>
          ))}
        </Selecteur>
      </Groupe>
      <div className="flex flex-wrap items-center gap-2">
        <BoutonSoumission enCours="Création…">Créer le brouillon</BoutonSoumission>
        <Bouton type="button" variante="fantome" onClick={onAnnuler}>
          Annuler
        </Bouton>
      </div>
    </form>
  );
}
