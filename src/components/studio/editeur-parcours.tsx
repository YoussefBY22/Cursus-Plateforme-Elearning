"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Award, Check, ExternalLink, Plus, Send, Target, X } from "lucide-react";
import { Bouton, LienBouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { Champ, Groupe, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { Pastille } from "@/components/ui/pastille";
import type { Resultat } from "@/lib/resultat";
import { cn } from "@/lib/utils";
import { enregistrerParcours, soumettreParcours } from "@/server/actions/studio";
import type { OptionsStudio, ParcoursEdition } from "@/server/requetes/studio";
import { LIBELLES_STATUT, TONS_STATUT, estStatutContenu, manquesParcours, modifiable, type StatutContenu } from "@/services/studio";
import { formaterDuree } from "@/services/visionnage";
import { lancerAction, useRetourAction } from "@/components/admin/retour-action";

type Etape = { formationId: string; titre: string | null; formationTitre: string; formationStatut: string; dureeSec: number };

/**
 * Éditeur d'un parcours certifiant.
 *
 * Le parcours n'est qu'un ordre : ce qui compte est la suite des étapes, et
 * le certificat au bout. L'ordre se règle à la main plutôt qu'au glisser-
 * déposer — deux boutons marchent au clavier et sur mobile, le glisser non.
 */
export function EditeurParcours({ parcours, options }: { parcours: ParcoursEdition; options: OptionsStudio }) {
  const router = useRouter();

  const [titre, setTitre] = React.useState(parcours.titre);
  const [sousTitre, setSousTitre] = React.useState(parcours.sousTitre ?? "");
  const [description, setDescription] = React.useState(parcours.description);
  const [imageUrl, setImageUrl] = React.useState(parcours.imageUrl ?? "");
  const [domaineId, setDomaineId] = React.useState(parcours.domaineId);
  const [modeleId, setModeleId] = React.useState(parcours.modeleCertificatId ?? "");
  const [intitule, setIntitule] = React.useState(parcours.intituleCertificat ?? "");
  const [etapes, setEtapes] = React.useState<Etape[]>(
    parcours.etapes.map((e) => ({
      formationId: e.formationId,
      titre: e.titre,
      formationTitre: e.formationTitre,
      formationStatut: e.formationStatut,
      dureeSec: e.dureeSec,
    }))
  );
  const [ajout, setAjout] = React.useState("");

  const formulaire = React.useRef<HTMLFormElement>(null);
  const [etat, envoyer] = useActionState<Resultat, FormData>(enregistrerParcours, {});
  const [enSoumission, demarrerSoumission] = React.useTransition();
  const [manquesServeur, setManquesServeur] = React.useState<string[] | null>(null);
  useRetourAction(etat);

  const statut = estStatutContenu(parcours.statut) ? parcours.statut : "BROUILLON";
  const editable = modifiable(statut);

  const manques = React.useMemo(
    () =>
      manquesParcours({
        titre,
        description,
        etapes: etapes.map((e) => ({ formationStatut: e.formationStatut as StatutContenu })),
      }),
    [titre, description, etapes]
  );

  const disponibles = parcours.disponibles.filter((d) => !etapes.some((e) => e.formationId === d.id));
  const total = etapes.reduce((s, e) => s + e.dureeSec, 0);

  // Enregistrer puis soumettre, dans cet ordre.
  function enregistrerPuisSoumettre() {
    const form = formulaire.current;
    if (!form) return;
    const donnees = new FormData(form);
    demarrerSoumission(async () => {
      const sauvegarde = await lancerAction(() => enregistrerParcours({}, donnees));
      if (!sauvegarde.ok) return;
      const r = await lancerAction(() => soumettreParcours(parcours.id));
      setManquesServeur(r.donnees?.manques?.length ? r.donnees.manques : null);
      router.refresh();
    });
  }

  function deplacer(i: number, sens: -1 | 1) {
    const j = i + sens;
    if (j < 0 || j >= etapes.length) return;
    const copie = [...etapes];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    setEtapes(copie);
  }

  return (
    <form ref={formulaire} action={envoyer} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <input type="hidden" name="id" value={parcours.id} />
      <input
        type="hidden"
        name="etapes"
        value={JSON.stringify(etapes.map((e) => ({ formationId: e.formationId, titre: e.titre })))}
      />

      <div className="min-w-0 space-y-5">
        <Carte>
          <EnteteCarte titre="Présentation" description="Ce que l'apprenant lit avant de s'engager." />
          <CorpsCarte className="space-y-4 pt-0">
            <Groupe id="titre" label="Titre" erreur={etat.erreurs?.titre}>
              <Champ id="titre" name="titre" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={140} disabled={!editable} />
            </Groupe>
            <Groupe id="sousTitre" label="Sous-titre" aide="Facultatif. Une accroche courte." erreur={etat.erreurs?.sousTitre}>
              <Champ
                id="sousTitre"
                name="sousTitre"
                value={sousTitre}
                onChange={(e) => setSousTitre(e.target.value)}
                maxLength={200}
                disabled={!editable}
              />
            </Groupe>
            <Groupe id="description" label="Description" erreur={etat.erreurs?.description}>
              <ZoneTexte
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={6000}
                rows={6}
                disabled={!editable}
              />
            </Groupe>
            <div className="grid gap-4 sm:grid-cols-2">
              <Groupe id="domaineId" label="Domaine" erreur={etat.erreurs?.domaineId}>
                <Selecteur id="domaineId" name="domaineId" value={domaineId} onChange={(e) => setDomaineId(e.target.value)} disabled={!editable}>
                  {options.domaines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </Selecteur>
              </Groupe>
              <Groupe id="imageUrl" label="Image de couverture" aide="Facultatif." erreur={etat.erreurs?.imageUrl}>
                <Champ
                  id="imageUrl"
                  name="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  maxLength={500}
                  disabled={!editable}
                />
              </Groupe>
            </div>
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte
            titre="Les étapes"
            description={
              etapes.length
                ? `${etapes.length} étapes · ${formaterDuree(total)} de vidéo au total`
                : "Dans l'ordre où l'apprenant les suivra."
            }
          />
          <CorpsCarte className="space-y-4 pt-0">
            {etat.erreurs?.etapes ? (
              <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
                {etat.erreurs.etapes}
              </p>
            ) : null}

            {etapes.length ? (
              <ol className="space-y-2">
                {etapes.map((e, i) => (
                  <li key={e.formationId} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nuit text-xs font-bold text-white tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-40 flex-1">
                      <span className="block text-[13px] font-semibold">{e.formationTitre}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formaterDuree(e.dureeSec)}
                        {e.formationStatut !== "PUBLIE" ? " · formation non publiée" : ""}
                      </span>
                    </span>
                    {e.formationStatut !== "PUBLIE" ? <Pastille ton="alerte">À publier</Pastille> : null}
                    <span className="flex items-center gap-1">
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="icone"
                        disabled={!editable || i === 0}
                        onClick={() => deplacer(i, -1)}
                        aria-label={`Monter ${e.formationTitre}`}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </Bouton>
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="icone"
                        disabled={!editable || i === etapes.length - 1}
                        onClick={() => deplacer(i, 1)}
                        aria-label={`Descendre ${e.formationTitre}`}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </Bouton>
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="icone"
                        disabled={!editable}
                        onClick={() => setEtapes(etapes.filter((x) => x.formationId !== e.formationId))}
                        aria-label={`Retirer ${e.formationTitre}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Bouton>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-[13px] text-muted-foreground">
                Aucune étape. Ajoutez au moins deux formations publiées.
              </p>
            )}

            {editable ? (
              <div className="flex flex-wrap gap-2">
                <Selecteur
                  value={ajout}
                  onChange={(e) => setAjout(e.target.value)}
                  aria-label="Formation à ajouter"
                  className="min-w-48 flex-1"
                  disabled={disponibles.length === 0}
                >
                  <option value="">
                    {disponibles.length ? "Choisir une formation…" : "Aucune autre formation disponible"}
                  </option>
                  {disponibles.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.titre}
                      {d.statut !== "PUBLIE" ? " (non publiée)" : ""}
                    </option>
                  ))}
                </Selecteur>
                <Bouton
                  type="button"
                  variante="contour"
                  disabled={!ajout}
                  onClick={() => {
                    const f = disponibles.find((d) => d.id === ajout);
                    if (!f) return;
                    setEtapes([
                      ...etapes,
                      { formationId: f.id, titre: null, formationTitre: f.titre, formationStatut: f.statut, dureeSec: f.dureeSec },
                    ]);
                    setAjout("");
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter l&apos;étape
                </Bouton>
              </div>
            ) : null}
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte
            titre="Certificat"
            description="Délivré automatiquement quand toutes les étapes sont terminées."
          />
          <CorpsCarte className="grid gap-4 pt-0 sm:grid-cols-2">
            <Groupe id="modeleCertificatId" label="Modèle" aide="Les modèles se dessinent dans l'administration." erreur={etat.erreurs?.modeleCertificatId}>
              <Selecteur
                id="modeleCertificatId"
                name="modeleCertificatId"
                value={modeleId}
                onChange={(e) => setModeleId(e.target.value)}
                disabled={!editable}
              >
                <option value="">Modèle par défaut</option>
                {options.modeles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                    {m.parDefaut ? " (par défaut)" : ""}
                  </option>
                ))}
              </Selecteur>
            </Groupe>
            <Groupe
              id="intituleCertificat"
              label="Intitulé imprimé"
              aide="Vous pouvez écrire {{apprenant}} et {{parcours}}."
              erreur={etat.erreurs?.intituleCertificat}
            >
              <Champ
                id="intituleCertificat"
                name="intituleCertificat"
                value={intitule}
                onChange={(e) => setIntitule(e.target.value)}
                placeholder="a suivi le parcours {{parcours}}"
                maxLength={300}
                disabled={!editable}
              />
            </Groupe>
          </CorpsCarte>
        </Carte>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Carte>
          <CorpsCarte className="space-y-3 pt-5">
            <Pastille ton={TONS_STATUT[statut]}>{LIBELLES_STATUT[statut]}</Pastille>

            {statut === "REFUSE" && parcours.motifRefus ? (
              <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] leading-relaxed text-danger">
                <strong className="font-semibold">À corriger :</strong> {parcours.motifRefus}
              </p>
            ) : null}

            {!editable ? (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {statut === "EN_VALIDATION"
                  ? "Ce parcours est en validation. Il se rouvre dès qu'une décision est rendue."
                  : "Ce parcours est archivé. Demandez sa republication à un administrateur."}
              </p>
            ) : (
              <>
                <BoutonSoumission className="w-full" enCours="Enregistrement…">
                  Enregistrer
                </BoutonSoumission>
                <button
                  type="button"
                  onClick={enregistrerPuisSoumettre}
                  disabled={manques.length > 0 || enSoumission}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold",
                    "transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <Send className="h-4 w-4" aria-hidden />
                  {enSoumission ? "Envoi…" : statut === "PUBLIE" ? "Republier" : "Soumettre à la validation"}
                </button>
              </>
            )}

            {statut === "PUBLIE" ? (
              <LienBouton href={`/parcours/${parcours.slug}`} variante="fantome" className="w-full">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Voir la page publique
              </LienBouton>
            ) : null}
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre={manques.length ? "Avant de publier" : "Prêt à publier"} />
          <CorpsCarte className="pt-0">
            {manques.length === 0 ? (
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-success">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Les étapes sont publiées et la présentation est complète.
              </p>
            ) : (
              <ul className="space-y-2">
                {manques.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                    {m}
                  </li>
                ))}
              </ul>
            )}
            {manquesServeur ? (
              <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
                Le serveur a refusé la soumission : {manquesServeur[0]}
              </p>
            ) : null}
          </CorpsCarte>
        </Carte>

        <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
          <Award className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Le certificat porte un code de vérification unique, consultable publiquement et révocable.
        </p>
      </aside>
    </form>
  );
}
