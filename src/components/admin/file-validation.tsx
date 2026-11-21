"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Clock, ExternalLink, Flag, Target, X } from "lucide-react";
import { SurfaceVideo } from "@/components/video/surface-video";
import { estFournisseur } from "@/components/video/fournisseurs";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte } from "@/components/ui/carte";
import { Groupe, ZoneTexte } from "@/components/ui/champ";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import type { Resultat } from "@/lib/resultat";
import { cn, depuis } from "@/lib/utils";
import { refuserContenu, validerContenu } from "@/server/actions/admin-validations";
import type { FormationAValider, ParcoursAValider } from "@/server/requetes/admin-validations";
import { NIVEAUX } from "@/services/catalogue";
import { ecrireTemps } from "@/services/studio";
import { formaterDuree } from "@/services/visionnage";
import { useRetourAction } from "./retour-action";

/**
 * File de validation.
 *
 * Le contenu s'ouvre sur place, avec sa vidéo et ses questions (bonnes
 * réponses comprises) : on ne demande pas à un validateur d'aller chercher
 * ailleurs ce dont il a besoin pour décider. Le refus réclame un motif, qui
 * atterrit directement dans le studio de l'auteur.
 */
export function FileValidationListe({
  formations,
  parcours,
}: {
  formations: FormationAValider[];
  parcours: ParcoursAValider[];
}) {
  if (!formations.length && !parcours.length) {
    return (
      <EtatVide
        icone={<Check className="h-6 w-6" />}
        titre="Rien n'attend de décision"
        description="Les contenus soumis par les formateurs arrivent ici. Vous recevrez une notification."
      />
    );
  }

  return (
    <div className="space-y-4">
      {formations.map((f) => (
        <CarteFormationAValider key={f.id} f={f} />
      ))}
      {parcours.map((p) => (
        <CarteParcoursAValider key={p.id} p={p} />
      ))}
    </div>
  );
}

function Entete({
  titre,
  auteur,
  soumisLe,
  domaine,
  couleur,
  dejaPublie,
  extra,
}: {
  titre: string;
  auteur: string;
  soumisLe: Date | null;
  domaine: string;
  couleur: string;
  dejaPublie: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="min-w-48 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pastille couleur={couleur}>{domaine}</Pastille>
        {dejaPublie ? <Pastille ton="neutre">Modification d&apos;un contenu publié</Pastille> : null}
        {extra}
      </div>
      <h3 className="mt-2 text-[15px] font-bold leading-snug">{titre}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {auteur}
        {soumisLe ? ` · soumis ${depuis(soumisLe)}` : ""}
      </p>
    </div>
  );
}

function CarteFormationAValider({ f }: { f: FormationAValider }) {
  const [ouvert, setOuvert] = React.useState(false);
  const fournisseur = estFournisseur(f.fournisseurVideo) ? f.fournisseurVideo : "YOUTUBE";

  return (
    <Carte>
      <CorpsCarte className="pt-5">
        <div className="flex flex-wrap items-start gap-4">
          <Entete
            titre={f.titre}
            auteur={f.auteur}
            soumisLe={f.soumisLe}
            domaine={f.domaine}
            couleur={f.couleur}
            dejaPublie={f.dejaPublie}
            extra={
              <>
                <Pastille ton="contour">{NIVEAUX[f.niveau as keyof typeof NIVEAUX] ?? f.niveau}</Pastille>
                <Pastille ton="contour">{formaterDuree(f.dureeSec)}</Pastille>
              </>
            }
          />
          <Bouton variante="fantome" taille="sm" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}>
            {ouvert ? "Replier" : "Examiner"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", ouvert && "rotate-180")} aria-hidden />
          </Bouton>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{f.resume}</p>

        {ouvert ? (
          <div className="mt-5 space-y-5 border-t border-border pt-5">
            {f.referenceVideo ? (
              <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
                <SurfaceVideo fournisseur={fournisseur} reference={f.referenceVideo} controlesNatifs />
              </div>
            ) : (
              <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
                Aucune vidéo n&apos;est renseignée.
              </p>
            )}

            {f.objectifs.length ? (
              <div>
                <p className="mb-1.5 text-[13px] font-semibold">Objectifs annoncés</p>
                <ul className="space-y-1">
                  {f.objectifs.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Compétences travaillées</p>
              {f.competences.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {f.competences.map((c) => (
                    <Pastille key={c.nom} ton="contour">
                      {c.nom}
                      {c.poids > 1 ? ` ×${c.poids}` : ""}
                    </Pastille>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-danger">Aucune — la formation ne fera progresser personne.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold">Quiz</p>
              {f.points.length ? (
                <ul className="space-y-3">
                  {f.points.map((p) => (
                    <li key={p.id} className="rounded-xl border border-border p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {p.type === "FINAL" ? (
                          <Pastille ton="nuit">
                            <Flag className="mr-1 inline h-3 w-3" aria-hidden />
                            Quiz final
                          </Pastille>
                        ) : (
                          <Pastille ton="primaire">
                            <Clock className="mr-1 inline h-3 w-3" aria-hidden />
                            {ecrireTemps(p.tempsSec ?? 0)}
                          </Pastille>
                        )}
                        <span className="text-[13px] font-medium">{p.titre}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.questions.length} question{p.questions.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <ol className="mt-3 space-y-3">
                        {p.questions.map((q, i) => (
                          <li key={q.id}>
                            <p className="text-[13px] font-medium">
                              {i + 1}. {q.enonce}
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {q.options.map((o, j) => (
                                <li
                                  key={j}
                                  className={cn(
                                    "flex items-start gap-1.5 text-[13px]",
                                    o.correcte ? "font-semibold text-success" : "text-muted-foreground"
                                  )}
                                >
                                  {o.correcte ? (
                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                  ) : (
                                    <span className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                  )}
                                  {o.texte}
                                </li>
                              ))}
                            </ul>
                            {q.explication ? (
                              <p className="mt-1 text-xs italic text-muted-foreground">{q.explication}</p>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-danger">Aucun quiz : la formation ne pourra pas être terminée.</p>
              )}
            </div>

            <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">{f.description}</p>
          </div>
        ) : null}

        <Decision type="formation" id={f.id} jeDecide={f.jeDecide} lienStudio={`/studio/formations/${f.id}`} />
      </CorpsCarte>
    </Carte>
  );
}

function CarteParcoursAValider({ p }: { p: ParcoursAValider }) {
  const [ouvert, setOuvert] = React.useState(false);
  const total = p.etapes.reduce((s, e) => s + e.dureeSec, 0);
  const nonPubliees = p.etapes.filter((e) => e.statut !== "PUBLIE").length;

  return (
    <Carte>
      <CorpsCarte className="pt-5">
        <div className="flex flex-wrap items-start gap-4">
          <Entete
            titre={p.titre}
            auteur={p.auteur}
            soumisLe={p.soumisLe}
            domaine={p.domaine}
            couleur={p.couleur}
            dejaPublie={p.dejaPublie}
            extra={
              <>
                <Pastille ton="contour">Parcours certifiant</Pastille>
                <Pastille ton="contour">
                  {p.etapes.length} étapes · {formaterDuree(total)}
                </Pastille>
                {nonPubliees > 0 ? <Pastille ton="danger">{nonPubliees} étape(s) non publiée(s)</Pastille> : null}
              </>
            }
          />
          <Bouton variante="fantome" taille="sm" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}>
            {ouvert ? "Replier" : "Examiner"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", ouvert && "rotate-180")} aria-hidden />
          </Bouton>
        </div>

        {p.sousTitre ? <p className="mt-3 text-[13px] text-muted-foreground">{p.sousTitre}</p> : null}

        {ouvert ? (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <ol className="space-y-2">
              {p.etapes.map((e) => (
                <li key={e.ordre} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nuit text-xs font-bold text-white tabular-nums">
                    {e.ordre}
                  </span>
                  <span className="min-w-40 flex-1 text-[13px] font-medium">{e.titre}</span>
                  <span className="text-xs text-muted-foreground">{formaterDuree(e.dureeSec)}</span>
                  {e.statut !== "PUBLIE" ? <Pastille ton="danger">{e.statut}</Pastille> : null}
                </li>
              ))}
            </ol>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">{p.description}</p>
          </div>
        ) : null}

        <Decision type="parcours" id={p.id} jeDecide={p.jeDecide} lienStudio={`/studio/parcours/${p.id}`} />
      </CorpsCarte>
    </Carte>
  );
}

function Decision({
  type,
  id,
  jeDecide,
  lienStudio,
}: {
  type: "formation" | "parcours";
  id: string;
  jeDecide: boolean;
  lienStudio: string;
}) {
  const [etatValider, valider] = useActionState<Resultat, FormData>(validerContenu, {});
  const [etatRefuser, refuser] = useActionState<Resultat, FormData>(refuserContenu, {});
  const [motifOuvert, setMotifOuvert] = React.useState(false);
  useRetourAction(etatValider);
  useRetourAction(etatRefuser, { onSucces: () => setMotifOuvert(false) });

  if (!jeDecide) {
    return (
      <p className="mt-4 rounded-xl bg-muted/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
        Vous ne pouvez pas statuer sur ce contenu : on ne valide pas le sien, et celui d&apos;un responsable pédagogique
        remonte au super administrateur.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <form action={valider}>
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <BoutonSoumission enCours="Publication…">
            <Check className="h-4 w-4" aria-hidden />
            Publier
          </BoutonSoumission>
        </form>
        <Bouton variante="contour" onClick={() => setMotifOuvert(!motifOuvert)} aria-expanded={motifOuvert}>
          <X className="h-4 w-4" aria-hidden />
          Demander des corrections
        </Bouton>
        <Link
          href={lienStudio}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Ouvrir dans le studio
        </Link>
      </div>

      {motifOuvert ? (
        <form action={refuser} className="mt-3">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <Groupe
            id={`motif-${id}`}
            label="Ce qui doit être corrigé"
            aide="L'auteur le verra tel quel dans son studio. Soyez précis : c'est ce qui lui fait gagner du temps."
            erreur={etatRefuser.erreurs?.motif}
          >
            <ZoneTexte
              id={`motif-${id}`}
              name="motif"
              rows={3}
              maxLength={600}
              required
              placeholder="Le quiz final ne couvre que la première moitié de la vidéo…"
            />
          </Groupe>
          <div className="mt-2 flex flex-wrap gap-2">
            <BoutonSoumission variante="danger" enCours="Envoi…">
              Renvoyer à l&apos;auteur
            </BoutonSoumission>
            <Bouton type="button" variante="fantome" onClick={() => setMotifOuvert(false)}>
              Annuler
            </Bouton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
