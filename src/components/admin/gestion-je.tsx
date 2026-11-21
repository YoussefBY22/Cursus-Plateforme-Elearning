"use client";

import { useActionState, useState } from "react";
import { Building2, CheckCircle2, MapPin, Pencil, Plus, Power, UserCog, Users } from "lucide-react";
import { couleurLisible } from "@/components/graphiques/couleurs";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { CaseACocher, Champ, Groupe } from "@/components/ui/champ";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { Dialogue } from "@/components/ui/dialogue";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import type { Resultat } from "@/lib/resultat";
import { cn, slugifier } from "@/lib/utils";
import { changerActivationJE, enregistrerJE } from "@/server/actions/admin-je";
import { ChoixCouleur } from "./choix-couleur";
import { lancerAction, useRetourAction } from "./retour-action";

export type CarteJE = {
  id: string;
  nom: string;
  slug: string;
  sigle: string | null;
  ville: string | null;
  ecole: string | null;
  couleur: string;
  active: boolean;
  membres: number;
  enAttente: number;
  rh: { id: string; nom: string }[];
  terminees: number;
};

export function GestionJE({ jes }: { jes: CarteJE[] }) {
  // `cle` force un formulaire neuf à chaque ouverture (valeurs par défaut fraîches).
  const [edition, setEdition] = useState<{ je: CarteJE | null; cle: number } | null>(null);
  const ouvrir = (je: CarteJE | null) => setEdition({ je, cle: Date.now() });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Bouton onClick={() => ouvrir(null)}>
          <Plus size={16} /> Ajouter une organisation
        </Bouton>
      </div>

      {jes.length === 0 ? (
        <EtatVide
          icone={<Building2 className="h-6 w-6" />}
          titre="Aucune organisation"
          description="Ajoutez la première organisation de la plateforme : ses membres pourront la choisir à l'inscription."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jes.map((je) => (
            <li
              key={je.id}
              className={cn("flex flex-col overflow-hidden rounded-2xl border border-border bg-card", !je.active && "opacity-75")}
            >
              <div className="h-1.5" style={{ background: couleurLisible(je.couleur) }} aria-hidden />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold text-white"
                    style={{ background: je.couleur }}
                    aria-hidden
                  >
                    {(je.sigle ?? je.nom).slice(0, 3).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold" title={je.nom}>
                      {je.nom}
                    </p>
                    <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
                      <MapPin size={12} aria-hidden className="shrink-0" />
                      {[je.ville, je.ecole].filter(Boolean).join(" · ") || "Ville et école non renseignées"}
                    </p>
                  </div>
                  {je.active ? null : <Pastille ton="danger">Désactivée</Pastille>}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users size={12} aria-hidden /> Membres actifs
                    </dt>
                    <dd className="chiffres text-lg font-extrabold">
                      {je.membres}
                      {je.enAttente > 0 ? (
                        <span className="ml-1.5 text-xs font-semibold text-warning">{je.enAttente} en attente</span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 size={12} aria-hidden /> Formations terminées
                    </dt>
                    <dd className="chiffres text-lg font-extrabold">{je.terminees}</dd>
                  </div>
                </dl>

                <p className="mt-3 flex items-start gap-1.5 text-[13px]">
                  <UserCog size={14} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  {je.rh.length ? (
                    <span>
                      <span className="text-muted-foreground">RH : </span>
                      {je.rh.map((r) => r.nom).join(", ")}
                    </span>
                  ) : (
                    <span className="text-warning">Aucun responsable RH : attribuez le rôle depuis « Membres et rôles ».</span>
                  )}
                </p>

                <div className="mt-auto flex flex-wrap justify-end gap-2 pt-4">
                  <BoutonConfirme
                    variante={je.active ? "fantome" : "succes"}
                    taille="sm"
                    titre={je.active ? "Désactiver l'organisation" : "Réactiver l'organisation"}
                    libelleConfirmation={je.active ? "Désactiver" : "Réactiver"}
                    message={
                      je.active
                        ? `${je.nom} disparaîtra de la liste d'inscription et du pilotage. Ses membres gardent leur compte, leurs compétences et leurs certificats.`
                        : `${je.nom} sera de nouveau proposée à l'inscription et suivie dans le pilotage.`
                    }
                    champs={{ id: je.id, active: je.active ? "false" : "true" }}
                    action={async (fd) => {
                      await lancerAction(() => changerActivationJE(fd));
                    }}
                  >
                    <Power size={14} /> {je.active ? "Désactiver" : "Réactiver"}
                  </BoutonConfirme>
                  <Bouton variante="contour" taille="sm" onClick={() => ouvrir(je)}>
                    <Pencil size={14} /> Modifier
                  </Bouton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialogue
        ouvert={edition !== null}
        onFermer={() => setEdition(null)}
        titre={edition?.je ? `Modifier ${edition.je.sigle ?? edition.je.nom}` : "Nouvelle organisation"}
        description="Le nom et la couleur apparaissent dans l'annuaire, les profils et le pilotage."
        className="max-w-xl"
      >
        {edition ? <FormulaireJE key={edition.cle} je={edition.je} onTermine={() => setEdition(null)} /> : null}
      </Dialogue>
    </>
  );
}

function FormulaireJE({ je, onTermine }: { je: CarteJE | null; onTermine: () => void }) {
  const [etat, action] = useActionState<Resultat<{ id: string }>, FormData>(enregistrerJE, {});
  useRetourAction(etat, { onSucces: onTermine });
  const e = etat.erreurs ?? {};
  const [nom, setNom] = useState(je?.nom ?? "");
  const [slug, setSlug] = useState(je?.slug ?? "");
  const [slugManuel, setSlugManuel] = useState(!!je);
  const [couleur, setCouleur] = useState(je?.couleur ?? "#0f1226");

  return (
    <form action={action} className="grid gap-4" noValidate>
      {je ? <input type="hidden" name="id" value={je.id} /> : null}
      <Groupe id="je-nom" label="Nom complet" erreur={e.nom}>
        <Champ
          id="je-nom"
          name="nom"
          value={nom}
          onChange={(ev) => {
            setNom(ev.target.value);
            if (!slugManuel) setSlug(slugifier(ev.target.value));
          }}
          required
          maxLength={120}
          aria-invalid={!!e.nom}
          placeholder="Aurora Conseil"
        />
      </Groupe>
      <div className="grid gap-4 sm:grid-cols-2">
        <Groupe id="je-sigle" label="Sigle" erreur={e.sigle} aide="Affiché quand la place manque.">
          <Champ id="je-sigle" name="sigle" defaultValue={je?.sigle ?? ""} maxLength={16} placeholder="IJE" />
        </Groupe>
        <Groupe id="je-slug" label="Adresse (slug)" erreur={e.slug} aide={slugManuel ? "Saisie manuelle." : "Déduite du nom."}>
          <Champ
            id="je-slug"
            name="slug"
            value={slug}
            onChange={(ev) => {
              setSlugManuel(true);
              setSlug(ev.target.value.toLowerCase());
            }}
            maxLength={80}
            spellCheck={false}
            aria-invalid={!!e.slug}
          />
        </Groupe>
        <Groupe id="je-ville" label="Ville" erreur={e.ville}>
          <Champ id="je-ville" name="ville" defaultValue={je?.ville ?? ""} maxLength={80} placeholder="Lyon" />
        </Groupe>
        <Groupe id="je-ecole" label="École" erreur={e.ecole}>
          <Champ id="je-ecole" name="ecole" defaultValue={je?.ecole ?? ""} maxLength={120} placeholder="ESPRIT" />
        </Groupe>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold">Couleur</p>
        <ChoixCouleur id="je-couleur" name="couleur" valeur={couleur} onChange={setCouleur} erreur={e.couleur} />
      </div>
      <CaseACocher
        name="active"
        defaultChecked={je?.active ?? true}
        label="Organisation active"
        description="Proposée à l'inscription et suivie dans le pilotage."
      />
      {etat.erreur ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {etat.erreur}
        </p>
      ) : null}
      <div className="mt-2 flex justify-end gap-2">
        <Bouton variante="contour" onClick={onTermine}>
          Annuler
        </Bouton>
        <BoutonSoumission enCours="Enregistrement…">{je ? "Enregistrer l'organisation" : "Créer l'organisation"}</BoutonSoumission>
      </div>
    </form>
  );
}
