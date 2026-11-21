"use client";

import * as React from "react";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { cn } from "@/lib/utils";
import { repondreQuiz } from "@/server/actions/apprentissage";
import type { Correction } from "@/server/moteur/apprentissage";
import type { PointLecture, QuestionLecture } from "@/server/requetes/lecture";

/**
 * Quiz du lecteur.
 *
 * Un quiz intégré barre la route : pas de croix pour le fermer, seulement
 * répondre ou revoir le passage. Les bonnes réponses arrivent du serveur avec
 * la correction, jamais avant : il n'y a rien à lire dans la page.
 */

export function PanneauQuiz({
  point,
  questions,
  seuilFinal,
  couleur,
  onRevoir,
  onTermine,
  onFermer,
}: {
  point: PointLecture;
  questions: QuestionLecture[];
  seuilFinal: number;
  couleur: string;
  /** Quiz intégré : revenir en arrière dans la vidéo plutôt que répondre. */
  onRevoir?: () => void;
  /** Quiz corrigé : le lecteur met à jour son état et poursuit. */
  onTermine: (c: Correction) => void;
  /** Quiz final seulement : on peut le repousser. */
  onFermer?: () => void;
}) {
  const [reponses, setReponses] = React.useState<Record<string, string[]>>({});
  const [index, setIndex] = React.useState(0);
  const [envoi, setEnvoi] = React.useState(false);
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [correction, setCorrection] = React.useState<Correction | null>(null);

  const final = point.type === "FINAL";
  const q = questions[index];
  const repondues = questions.filter((x) => (reponses[x.id] ?? []).length > 0).length;
  const toutRepondu = repondues === questions.length;

  function choisir(question: QuestionLecture, optionId: string) {
    setReponses((r) => {
      const actuelles = r[question.id] ?? [];
      if (question.type === "CHOIX_MULTIPLE") {
        return {
          ...r,
          [question.id]: actuelles.includes(optionId) ? actuelles.filter((o) => o !== optionId) : [...actuelles, optionId],
        };
      }
      return { ...r, [question.id]: [optionId] };
    });
  }

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    const r = await repondreQuiz({ pointQuizId: point.id, reponses });
    setEnvoi(false);
    if (r.erreur || !r.donnees) {
      setErreur(r.erreur ?? "Correction impossible. Réessayez.");
      return;
    }
    setCorrection(r.donnees);
  }

  function reessayer() {
    setCorrection(null);
    setReponses({});
    setIndex(0);
  }

  if (correction) {
    return (
      <Resultat
        correction={correction}
        questions={questions}
        final={final}
        seuilFinal={seuilFinal}
        couleur={couleur}
        onReessayer={reessayer}
        onContinuer={() => onTermine(correction)}
      />
    );
  }

  return (
    <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wide" style={{ color: `color-mix(in srgb, ${couleur} 75%, var(--foreground))` }}>
            {final ? "Quiz final" : "Quiz — on vérifie avant de continuer"}
          </p>
          <h2 className="mt-0.5 text-[17px] font-bold tracking-tight">{point.titre}</h2>
        </div>
        {onFermer ? (
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer et revenir à la vidéo"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {questions.length > 1 ? (
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex flex-1 gap-1">
            {questions.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Question ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i === index ? "bg-foreground" : (reponses[x.id] ?? []).length ? "bg-success" : "bg-muted"
                )}
              />
            ))}
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {index + 1} / {questions.length}
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {q ? (
          <fieldset>
            <legend className="mb-4 text-[15px] font-bold leading-snug">{q.enonce}</legend>
            {q.type === "CHOIX_MULTIPLE" ? (
              <p className="-mt-2 mb-3 text-xs text-muted-foreground">Plusieurs réponses possibles.</p>
            ) : null}
            <div className="space-y-2">
              {q.options.map((o) => {
                const choisie = (reponses[q.id] ?? []).includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors",
                      choisie ? "border-transparent bg-primary-soft" : "border-border hover:border-foreground/25 hover:bg-muted/60"
                    )}
                    style={choisie ? { boxShadow: `inset 0 0 0 2px ${couleur}` } : undefined}
                  >
                    <input
                      type={q.type === "CHOIX_MULTIPLE" ? "checkbox" : "radio"}
                      name={q.id}
                      checked={choisie}
                      onChange={() => choisir(q, o.id)}
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--primary)]"
                    />
                    <span className="leading-relaxed">{o.texte}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-muted-foreground">Ce quiz n'a pas encore de question.</p>
        )}

        {erreur ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {erreur}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
        {onRevoir ? (
          <Bouton variante="fantome" onClick={onRevoir} taille="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Revoir le passage
          </Bouton>
        ) : null}
        {index > 0 ? (
          <Bouton variante="contour" onClick={() => setIndex((i) => i - 1)} taille="sm">
            Question précédente
          </Bouton>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {!toutRepondu ? (
            <span className="text-xs text-muted-foreground">
              {repondues} / {questions.length} répondues
            </span>
          ) : null}
          {index < questions.length - 1 ? (
            <Bouton onClick={() => setIndex((i) => i + 1)} disabled={!(reponses[q?.id ?? ""] ?? []).length}>
              Question suivante
            </Bouton>
          ) : (
            <Bouton onClick={envoyer} disabled={envoi || !toutRepondu}>
              {envoi ? "Correction…" : final ? "Valider le quiz final" : "Valider mes réponses"}
            </Bouton>
          )}
        </div>
      </div>
    </div>
  );
}

function Resultat({
  correction,
  questions,
  final,
  seuilFinal,
  couleur,
  onReessayer,
  onContinuer,
}: {
  correction: Correction;
  questions: QuestionLecture[];
  final: boolean;
  seuilFinal: number;
  couleur: string;
  onReessayer: () => void;
  onContinuer: () => void;
}) {
  const pct = Math.round(correction.score * 100);
  const detaille = correction.details.some((d) => d.bonnes !== null);

  return (
    <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
      <div
        className="px-5 py-6 text-center text-white"
        style={{ background: correction.reussi ? "var(--success)" : final ? "var(--nuit)" : couleur }}
      >
        <p className="text-4xl font-black tabular-nums">{pct} %</p>
        <p className="mt-1 text-sm font-semibold">
          {correction.bonnes} bonne{correction.bonnes > 1 ? "s" : ""} réponse{correction.bonnes > 1 ? "s" : ""} sur{" "}
          {correction.total}
        </p>
        <p className="mt-2 text-[13px] text-white/85">
          {correction.reussi
            ? final
              ? "Quiz final réussi. Il ne reste que l'enquête de satisfaction."
              : "C'est acquis, la vidéo reprend."
            : final
              ? `Il faut ${Math.round(seuilFinal * 100)} % pour valider. Reprenez les passages concernés, puis retentez.`
              : "Les bonnes réponses sont indiquées ci-dessous — la vidéo reprend quand vous voulez."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {detaille ? (
          <ul className="space-y-3">
            {questions.map((q, i) => {
              const d = correction.details.find((x) => x.questionId === q.id);
              if (!d) return null;
              const bonnes = d.bonnes ?? [];
              return (
                <li key={q.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white",
                        d.correcte ? "bg-success" : "bg-danger"
                      )}
                      aria-hidden
                    >
                      {d.correcte ? <Check className="h-3 w-3" strokeWidth={3.5} /> : <X className="h-3 w-3" strokeWidth={3.5} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug">
                        {i + 1}. {q.enonce}
                      </p>
                      {!d.correcte && bonnes.length ? (
                        <p className="mt-1.5 text-[13px] text-muted-foreground">
                          Bonne réponse :{" "}
                          <span className="font-semibold text-foreground">
                            {q.options.filter((o) => bonnes.includes(o.id)).map((o) => o.texte).join(" · ")}
                          </span>
                        </p>
                      ) : null}
                      {d.explication ? (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{d.explication}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Le détail des réponses s'affiche une fois le quiz final réussi : c'est ce qui permet de le retenter sans
            l'avoir appris par cœur. Tentative n° {correction.numero}.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
        {!correction.reussi && final ? (
          <Bouton variante="contour" onClick={onReessayer}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Retenter le quiz
          </Bouton>
        ) : null}
        <Bouton onClick={onContinuer} variante={correction.reussi ? "succes" : "primaire"}>
          {final && correction.reussi ? "Continuer" : final ? "Revoir la vidéo" : "Reprendre la vidéo"}
        </Bouton>
      </div>
    </div>
  );
}
