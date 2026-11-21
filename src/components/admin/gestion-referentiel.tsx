"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Brain, Lightbulb, MessageCircleQuestion, Pencil, Plus, Power } from "lucide-react";
import { couleurLisible } from "@/components/graphiques/couleurs";
import { Icone } from "@/components/icones";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte } from "@/components/ui/carte";
import { Champ, Groupe, ZoneTexte } from "@/components/ui/champ";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { Dialogue } from "@/components/ui/dialogue";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import type { Resultat } from "@/lib/resultat";
import { cn, pluriel } from "@/lib/utils";
import {
  changerActivationCompetence,
  deplacerCompetence,
  deplacerDomaine,
  enregistrerCompetence,
  enregistrerDomaine,
} from "@/server/actions/admin-referentiel";
import { ChoixCouleur } from "./choix-couleur";
import { ChoixIcone } from "./choix-icone";
import { lancerAction, useRetourAction } from "./retour-action";

export type CompetenceRef = {
  id: string;
  nom: string;
  description: string | null;
  question: string | null;
  pistes: string | null;
  active: boolean;
  adaptations: number;
};

export type DomaineRef = {
  id: string;
  nom: string;
  description: string | null;
  couleur: string;
  icone: string;
  jesAdaptees: number;
  competences: CompetenceRef[];
};

type Edition =
  | { type: "domaine"; domaine: DomaineRef | null; cle: number }
  | { type: "competence"; domaine: DomaineRef; competence: CompetenceRef | null; cle: number };

function BoutonsOrdre({
  id,
  premier,
  dernier,
  action,
  libelle,
}: {
  id: string;
  premier: boolean;
  dernier: boolean;
  action: (fd: FormData) => Promise<Resultat>;
  libelle: string;
}) {
  const [enCours, demarrer] = useTransition();
  const deplacer = (sens: "haut" | "bas") =>
    demarrer(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("sens", sens);
      const r = await action(fd);
      if (r.erreur) await lancerAction(async () => r);
    });
  return (
    <span className="inline-flex">
      <button
        type="button"
        disabled={premier || enCours}
        onClick={() => deplacer("haut")}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        aria-label={`Monter ${libelle}`}
      >
        <ArrowUp size={15} />
      </button>
      <button
        type="button"
        disabled={dernier || enCours}
        onClick={() => deplacer("bas")}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        aria-label={`Descendre ${libelle}`}
      >
        <ArrowDown size={15} />
      </button>
    </span>
  );
}

export function GestionReferentiel({ domaines, peutEcrire }: { domaines: DomaineRef[]; peutEcrire: boolean }) {
  const [edition, setEdition] = useState<Edition | null>(null);
  const fermer = () => setEdition(null);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
      <nav aria-label="Domaines" className="-mx-1 flex min-w-0 flex-1 basis-80 gap-2 overflow-x-auto px-1 pb-1">
        {domaines.map((d) => (
          <a
            key={d.id}
            href={`#domaine-${d.id}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-semibold hover:bg-muted"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: couleurLisible(d.couleur) }} aria-hidden />
            {d.nom}
            <span className="chiffres text-xs font-medium text-muted-foreground">{d.competences.length}</span>
          </a>
        ))}
      </nav>
        {peutEcrire ? (
          <Bouton onClick={() => setEdition({ type: "domaine", domaine: null, cle: Date.now() })}>
            <Plus size={16} /> Ajouter un domaine
          </Bouton>
        ) : null}
      </div>

      {domaines.length === 0 ? (
        <EtatVide
          icone={<Brain className="h-6 w-6" />}
          titre="Référentiel vide"
          description="Ajoutez un premier domaine (un département type d'une organisation), puis ses compétences : elles alimenteront les auto-évaluations et les radars."
        />
      ) : (
        <div className="grid gap-6">
          {domaines.map((d, i) => {
            const couleur = couleurLisible(d.couleur);
            return (
              <Carte key={d.id} id={`domaine-${d.id}`} className="scroll-mt-20 overflow-hidden">
                <div className="flex flex-wrap items-start gap-4 border-b border-border px-5 py-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: d.couleur }}>
                    <Icone nom={d.icone} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[17px] font-extrabold tracking-tight">{d.nom}</h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{d.description ?? "Pas encore de description."}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pastille ton="neutre">{pluriel(d.competences.filter((c) => c.active).length, "compétence active", "compétences actives")}</Pastille>
                      {d.jesAdaptees > 0 ? (
                        <Pastille couleur={d.couleur}>
                          Adapté par {d.jesAdaptees} organisation
                        </Pastille>
                      ) : (
                        <Pastille ton="contour">Aucune organisation ne l&apos;a adapté</Pastille>
                      )}
                    </div>
                  </div>
                  {peutEcrire ? (
                    <div className="flex items-center gap-1">
                      <BoutonsOrdre id={d.id} premier={i === 0} dernier={i === domaines.length - 1} action={deplacerDomaine} libelle={`le domaine ${d.nom}`} />
                      <Bouton variante="contour" taille="sm" onClick={() => setEdition({ type: "domaine", domaine: d, cle: Date.now() })}>
                        <Pencil size={14} /> Modifier
                      </Bouton>
                    </div>
                  ) : null}
                </div>

                {d.competences.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                    Aucune compétence dans ce domaine. Ajoutez-en au moins trois pour une auto-évaluation qui ait du sens.
                  </p>
                ) : (
                  <ol>
                    {d.competences.map((c, j) => (
                      <li
                        key={c.id}
                        className={cn("flex items-start gap-3 border-b border-border/60 px-5 py-3 last:border-0", !c.active && "bg-muted/40")}
                      >
                        <span
                          className="chiffres mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: `color-mix(in srgb, ${couleur} 15%, transparent)`, color: couleur }}
                        >
                          {j + 1}
                        </span>
                        <div className={cn("min-w-0 flex-1", !c.active && "opacity-60")}>
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                            {c.nom}
                            {!c.active ? <Pastille ton="danger">Désactivée</Pastille> : null}
                            {c.adaptations > 0 ? (
                              <Pastille ton="contour" title="Nombre d'organisation ayant adapté cette compétence">
                                {c.adaptations} adaptation{c.adaptations > 1 ? "s" : ""}
                              </Pastille>
                            ) : null}
                          </p>
                          <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-muted-foreground">
                            <MessageCircleQuestion size={13} className="mt-0.5 shrink-0" aria-hidden />
                            {c.question ?? <span className="italic">Question dérivée du nom</span>}
                          </p>
                          {c.pistes ? (
                            <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-muted-foreground">
                              <Lightbulb size={13} className="mt-0.5 shrink-0" aria-hidden />
                              <span className="line-clamp-1">{c.pistes}</span>
                            </p>
                          ) : null}
                        </div>
                        {peutEcrire ? (
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                            <BoutonsOrdre
                              id={c.id}
                              premier={j === 0}
                              dernier={j === d.competences.length - 1}
                              action={deplacerCompetence}
                              libelle={`la compétence ${c.nom}`}
                            />
                            <button
                              type="button"
                              onClick={() => setEdition({ type: "competence", domaine: d, competence: c, cle: Date.now() })}
                              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label={`Modifier ${c.nom}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <BoutonConfirme
                              variante="fantome"
                              taille="sm"
                              className="h-8 w-8 px-0"
                              aria-label={c.active ? `Désactiver ${c.nom}` : `Réactiver ${c.nom}`}
                              titre={c.active ? "Désactiver la compétence" : "Réactiver la compétence"}
                              libelleConfirmation={c.active ? "Désactiver" : "Réactiver"}
                              message={
                                c.active
                                  ? `« ${c.nom} » ne sera plus proposée aux auto-évaluations ni aux nouvelles formations. Les niveaux déjà mesurés et l'historique restent intacts.`
                                  : `« ${c.nom} » sera de nouveau proposée aux auto-évaluations et aux formations.`
                              }
                              champs={{ id: c.id, active: c.active ? "false" : "true" }}
                              action={async (fd) => {
                                await lancerAction(() => changerActivationCompetence(fd));
                              }}
                            >
                              <Power size={15} className={c.active ? "text-muted-foreground" : "text-success"} />
                            </BoutonConfirme>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}

                {peutEcrire ? (
                  <div className="px-5 py-3">
                    <Bouton
                      variante="fantome"
                      taille="sm"
                      onClick={() => setEdition({ type: "competence", domaine: d, competence: null, cle: Date.now() })}
                    >
                      <Plus size={14} /> Ajouter une compétence
                    </Bouton>
                  </div>
                ) : null}
              </Carte>
            );
          })}
        </div>
      )}

      <Dialogue
        ouvert={edition !== null}
        onFermer={fermer}
        className="max-w-xl"
        titre={
          edition?.type === "domaine"
            ? edition.domaine
              ? `Modifier « ${edition.domaine.nom} »`
              : "Nouveau domaine"
            : edition?.competence
              ? "Modifier la compétence"
              : `Nouvelle compétence — ${edition?.domaine.nom ?? ""}`
        }
        description={
          edition?.type === "domaine"
            ? "Un domaine est à la fois un département d'organisation, une catégorie de formation et un axe du radar."
            : "Compétence du référentiel commun : les organisations peuvent ensuite l'adapter à leur contexte."
        }
      >
        {edition?.type === "domaine" ? (
          <FormulaireDomaine key={edition.cle} domaine={edition.domaine} onTermine={fermer} />
        ) : edition?.type === "competence" ? (
          <FormulaireCompetence key={edition.cle} domaine={edition.domaine} competence={edition.competence} onTermine={fermer} />
        ) : null}
      </Dialogue>
    </>
  );
}

function MessageErreur({ etat }: { etat: Resultat }) {
  return etat.erreur ? (
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
      {etat.erreur}
    </p>
  ) : null;
}

function FormulaireDomaine({ domaine, onTermine }: { domaine: DomaineRef | null; onTermine: () => void }) {
  const [etat, action] = useActionState<Resultat, FormData>(enregistrerDomaine, {});
  useRetourAction(etat, { onSucces: onTermine });
  const e = etat.erreurs ?? {};
  const [couleur, setCouleur] = useState(domaine?.couleur ?? "#1E7A86");
  const [icone, setIcone] = useState(domaine?.icone ?? "Sparkles");

  return (
    <form action={action} className="grid gap-4" noValidate>
      {domaine ? <input type="hidden" name="id" value={domaine.id} /> : null}
      <Groupe id="dom-nom" label="Nom" erreur={e.nom}>
        <Champ id="dom-nom" name="nom" defaultValue={domaine?.nom ?? ""} maxLength={80} required aria-invalid={!!e.nom} placeholder="Développement commercial" />
      </Groupe>
      <Groupe id="dom-description" label="Description" erreur={e.description} aide="Une phrase : ce que couvre le domaine, vu d'une organisation.">
        <ZoneTexte id="dom-description" name="description" defaultValue={domaine?.description ?? ""} maxLength={400} rows={2} className="min-h-16" />
      </Groupe>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold">Couleur</p>
        <ChoixCouleur id="dom-couleur" name="couleur" valeur={couleur} onChange={setCouleur} erreur={e.couleur} />
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold">
          Icône
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: couleur }} aria-hidden>
            <Icone nom={icone} className="h-4 w-4" />
          </span>
        </p>
        <ChoixIcone name="icone" valeur={icone} onChange={setIcone} couleur={couleur} />
        {e.icone ? <p className="mt-1.5 text-xs font-medium text-danger">{e.icone}</p> : null}
      </div>
      <MessageErreur etat={etat} />
      <div className="mt-2 flex justify-end gap-2">
        <Bouton variante="contour" onClick={onTermine}>
          Annuler
        </Bouton>
        <BoutonSoumission enCours="Enregistrement…">{domaine ? "Enregistrer le domaine" : "Créer le domaine"}</BoutonSoumission>
      </div>
    </form>
  );
}

function FormulaireCompetence({
  domaine,
  competence,
  onTermine,
}: {
  domaine: DomaineRef;
  competence: CompetenceRef | null;
  onTermine: () => void;
}) {
  const [etat, action] = useActionState<Resultat, FormData>(enregistrerCompetence, {});
  useRetourAction(etat, { onSucces: onTermine });
  const e = etat.erreurs ?? {};
  const [nom, setNom] = useState(competence?.nom ?? "");

  return (
    <form action={action} className="grid gap-4" noValidate>
      {competence ? <input type="hidden" name="id" value={competence.id} /> : null}
      <input type="hidden" name="domaineId" value={domaine.id} />
      <Groupe id="comp-nom" label="Nom de la compétence" erreur={e.nom}>
        <Champ
          id="comp-nom"
          name="nom"
          value={nom}
          onChange={(ev) => setNom(ev.target.value)}
          maxLength={120}
          required
          aria-invalid={!!e.nom}
          placeholder="Négocier un devis"
        />
      </Groupe>
      <Groupe
        id="comp-question"
        label="Question d'auto-évaluation"
        erreur={e.question}
        aide={`Posée telle quelle, notée de 1 à 10. Vide : « À quel point maîtrisez-vous : ${nom || "…"} ? »`}
      >
        <Champ
          id="comp-question"
          name="question"
          defaultValue={competence?.question ?? ""}
          maxLength={240}
          placeholder="Savez-vous défendre un prix face à un client qui négocie ?"
        />
      </Groupe>
      <Groupe id="comp-description" label="Description" erreur={e.description}>
        <ZoneTexte id="comp-description" name="description" defaultValue={competence?.description ?? ""} maxLength={500} rows={2} className="min-h-16" />
      </Groupe>
      <Groupe
        id="comp-pistes"
        label="Pistes d'amélioration"
        erreur={e.pistes}
        aide="Montrées au membre quand la compétence fait partie de ses points faibles. Une piste par ligne."
      >
        <ZoneTexte id="comp-pistes" name="pistes" defaultValue={competence?.pistes ?? ""} maxLength={1500} rows={4} />
      </Groupe>
      <MessageErreur etat={etat} />
      <div className="mt-2 flex justify-end gap-2">
        <Bouton variante="contour" onClick={onTermine}>
          Annuler
        </Bouton>
        <BoutonSoumission enCours="Enregistrement…">{competence ? "Enregistrer la compétence" : "Ajouter la compétence"}</BoutonSoumission>
      </div>
    </form>
  );
}
