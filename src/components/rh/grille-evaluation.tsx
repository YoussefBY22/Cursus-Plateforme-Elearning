"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { lancerAction } from "@/components/admin/retour-action";
import { Avatar } from "@/components/ui/avatar";
import { Bouton } from "@/components/ui/bouton";
import { Champ } from "@/components/ui/champ";
import { Pastille } from "@/components/ui/pastille";
import { cn } from "@/lib/utils";
import { enregistrerEvaluations } from "@/server/actions/rh";

export type ParticipantGrille = {
  id: string;
  prenom: string;
  nom: string;
  photoUrl: string | null;
  poste: string | null;
  evaluationFormateur: Record<string, number>;
  scoreTest: number | null;
};

const NOTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Couleur d'une note sélectionnée : rouge sombre en bas, vert en haut (jetons du thème). */
function classeNote(n: number): string {
  if (n <= 3) return "bg-danger text-white";
  if (n <= 5) return "bg-warning text-white";
  if (n <= 7) return "bg-turquoise text-white";
  return "bg-success text-white";
}

/**
 * Grille de saisie rapide de l'évaluation du formateur interne :
 * une rangée de dix boutons par participant et par compétence, un clic
 * sur la note choisie l'efface. Score de test facultatif (0–100).
 */
export function GrilleEvaluation({
  formationExterneId,
  je,
  participants,
  competences,
}: {
  formationExterneId: string;
  je: string;
  participants: ParticipantGrille[];
  competences: { id: string; nom: string }[];
}) {
  const initiales = useMemo(
    () =>
      Object.fromEntries(
        participants.map((p) => [p.id, Object.fromEntries(competences.map((c) => [c.id, p.evaluationFormateur[c.id] ?? null]))])
      ) as Record<string, Record<string, number | null>>,
    [participants, competences]
  );
  const [notes, setNotes] = useState(initiales);
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(participants.map((p) => [p.id, p.scoreTest === null ? "" : String(p.scoreTest)]))
  );
  const [modifie, setModifie] = useState(false);
  const [enCours, demarrer] = useTransition();

  const noter = (pid: string, cid: string, n: number) => {
    setNotes((avant) => ({ ...avant, [pid]: { ...avant[pid], [cid]: avant[pid]?.[cid] === n ? null : n } }));
    setModifie(true);
  };

  const scoreInvalide = (v: string) => v.trim() !== "" && (!Number.isFinite(Number(v.replace(",", "."))) || Number(v.replace(",", ".")) < 0 || Number(v.replace(",", ".")) > 100);
  const invalides = participants.filter((p) => scoreInvalide(scores[p.id] ?? "")).length;

  const enregistrer = () =>
    demarrer(async () => {
      const evaluations = Object.fromEntries(
        participants.map((p) => {
          const s = (scores[p.id] ?? "").trim().replace(",", ".");
          return [p.id, { notes: notes[p.id] ?? {}, scoreTest: s === "" ? null : Number(s) }];
        })
      );
      const fd = new FormData();
      fd.set("je", je);
      fd.set("formationExterneId", formationExterneId);
      fd.set("evaluations", JSON.stringify(evaluations));
      const r = await lancerAction(() => enregistrerEvaluations(fd));
      if (r.ok) setModifie(false);
    });

  const barre = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {modifie ? <span className="text-xs font-medium text-warning">Modifications non enregistrées</span> : null}
      <Bouton variante="nuit" onClick={enregistrer} disabled={enCours || invalides > 0}>
        <Save size={15} aria-hidden /> {enCours ? "Enregistrement…" : "Enregistrer les évaluations"}
      </Bouton>
    </div>
  );

  return (
    <div className="grid gap-4">
      {barre}
      <ul className="grid gap-4 lg:grid-cols-2">
        {participants.map((p) => {
          const nom = `${p.prenom} ${p.nom}`;
          const saisies = competences.filter((c) => notes[p.id]?.[c.id] != null).length;
          const sInvalide = scoreInvalide(scores[p.id] ?? "");
          return (
            <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                <Avatar nom={nom} photo={p.photoUrl} taille="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{nom}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.poste ?? "—"}</p>
                </div>
                <Pastille ton={saisies === competences.length ? "succes" : saisies ? "alerte" : "neutre"}>
                  {saisies}/{competences.length}
                </Pastille>
              </div>
              <div className="grid gap-3">
                {competences.map((c) => {
                  const v = notes[p.id]?.[c.id] ?? null;
                  return (
                    <fieldset key={c.id}>
                      <legend className="mb-1 flex w-full items-baseline justify-between gap-2 text-[13px] font-medium">
                        <span className="min-w-0 truncate">{c.nom}</span>
                        <span className="chiffres shrink-0 text-xs text-muted-foreground">{v === null ? "non noté" : `${v}/10`}</span>
                      </legend>
                      <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={`${c.nom} — ${nom}`}>
                        {NOTES.map((n) => {
                          const choisi = v === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              role="radio"
                              aria-checked={choisi}
                              aria-label={`${n} sur 10`}
                              onClick={() => noter(p.id, c.id, n)}
                              className={cn(
                                "chiffres h-8 min-w-0 rounded-lg text-xs font-bold transition-colors",
                                choisi
                                  ? classeNote(n)
                                  : v !== null && n < v
                                    ? "bg-muted text-foreground"
                                    : "border border-border text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <label htmlFor={`test-${p.id}`} className="text-[13px] font-medium">
                    Score au test interne
                  </label>
                  <Champ
                    id={`test-${p.id}`}
                    inputMode="decimal"
                    value={scores[p.id] ?? ""}
                    onChange={(e) => {
                      setScores((s) => ({ ...s, [p.id]: e.target.value }));
                      setModifie(true);
                    }}
                    placeholder="—"
                    aria-invalid={sInvalide}
                    aria-describedby={`test-aide-${p.id}`}
                    className="h-9 w-20 text-right"
                  />
                  <span id={`test-aide-${p.id}`} className={cn("text-xs", sInvalide ? "font-medium text-danger" : "text-muted-foreground")}>
                    {sInvalide ? "Entre 0 et 100" : "/100, facultatif"}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {barre}
    </div>
  );
}
