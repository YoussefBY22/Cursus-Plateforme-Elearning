"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Bouton, type BoutonProps } from "@/components/ui/bouton";
import { Champ, Groupe, Selecteur } from "@/components/ui/champ";
import { Dialogue } from "@/components/ui/dialogue";
import { toast } from "@/components/ui/toasts";
import { creerModele } from "@/server/actions/certificats";

export type SourceModele = { id: string; nom: string; parDefaut: boolean };

/**
 * Créer un modèle = dupliquer un modèle existant (le modèle par défaut est
 * proposé d'office) : on part toujours d'une page déjà composée et conforme
 * au cadre commun, jamais d'une feuille blanche.
 */
export function BoutonCreationModele({
  sources,
  sourceInitiale,
  libelle = "Créer un modèle",
  icone = "plus",
  ...props
}: Omit<BoutonProps, "onClick"> & {
  sources: SourceModele[];
  sourceInitiale?: string;
  libelle?: string;
  icone?: "plus" | "copie";
}) {
  const router = useRouter();
  const defaut = sourceInitiale ?? sources.find((s) => s.parDefaut)?.id ?? sources[0]?.id ?? "";
  const [ouvert, setOuvert] = useState(false);
  const [sourceId, setSourceId] = useState(defaut);
  const [nom, setNom] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [enCours, demarrer] = useTransition();

  function ouvrir() {
    const source = sources.find((s) => s.id === defaut);
    setSourceId(defaut);
    setNom(sourceInitiale && source ? `Copie de ${source.nom}`.slice(0, 80) : "");
    setErreurs({});
    setOuvert(true);
  }

  function valider(e: React.FormEvent) {
    e.preventDefault();
    if (nom.trim().length < 3) {
      setErreurs({ nom: "Nom trop court (3 caractères au moins)." });
      return;
    }
    demarrer(async () => {
      const r = await creerModele({ sourceId, nom });
      if (r.ok && r.donnees) {
        toast({ titre: "Modèle créé", description: "Composez-le maintenant : chaque modification s'enregistre seule.", ton: "succes" });
        setOuvert(false);
        router.push(`/admin/certificats/modeles/${r.donnees.id}`);
      } else {
        setErreurs(r.erreurs ?? {});
        if (r.erreur) toast({ titre: "Création impossible", description: r.erreur, ton: "erreur" });
      }
    });
  }

  return (
    <>
      <Bouton {...props} onClick={ouvrir} disabled={!sources.length || props.disabled}>
        {icone === "plus" ? <Plus className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {libelle}
      </Bouton>
      <Dialogue
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        titre={sourceInitiale ? "Dupliquer le modèle" : "Créer un modèle"}
        description="Le nouveau modèle reprend la mise en page, la couleur et les images du modèle de départ."
      >
        <form onSubmit={valider} className="grid gap-4">
          <Groupe id="creation-source" label="Modèle de départ">
            <Selecteur id="creation-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                  {s.parDefaut ? " (par défaut)" : ""}
                </option>
              ))}
            </Selecteur>
          </Groupe>
          <Groupe id="creation-nom" label="Nom du nouveau modèle" erreur={erreurs.nom} aide="Par exemple : « Digital — violet ».">
            <Champ
              id="creation-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              maxLength={80}
              autoFocus
              aria-invalid={!!erreurs.nom}
              aria-describedby={erreurs.nom ? "creation-nom-erreur" : undefined}
            />
          </Groupe>
          <div className="mt-2 flex justify-end gap-2">
            <Bouton variante="contour" onClick={() => setOuvert(false)}>
              Annuler
            </Bouton>
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Création…" : "Créer et composer"}
            </Bouton>
          </div>
        </form>
      </Dialogue>
    </>
  );
}
