"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Plus, Send, Target, Trash2, X } from "lucide-react";
import { Bouton, LienBouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { CaseACocher, Champ, Groupe, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { Pastille } from "@/components/ui/pastille";
import type { Resultat } from "@/lib/resultat";
import { cn } from "@/lib/utils";
import { enregistrerFormation, soumettreFormation } from "@/server/actions/studio";
import type { FormationEdition, OptionsStudio } from "@/server/requetes/studio";
import { NIVEAUX } from "@/services/catalogue";
import { LIBELLES_STATUT, TONS_STATUT, estStatutContenu, manquesFormation, modifiable } from "@/services/studio";
import { lancerAction, useRetourAction } from "@/components/admin/retour-action";
import { SequenceVideo, type PointBrouillon } from "./sequence-video";
import { cleBrouillon } from "./editeur-question";

type Onglet = "fiche" | "sequence" | "competences";

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "fiche", libelle: "Fiche" },
  { cle: "sequence", libelle: "Vidéo et quiz" },
  { cle: "competences", libelle: "Compétences" },
];

/**
 * Éditeur d'une formation.
 *
 * Le panneau de droite reste la boussole : état du contenu, ce qui manque
 * encore, et le bouton de publication. La liste des manques est calculée en
 * direct avec la même fonction que le serveur — impossible d'y lire autre
 * chose que ce qui bloquera vraiment.
 */
export function EditeurFormation({ formation, options }: { formation: FormationEdition; options: OptionsStudio }) {
  const router = useRouter();
  const [onglet, setOnglet] = React.useState<Onglet>("fiche");

  const [titre, setTitre] = React.useState(formation.titre);
  const [resume, setResume] = React.useState(formation.resume);
  const [description, setDescription] = React.useState(formation.description);
  const [objectifs, setObjectifs] = React.useState<string[]>(formation.objectifs.length ? formation.objectifs : [""]);
  const [tags, setTags] = React.useState<string[]>(formation.tags);
  const [domaineId, setDomaineId] = React.useState(formation.domaineId);
  const [niveau, setNiveau] = React.useState(formation.niveau);
  const [imageUrl, setImageUrl] = React.useState(formation.imageUrl ?? "");
  const [formateurId, setFormateurId] = React.useState(formation.formateurId ?? "");
  const [visibleCatalogue, setVisibleCatalogue] = React.useState(formation.visibleCatalogue);
  const [fournisseur, setFournisseur] = React.useState(formation.fournisseurVideo);
  const [reference, setReference] = React.useState(formation.referenceVideo);
  const [dureeSec, setDureeSec] = React.useState(formation.dureeSec);
  const [choisies, setChoisies] = React.useState<{ competenceId: string; poids: number }[]>(formation.competences);
  const [points, setPoints] = React.useState<PointBrouillon[]>(() =>
    formation.points.map((p) => ({
      id: p.id,
      type: p.type,
      tempsSec: p.tempsSec,
      titre: p.titre,
      questions: p.questions.map((q) => ({
        id: q.id,
        type: q.type,
        enonce: q.enonce,
        explication: q.explication,
        competenceId: q.competenceId,
        options: q.options.map((o) => ({ id: o.id || cleBrouillon(), texte: o.texte, correcte: o.correcte })),
      })),
    }))
  );

  const formulaire = React.useRef<HTMLFormElement>(null);
  const [etat, envoyer] = useActionState<Resultat, FormData>(enregistrerFormation, {});
  const [enSoumission, demarrerSoumission] = React.useTransition();
  const [manquesServeur, setManquesServeur] = React.useState<string[] | null>(null);
  useRetourAction(etat);

  const statut = estStatutContenu(formation.statut) ? formation.statut : "BROUILLON";
  const editable = modifiable(statut);

  const competencesDuDomaine = options.competences.filter((c) => c.domaineId === domaineId);
  const competencesChoisies = choisies
    .map((c) => ({ ...c, nom: options.competences.find((x) => x.id === c.competenceId)?.nom ?? "" }))
    .filter((c) => c.nom);

  const manques = React.useMemo(
    () =>
      manquesFormation({
        titre,
        resume,
        description,
        objectifs,
        referenceVideo: reference,
        dureeSec,
        competences: choisies.map((c) => ({ id: c.competenceId })),
        points: points.map((p) => ({
          type: p.type,
          tempsSec: p.tempsSec,
          questions: p.questions.map((q) => ({ enonce: q.enonce, type: q.type, options: q.options })),
        })),
      }),
    [titre, resume, description, objectifs, reference, dureeSec, choisies, points]
  );

  // Enregistrer puis soumettre, dans cet ordre : le serveur juge le contenu
  // réellement enregistré, jamais l'état du navigateur.
  function enregistrerPuisSoumettre() {
    const form = formulaire.current;
    if (!form) return;
    const donnees = new FormData(form);
    demarrerSoumission(async () => {
      const sauvegarde = await lancerAction(() => enregistrerFormation({}, donnees));
      if (!sauvegarde.ok) return;
      const r = await lancerAction(() => soumettreFormation(formation.id));
      setManquesServeur(r.donnees?.manques?.length ? r.donnees.manques : null);
      router.refresh();
    });
  }

  return (
    <form ref={formulaire} action={envoyer} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <input type="hidden" name="id" value={formation.id} />
      <input type="hidden" name="objectifs" value={JSON.stringify(objectifs.filter((o) => o.trim()))} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="competences" value={JSON.stringify(choisies)} />
      <input
        type="hidden"
        name="points"
        value={JSON.stringify(
          points.map((p) => ({
            type: p.type,
            tempsSec: p.type === "FINAL" ? null : (p.tempsSec ?? 0),
            titre: p.titre,
            questions: p.questions.map((q) => ({
              type: q.type,
              enonce: q.enonce,
              explication: q.explication,
              competenceId: q.competenceId,
              options: q.options,
            })),
          }))
        )}
      />
      <input type="hidden" name="fournisseurVideo" value={fournisseur} />
      <input type="hidden" name="dureeSec" value={dureeSec} />

      <div className="min-w-0">
        <div className="mb-5 flex gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Sections de la formation">
          {ONGLETS.map((o) => (
            <button
              key={o.cle}
              type="button"
              role="tab"
              aria-selected={onglet === o.cle}
              onClick={() => setOnglet(o.cle)}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors",
                onglet === o.cle ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.libelle}
            </button>
          ))}
        </div>

        <div hidden={onglet !== "fiche"} className="space-y-5">
          <Carte>
            <EnteteCarte titre="Ce que l'apprenant voit" description="Titre, résumé et objectifs s'affichent au catalogue." />
            <CorpsCarte className="space-y-4 pt-0">
              <Groupe id="titre" label="Titre" erreur={etat.erreurs?.titre}>
                <Champ id="titre" name="titre" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={140} disabled={!editable} />
              </Groupe>
              <Groupe
                id="resume"
                label="Résumé"
                aide="Une ou deux phrases. C'est ce qui décide un apprenant à cliquer."
                erreur={etat.erreurs?.resume}
              >
                <ZoneTexte
                  id="resume"
                  name="resume"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  maxLength={400}
                  rows={2}
                  disabled={!editable}
                />
              </Groupe>
              <Groupe id="description" label="Description" aide="Le détail du contenu, pour qui veut savoir avant de commencer." erreur={etat.erreurs?.description}>
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

              <fieldset>
                <legend className="mb-1.5 text-[13px] font-semibold">
                  Objectifs
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    « À la fin, je sais… ». Deux au minimum.
                  </span>
                </legend>
                <ul className="space-y-2">
                  {objectifs.map((o, i) => (
                    <li key={i} className="flex gap-2">
                      <Champ
                        value={o}
                        onChange={(e) => setObjectifs(objectifs.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={i === 0 ? "Enregistrer une opération de caisse" : "Objectif suivant"}
                        maxLength={200}
                        disabled={!editable}
                        aria-label={`Objectif ${i + 1}`}
                      />
                      {objectifs.length > 1 ? (
                        <Bouton
                          type="button"
                          variante="fantome"
                          taille="icone"
                          onClick={() => setObjectifs(objectifs.filter((_, j) => j !== i))}
                          aria-label={`Retirer l'objectif ${i + 1}`}
                          disabled={!editable}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Bouton>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {objectifs.length < 10 ? (
                  <Bouton
                    type="button"
                    variante="fantome"
                    taille="sm"
                    className="mt-2"
                    onClick={() => setObjectifs([...objectifs, ""])}
                    disabled={!editable}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Ajouter un objectif
                  </Bouton>
                ) : null}
              </fieldset>
            </CorpsCarte>
          </Carte>

          <Carte>
            <EnteteCarte titre="Classement" />
            <CorpsCarte className="grid gap-4 pt-0 sm:grid-cols-2">
              <Groupe id="domaineId" label="Domaine" aide="Change les compétences disponibles." erreur={etat.erreurs?.domaineId}>
                <Selecteur
                  id="domaineId"
                  name="domaineId"
                  value={domaineId}
                  onChange={(e) => {
                    setDomaineId(e.target.value);
                    setChoisies([]);
                  }}
                  disabled={!editable}
                >
                  {options.domaines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </Selecteur>
              </Groupe>
              <Groupe id="niveau" label="Niveau" erreur={etat.erreurs?.niveau}>
                <Selecteur
                  id="niveau"
                  name="niveau"
                  value={niveau}
                  onChange={(e) => setNiveau(e.target.value as FormationEdition["niveau"])}
                  disabled={!editable}
                >
                  {Object.entries(NIVEAUX).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Selecteur>
              </Groupe>
              <Groupe id="formateurId" label="Formateur crédité" aide="Son profil est mis en avant sur la formation." erreur={etat.erreurs?.formateurId}>
                <Selecteur
                  id="formateurId"
                  name="formateurId"
                  value={formateurId}
                  onChange={(e) => setFormateurId(e.target.value)}
                  disabled={!editable}
                >
                  <option value="">Aucun</option>
                  {options.formateurs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </Selecteur>
              </Groupe>
              <Groupe id="imageUrl" label="Image de couverture" aide="Facultatif : la miniature de la vidéo sert par défaut." erreur={etat.erreurs?.imageUrl}>
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
              <div className="sm:col-span-2">
                <CaseACocher
                  name="visibleCatalogue"
                  checked={visibleCatalogue}
                  onChange={(e) => setVisibleCatalogue(e.target.checked)}
                  disabled={!editable}
                  label="Afficher au catalogue"
                  description="Décochez pour une capsule qui ne vit qu'à l'intérieur d'un parcours."
                />
              </div>
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-[13px] font-semibold">
                  Mots-clés
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Ils aident la recherche du catalogue.
                  </span>
                </legend>
                <SaisieTags tags={tags} onChanger={setTags} desactive={!editable} />
              </fieldset>
            </CorpsCarte>
          </Carte>
        </div>

        <div hidden={onglet !== "sequence"}>
          <Carte>
            <EnteteCarte
              titre="Vidéo et quiz"
              description="La formation est validée quand la vidéo est vue et les quiz réussis."
            />
            <CorpsCarte className="pt-0">
              <SequenceVideo
                fournisseur={fournisseur}
                reference={reference}
                dureeSec={dureeSec}
                points={points}
                competences={competencesDuDomaine}
                onFournisseur={setFournisseur}
                onReference={setReference}
                onDuree={setDureeSec}
                onPoints={setPoints}
                erreurReference={etat.erreurs?.referenceVideo}
              />
            </CorpsCarte>
          </Carte>
        </div>

        <div hidden={onglet !== "competences"}>
          <Carte>
            <EnteteCarte
              titre="Compétences travaillées"
              description="Ce sont elles qui progressent. Le poids dit lesquelles comptent le plus."
            />
            <CorpsCarte className="space-y-4 pt-0">
              {etat.erreurs?.competences ? (
                <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
                  {etat.erreurs.competences}
                </p>
              ) : null}

              {competencesChoisies.length ? (
                <ul className="space-y-2">
                  {competencesChoisies.map((c) => (
                    <li key={c.competenceId} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                      <span className="min-w-40 flex-1 text-[13px] font-medium">{c.nom}</span>
                      <div className="flex items-center gap-1" role="radiogroup" aria-label={`Poids de ${c.nom}`}>
                        {[1, 2, 3].map((p) => (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={c.poids === p}
                            disabled={!editable}
                            onClick={() =>
                              setChoisies(choisies.map((x) => (x.competenceId === c.competenceId ? { ...x, poids: p } : x)))
                            }
                            className={cn(
                              "h-8 w-8 rounded-lg border text-xs font-bold tabular-nums transition-colors",
                              c.poids === p ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <Bouton
                        type="button"
                        variante="fantome"
                        taille="icone"
                        disabled={!editable}
                        onClick={() => setChoisies(choisies.filter((x) => x.competenceId !== c.competenceId))}
                        aria-label={`Retirer ${c.nom}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Bouton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-5 text-[13px] text-muted-foreground">
                  Aucune compétence rattachée. Sans elle, la formation n&apos;a aucun effet sur le profil des
                  apprenants.
                </p>
              )}

              {competencesDuDomaine.filter((c) => !choisies.some((x) => x.competenceId === c.id)).length ? (
                <div>
                  <p className="mb-2 text-[13px] font-semibold">À ajouter</p>
                  <div className="flex flex-wrap gap-2">
                    {competencesDuDomaine
                      .filter((c) => !choisies.some((x) => x.competenceId === c.id))
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          disabled={!editable || choisies.length >= 12}
                          onClick={() => setChoisies([...choisies, { competenceId: c.id, poids: 1 }])}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-foreground/30 hover:bg-muted disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          {c.nom}
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}
            </CorpsCarte>
          </Carte>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Carte>
          <CorpsCarte className="space-y-3 pt-5">
            <div className="flex items-center justify-between gap-2">
              <Pastille ton={TONS_STATUT[statut]}>{LIBELLES_STATUT[statut]}</Pastille>
              {formation.inscrits > 0 ? (
                <span className="text-xs text-muted-foreground">{formation.inscrits} inscrits</span>
              ) : null}
            </div>

            {statut === "REFUSE" && formation.motifRefus ? (
              <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] leading-relaxed text-danger">
                <strong className="font-semibold">À corriger :</strong> {formation.motifRefus}
              </p>
            ) : null}

            {!editable ? (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {statut === "EN_VALIDATION"
                  ? "Ce contenu est en validation. Il se rouvre dès qu'une décision est rendue."
                  : "Ce contenu est archivé. Demandez sa republication à un administrateur."}
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  {enSoumission ? "Envoi…" : statut === "PUBLIE" ? "Republier" : "Soumettre à la validation"}
                </button>
              </>
            )}

            {statut === "PUBLIE" ? (
              <LienBouton href={`/formations/${formation.slug}`} variante="fantome" className="w-full">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Voir la page publique
              </LienBouton>
            ) : null}
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre={manques.length ? "Avant de publier" : "Prête à publier"} />
          <CorpsCarte className="pt-0">
            {manques.length === 0 ? (
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-success">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Tout est en place : vidéo, quiz final et compétences.
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
      </aside>
    </form>
  );
}

function SaisieTags({
  tags,
  onChanger,
  desactive,
}: {
  tags: string[];
  onChanger: (t: string[]) => void;
  desactive: boolean;
}) {
  const [saisie, setSaisie] = React.useState("");

  function ajouter() {
    const v = saisie.trim().slice(0, 40);
    if (!v || tags.includes(v) || tags.length >= 10) {
      setSaisie("");
      return;
    }
    onChanger([...tags, v]);
    setSaisie("");
  }

  return (
    <div>
      {tags.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {t}
              {!desactive ? (
                <button type="button" onClick={() => onChanger(tags.filter((x) => x !== t))} aria-label={`Retirer ${t}`}>
                  <X className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Champ
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              ajouter();
            }
          }}
          placeholder="trésorerie, caisse…"
          maxLength={40}
          disabled={desactive || tags.length >= 10}
          aria-label="Nouveau mot-clé"
        />
        <Bouton type="button" variante="contour" onClick={ajouter} disabled={desactive || !saisie.trim()}>
          Ajouter
        </Bouton>
      </div>
    </div>
  );
}
