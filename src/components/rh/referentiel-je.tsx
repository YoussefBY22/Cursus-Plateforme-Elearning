"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy, Landmark, Lightbulb, MessageCircleQuestion, Pencil, Plus, Power, Undo2 } from "lucide-react";
import { lancerAction, useRetourAction } from "@/components/admin/retour-action";
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
  adapterDomaine,
  changerActivationCompetenceJe,
  enregistrerCompetenceJe,
  reprendreCompetence,
  revenirReferentielCommun,
} from "@/server/actions/rh";
import { LIBELLES_ORIGINE, type OrigineCompetence } from "@/services/rh";

export type LigneRef = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  question: string | null;
  pistes: string | null;
  active: boolean;
  origine: OrigineCompetence;
  nomSource: string | null;
};

export type DomaineRefJe = {
  id: string;
  nom: string;
  description: string | null;
  couleur: string;
  icone: string;
  adapte: boolean;
  dejaAdapte: boolean;
  lignes: LigneRef[];
  nonReprises: { id: string; nom: string }[];
};

const TON_ORIGINE: Record<OrigineCompetence, "neutre" | "contour" | "primaire" | "nuit"> = {
  COMMUN: "neutre",
  REPRISE: "contour",
  ADAPTEE: "primaire",
  PROPRE: "nuit",
};

type Edition = { domaine: DomaineRefJe; competence: LigneRef | null; cle: number };

function FormulaireCompetence({ edition, je, onFermer }: { edition: Edition; je: string; onFermer: () => void }) {
  const [etat, action] = useActionState<Resultat, FormData>(enregistrerCompetenceJe, {});
  useRetourAction(etat, { onSucces: onFermer });
  const c = edition.competence;
  const e = etat.erreurs ?? {};
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="je" value={je} />
      {c ? <input type="hidden" name="id" value={c.id} /> : <input type="hidden" name="domaineId" value={edition.domaine.id} />}
      {c?.nomSource ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          Nom dans le référentiel commun : <strong className="text-foreground">{c.nomSource}</strong>
        </p>
      ) : null}
      {!c && !edition.domaine.adapte ? (
        <p className="rounded-xl bg-warning-soft px-3 py-2 text-[13px]">
          Ce domaine suit encore le référentiel commun : il sera d&apos;abord adapté pour votre organisation (copie de ses
          compétences), puis la nouvelle compétence y sera ajoutée.
        </p>
      ) : null}
      <Groupe id="rh-nom" label="Nom de la compétence" erreur={e.nom}>
        <Champ id="rh-nom" name="nom" defaultValue={c?.nom ?? ""} required minLength={3} maxLength={120} aria-invalid={!!e.nom} />
      </Groupe>
      <Groupe id="rh-description" label="Description" aide="Facultative : ce que recouvre la compétence dans votre organisation." erreur={e.description}>
        <ZoneTexte id="rh-description" name="description" defaultValue={c?.description ?? ""} maxLength={500} className="min-h-20" />
      </Groupe>
      <Groupe
        id="rh-question"
        label="Question d'auto-évaluation"
        aide="Posée au membre, à noter de 1 à 10. Laissez vide pour la déduire du nom."
        erreur={e.question}
      >
        <Champ id="rh-question" name="question" defaultValue={c?.question ?? ""} maxLength={240} placeholder="Sur 10, à quel point maîtrisez-vous…" />
      </Groupe>
      <Groupe id="rh-pistes" label="Pistes de progression" aide="Conseils montrés au membre quand la compétence est faible." erreur={e.pistes}>
        <ZoneTexte id="rh-pistes" name="pistes" defaultValue={c?.pistes ?? ""} maxLength={1500} />
      </Groupe>
      <div className="flex justify-end gap-2">
        <Bouton variante="contour" onClick={onFermer}>
          Annuler
        </Bouton>
        <BoutonSoumission enCours="Enregistrement…">{c ? "Enregistrer la compétence" : "Ajouter la compétence"}</BoutonSoumission>
      </div>
    </form>
  );
}

function BoutonActivation({ c, je }: { c: LigneRef; je: string }) {
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const fd = new FormData();
          fd.set("id", c.id);
          fd.set("active", String(!c.active));
          fd.set("je", je);
          await lancerAction(() => changerActivationCompetenceJe(fd));
        })
      }
      className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
      aria-label={c.active ? `Désactiver ${c.nom}` : `Réactiver ${c.nom}`}
      title={c.active ? "Désactiver" : "Réactiver"}
    >
      <Power size={15} className={c.active ? "" : "text-success"} />
    </button>
  );
}

function BoutonReprendre({ id, nom, je }: { id: string; nom: string; je: string }) {
  const [enCours, demarrer] = useTransition();
  return (
    <Bouton
      variante="contour"
      taille="sm"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const fd = new FormData();
          fd.set("competenceId", id);
          fd.set("je", je);
          await lancerAction(() => reprendreCompetence(fd));
        })
      }
    >
      <Plus size={14} aria-hidden /> Reprendre « {nom} »
    </Bouton>
  );
}

export function ReferentielJe({ domaines, je, peutEcrire, sigle }: { domaines: DomaineRefJe[]; je: string; peutEcrire: boolean; sigle: string }) {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [enCours, demarrer] = useTransition();
  const fermer = () => setEdition(null);

  if (!domaines.length) {
    return (
      <EtatVide
        icone={<Landmark className="h-6 w-6" />}
        titre="Référentiel vide"
        description="La plateforme n'a encore publié aucun domaine de compétences. Revenez quand le référentiel sera en place."
      />
    );
  }

  const adapter = (d: DomaineRefJe) =>
    demarrer(async () => {
      const fd = new FormData();
      fd.set("domaineId", d.id);
      fd.set("je", je);
      await lancerAction(() => adapterDomaine(fd));
    });

  return (
    <>
      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Chaque domaine suit le référentiel commun tant que vous ne l&apos;adaptez pas. Une fois adapté, la version de{" "}
        {sigle} devient le standard de votre organisation : c&apos;est elle que vos membres voient dans leurs auto-évaluations. Les compétences
        reprises gardent leur lien avec l&apos;original, ce qui garde les niveaux comparables entre organisations. Rien n&apos;est jamais
        supprimé : désactivez plutôt.
      </p>
      <div className="grid gap-6">
        {domaines.map((d) => {
          const couleur = couleurLisible(d.couleur);
          const actives = d.lignes.filter((l) => l.active).length;
          return (
            <Carte key={d.id} id={`domaine-${d.id}`} className="scroll-mt-20 overflow-hidden">
              <div className="flex flex-wrap items-start gap-4 border-b border-border px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: d.couleur }}>
                  <Icone nom={d.icone} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <h2 className="text-[17px] font-extrabold tracking-tight">{d.nom}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {d.adapte ? (
                      <Pastille couleur={d.couleur}>Adapté pour {sigle}</Pastille>
                    ) : (
                      <Pastille ton="contour">Référentiel commun</Pastille>
                    )}
                    <Pastille ton="neutre">{pluriel(actives, "compétence active", "compétences actives")}</Pastille>
                  </div>
                </div>
                {peutEcrire ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {d.adapte ? (
                      <>
                        <BoutonConfirme
                          variante="contour"
                          taille="sm"
                          titre="Revenir au référentiel commun"
                          libelleConfirmation="Revenir au référentiel"
                          message={
                            <>
                              Les {d.lignes.length} compétences de {sigle} pour « {d.nom} » seront désactivées et vos membres seront de nouveau
                              évalués sur le référentiel commun. Les niveaux déjà mesurés sont conservés, et « Adapter pour ma
                              organisation » restaurera votre version.
                            </>
                          }
                          action={async (fd) => {
                            await lancerAction(() => revenirReferentielCommun(fd));
                          }}
                          champs={{ domaineId: d.id, je }}
                        >
                          <Undo2 size={14} aria-hidden /> Revenir à la plateforme
                        </BoutonConfirme>
                        <Bouton taille="sm" variante="contour" onClick={() => setEdition({ domaine: d, competence: null, cle: Date.now() })}>
                          <Plus size={14} aria-hidden /> Ajouter une compétence
                        </Bouton>
                      </>
                    ) : (
                      <>
                        <Bouton taille="sm" variante="fantome" onClick={() => setEdition({ domaine: d, competence: null, cle: Date.now() })}>
                          <Plus size={14} aria-hidden /> Ajouter une compétence
                        </Bouton>
                        <Bouton taille="sm" variante="nuit" disabled={enCours || !d.lignes.length} onClick={() => adapter(d)}>
                          <Copy size={14} aria-hidden /> {d.dejaAdapte ? "Restaurer ma version" : "Adapter pour mon organisation"}
                        </Bouton>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {d.lignes.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  La plateforme n&apos;a pas encore de compétence active dans ce domaine.
                  {peutEcrire ? " Vous pouvez ajouter les vôtres." : ""}
                </p>
              ) : (
                <ol>
                  {d.lignes.map((c, j) => (
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
                          <Pastille ton={TON_ORIGINE[c.origine]}>{LIBELLES_ORIGINE[c.origine]}</Pastille>
                          {!c.active ? <Pastille ton="danger">Désactivée</Pastille> : null}
                        </p>
                        {c.nomSource ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">Nom d&apos;origine : {c.nomSource}</p>
                        ) : null}
                        <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-muted-foreground">
                          <MessageCircleQuestion size={13} className="mt-0.5 shrink-0" aria-hidden />
                          {c.question ?? <span className="italic">Question déduite du nom</span>}
                        </p>
                        {c.pistes ? (
                          <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-muted-foreground">
                            <Lightbulb size={13} className="mt-0.5 shrink-0" aria-hidden />
                            <span className="line-clamp-2">{c.pistes}</span>
                          </p>
                        ) : null}
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">{c.code}</p>
                      </div>
                      {peutEcrire && d.adapte ? (
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => setEdition({ domaine: d, competence: c, cle: Date.now() })}
                            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Modifier ${c.nom}`}
                            title="Modifier"
                          >
                            <Pencil size={15} />
                          </button>
                          <BoutonActivation c={c} je={je} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}

              {peutEcrire && d.nonReprises.length ? (
                <div className="border-t border-border bg-muted/40 px-5 py-3">
                  <p className="mb-2 text-[13px] text-muted-foreground">
                    La plateforme a ajouté {pluriel(d.nonReprises.length, "compétence")} depuis votre adaptation :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {d.nonReprises.map((n) => (
                      <BoutonReprendre key={n.id} id={n.id} nom={n.nom} je={je} />
                    ))}
                  </div>
                </div>
              ) : null}
            </Carte>
          );
        })}
      </div>

      <Dialogue
        ouvert={!!edition}
        onFermer={fermer}
        titre={edition?.competence ? "Modifier la compétence" : "Ajouter une compétence propre à l'organisation"}
        description={edition ? `Domaine « ${edition.domaine.nom} »` : undefined}
      >
        {edition ? <FormulaireCompetence key={edition.cle} edition={edition} je={je} onFermer={fermer} /> : null}
      </Dialogue>
    </>
  );
}
