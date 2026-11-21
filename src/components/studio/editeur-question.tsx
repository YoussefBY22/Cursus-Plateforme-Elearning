"use client";

import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Etiquette, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { cn } from "@/lib/utils";
import { questionValide } from "@/services/quiz";

export type OptionBrouillon = { id: string; texte: string; correcte: boolean };
export type QuestionBrouillon = {
  id: string;
  type: "CHOIX_UNIQUE" | "CHOIX_MULTIPLE" | "VRAI_FAUX";
  enonce: string;
  explication: string | null;
  competenceId: string | null;
  options: OptionBrouillon[];
};

export const LIBELLES_TYPE_QUESTION = {
  CHOIX_UNIQUE: "Une seule bonne réponse",
  CHOIX_MULTIPLE: "Plusieurs bonnes réponses",
  VRAI_FAUX: "Vrai ou faux",
} as const;

export function cleBrouillon(): string {
  return `b${Math.random().toString(36).slice(2, 10)}`;
}

export function questionVide(type: QuestionBrouillon["type"] = "CHOIX_UNIQUE"): QuestionBrouillon {
  return {
    id: cleBrouillon(),
    type,
    enonce: "",
    explication: null,
    competenceId: null,
    options:
      type === "VRAI_FAUX"
        ? [
            { id: cleBrouillon(), texte: "Vrai", correcte: true },
            { id: cleBrouillon(), texte: "Faux", correcte: false },
          ]
        : [
            { id: cleBrouillon(), texte: "", correcte: true },
            { id: cleBrouillon(), texte: "", correcte: false },
          ],
  };
}

/**
 * Éditeur d'une question.
 *
 * La bonne réponse se coche à même la réponse plutôt que dans un champ à
 * part : c'est là qu'on la cherche. Le souci éventuel (« aucune bonne
 * réponse cochée ») s'affiche en dessous, pendant la saisie, pas à
 * l'enregistrement.
 */
export function EditeurQuestion({
  question,
  numero,
  competences,
  onChanger,
  onSupprimer,
}: {
  question: QuestionBrouillon;
  numero: number;
  competences: { id: string; nom: string }[];
  onChanger: (q: QuestionBrouillon) => void;
  onSupprimer: () => void;
}) {
  const souci = questionValide(question);
  const multiple = question.type === "CHOIX_MULTIPLE";

  function changerType(type: QuestionBrouillon["type"]) {
    if (type === "VRAI_FAUX") {
      onChanger({ ...question, type, options: questionVide("VRAI_FAUX").options });
      return;
    }
    // D'un choix multiple vers un choix unique : on ne garde qu'une bonne réponse.
    let options = question.options;
    if (type === "CHOIX_UNIQUE" && options.filter((o) => o.correcte).length > 1) {
      let vue = false;
      options = options.map((o) => {
        if (o.correcte && !vue) {
          vue = true;
          return o;
        }
        return { ...o, correcte: false };
      });
    }
    if (question.type === "VRAI_FAUX") {
      options = [
        { id: cleBrouillon(), texte: "", correcte: true },
        { id: cleBrouillon(), texte: "", correcte: false },
      ];
    }
    onChanger({ ...question, type, options });
  }

  function basculer(optionId: string) {
    onChanger({
      ...question,
      options: question.options.map((o) =>
        o.id === optionId
          ? { ...o, correcte: multiple ? !o.correcte : true }
          : multiple
            ? o
            : { ...o, correcte: false }
      ),
    });
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          <Etiquette htmlFor={`enonce-${question.id}`} className="sr-only">
            Énoncé de la question {numero}
          </Etiquette>
          <ZoneTexte
            id={`enonce-${question.id}`}
            value={question.enonce}
            onChange={(e) => onChanger({ ...question, enonce: e.target.value })}
            placeholder="Posez la question telle que l'apprenant la lira."
            maxLength={500}
            rows={2}
            className="min-h-16"
          />
        </div>
        <Bouton
          type="button"
          variante="fantome"
          taille="icone"
          onClick={onSupprimer}
          aria-label={`Supprimer la question ${numero}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Bouton>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Etiquette htmlFor={`type-${question.id}`}>Type</Etiquette>
          <Selecteur
            id={`type-${question.id}`}
            value={question.type}
            onChange={(e) => changerType(e.target.value as QuestionBrouillon["type"])}
          >
            {Object.entries(LIBELLES_TYPE_QUESTION).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Selecteur>
        </div>
        <div>
          <Etiquette htmlFor={`comp-${question.id}`} aide="Sert au calcul du niveau.">
            Compétence évaluée
          </Etiquette>
          <Selecteur
            id={`comp-${question.id}`}
            value={question.competenceId ?? ""}
            onChange={(e) => onChanger({ ...question, competenceId: e.target.value || null })}
          >
            <option value="">Aucune en particulier</option>
            {competences.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </Selecteur>
        </div>
      </div>

      <ul className="space-y-2">
        {question.options.map((o, i) => (
          <li key={o.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => basculer(o.id)}
              aria-pressed={o.correcte}
              aria-label={o.correcte ? `Réponse ${i + 1} : bonne réponse` : `Marquer la réponse ${i + 1} comme bonne`}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center border transition-colors",
                multiple ? "rounded-lg" : "rounded-full",
                o.correcte ? "border-success bg-success text-white" : "border-border bg-card hover:bg-muted"
              )}
            >
              {o.correcte ? <Check className="h-4 w-4" aria-hidden /> : <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>}
            </button>
            <Champ
              value={o.texte}
              onChange={(e) =>
                onChanger({
                  ...question,
                  options: question.options.map((x) => (x.id === o.id ? { ...x, texte: e.target.value } : x)),
                })
              }
              placeholder={`Réponse ${i + 1}`}
              maxLength={300}
              disabled={question.type === "VRAI_FAUX"}
              aria-label={`Texte de la réponse ${i + 1}`}
            />
            {question.type !== "VRAI_FAUX" && question.options.length > 2 ? (
              <Bouton
                type="button"
                variante="fantome"
                taille="icone"
                onClick={() => onChanger({ ...question, options: question.options.filter((x) => x.id !== o.id) })}
                aria-label={`Retirer la réponse ${i + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Bouton>
            ) : null}
          </li>
        ))}
      </ul>

      {question.type !== "VRAI_FAUX" && question.options.length < 6 ? (
        <Bouton
          type="button"
          variante="fantome"
          taille="sm"
          className="mt-2"
          onClick={() =>
            onChanger({ ...question, options: [...question.options, { id: cleBrouillon(), texte: "", correcte: false }] })
          }
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Ajouter une réponse
        </Bouton>
      ) : null}

      <div className="mt-3">
        <Etiquette htmlFor={`expl-${question.id}`} aide="Affichée après la réponse. C'est là que l'apprenant comprend.">
          Explication
        </Etiquette>
        <ZoneTexte
          id={`expl-${question.id}`}
          value={question.explication ?? ""}
          onChange={(e) => onChanger({ ...question, explication: e.target.value || null })}
          maxLength={600}
          rows={2}
          className="min-h-16"
        />
      </div>

      {souci ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs font-medium text-warning">
          <GripVertical className="h-3.5 w-3.5 rotate-90" aria-hidden />
          {souci}
        </p>
      ) : null}
    </li>
  );
}
