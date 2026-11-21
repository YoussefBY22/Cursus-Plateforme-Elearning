"use client";

import * as React from "react";
import { Clock, Flag, MapPin, Plus, Trash2, Video } from "lucide-react";
import { SurfaceVideo } from "@/components/video/surface-video";
import type { ControleVideo } from "@/components/video/pilotes";
import { DESCRIPTEURS, estFournisseur, type CodeFournisseur } from "@/components/video/fournisseurs";
import { Bouton } from "@/components/ui/bouton";
import { Champ, Etiquette, Groupe, Selecteur } from "@/components/ui/champ";
import { Pastille } from "@/components/ui/pastille";
import { cn } from "@/lib/utils";
import { ecrireTemps, lireTemps, positionMarqueur } from "@/services/studio";
import { EditeurQuestion, cleBrouillon, questionVide, type QuestionBrouillon } from "./editeur-question";

export type PointBrouillon = {
  id: string;
  type: "INTEGRE" | "FINAL";
  tempsSec: number | null;
  titre: string;
  questions: QuestionBrouillon[];
};

/**
 * Vidéo et quiz, sur un même écran.
 *
 * Le formateur lit sa vidéo, s'arrête à l'endroit utile et pose le quiz
 * là — « Placer un quiz ici » reprend la position réelle du lecteur. C'est
 * la seule façon de choisir un bon moment : à la saisie d'un horodatage à
 * l'aveugle, les points tombent toujours à côté.
 */
export function SequenceVideo({
  fournisseur,
  reference,
  dureeSec,
  points,
  competences,
  onFournisseur,
  onReference,
  onDuree,
  onPoints,
  erreurReference,
}: {
  fournisseur: string;
  reference: string;
  dureeSec: number;
  points: PointBrouillon[];
  competences: { id: string; nom: string }[];
  onFournisseur: (v: string) => void;
  onReference: (v: string) => void;
  onDuree: (v: number) => void;
  onPoints: (p: PointBrouillon[]) => void;
  erreurReference?: string | null;
}) {
  const controle = React.useRef<ControleVideo | null>(null);
  const [position, setPosition] = React.useState(0);
  const [apercu, setApercu] = React.useState<{ fournisseur: CodeFournisseur; reference: string } | null>(null);
  const [erreurLecteur, setErreurLecteur] = React.useState<string | null>(null);
  const [ouvert, setOuvert] = React.useState<string | null>(null);

  const code: CodeFournisseur = estFournisseur(fournisseur) ? fournisseur : "YOUTUBE";
  const descripteur = DESCRIPTEURS[code];

  // La position du lecteur n'émet pas d'événement : on l'interroge.
  React.useEffect(() => {
    if (!apercu) return;
    const t = setInterval(() => {
      const c = controle.current;
      if (c) setPosition(c.position());
    }, 500);
    return () => clearInterval(t);
  }, [apercu]);

  function charger() {
    const normalisee = descripteur.normaliser(reference);
    if (!normalisee) {
      setErreurLecteur(descripteur.aide);
      return;
    }
    onReference(normalisee);
    setErreurLecteur(null);
    controle.current = null;
    setApercu({ fournisseur: code, reference: normalisee });
  }

  const integres = points.filter((p) => p.type === "INTEGRE").sort((a, b) => (a.tempsSec ?? 0) - (b.tempsSec ?? 0));
  const final = points.find((p) => p.type === "FINAL") ?? null;

  function majPoint(id: string, modif: Partial<PointBrouillon>) {
    onPoints(points.map((p) => (p.id === id ? { ...p, ...modif } : p)));
  }

  function ajouterIntegre(tempsSec: number) {
    const t = Math.max(1, Math.round(tempsSec));
    const nouveau: PointBrouillon = {
      id: cleBrouillon(),
      type: "INTEGRE",
      tempsSec: t,
      titre: `Point à ${ecrireTemps(t)}`,
      questions: [questionVide()],
    };
    onPoints([...points, nouveau]);
    setOuvert(nouveau.id);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div>
          <Etiquette htmlFor="fournisseurVideo">Source</Etiquette>
          <Selecteur
            id="fournisseurVideo"
            value={code}
            onChange={(e) => {
              onFournisseur(e.target.value);
              setApercu(null);
            }}
          >
            {Object.values(DESCRIPTEURS).map((d) => (
              <option key={d.code} value={d.code}>
                {d.libelle}
              </option>
            ))}
          </Selecteur>
        </div>
        <Groupe id="referenceVideo" label="Vidéo" aide={descripteur.aide} erreur={erreurReference ?? erreurLecteur}>
          <div className="flex gap-2">
            <Champ
              id="referenceVideo"
              value={reference}
              onChange={(e) => {
                onReference(e.target.value);
                setErreurLecteur(null);
              }}
              placeholder={code === "YOUTUBE" ? "https://www.youtube.com/watch?v=…" : "/videos/ma-capsule.mp4"}
              maxLength={500}
            />
            <Bouton type="button" variante="contour" onClick={charger} disabled={!reference.trim()}>
              Charger
            </Bouton>
          </div>
        </Groupe>
      </div>

      {apercu ? (
        <div>
          <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
            <SurfaceVideo
              fournisseur={apercu.fournisseur}
              reference={apercu.reference}
              controlesNatifs
              onPret={(c) => {
                controle.current = c;
                const d = Math.round(c.duree());
                // La durée annoncée par le lecteur fait foi : c'est elle qui
                // sert au seuil de visionnage et aux bornes des points.
                if (d > 0 && d !== dureeSec) onDuree(d);
              }}
              onErreur={(m) => setErreurLecteur(m)}
            />
          </div>

          {/* Frise : la vidéo vue comme une ligne, les quiz comme des jalons */}
          <div className="mt-3">
            <div className="relative h-10 select-none">
              <div className="absolute inset-x-0 top-4 h-1.5 rounded-full bg-muted" />
              {dureeSec > 0 ? (
                <div
                  className="absolute top-4 h-1.5 rounded-full bg-primary/30"
                  style={{ width: `${positionMarqueur(position, dureeSec)}%` }}
                />
              ) : null}
              {dureeSec > 0
                ? integres.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setOuvert(p.id);
                        controle.current?.aller(p.tempsSec ?? 0);
                      }}
                      title={`${p.titre} — ${ecrireTemps(p.tempsSec ?? 0)}`}
                      className={cn(
                        "absolute top-1.5 -ml-2 flex h-7 w-4 items-center justify-center rounded-full transition-transform hover:scale-110",
                        ouvert === p.id ? "scale-110" : ""
                      )}
                      style={{ left: `${positionMarqueur(p.tempsSec ?? 0, dureeSec)}%` }}
                    >
                      <span className="h-7 w-1.5 rounded-full bg-primary" aria-hidden />
                      <span className="sr-only">
                        Ouvrir le quiz de {ecrireTemps(p.tempsSec ?? 0)}
                      </span>
                    </button>
                  ))
                : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {ecrireTemps(position)} / {dureeSec > 0 ? ecrireTemps(dureeSec) : "—"}
              </span>
              <Bouton
                type="button"
                variante="contour"
                taille="sm"
                onClick={() => {
                  controle.current?.pause();
                  ajouterIntegre(controle.current?.position() ?? position);
                }}
                disabled={dureeSec <= 0}
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Placer un quiz ici
              </Bouton>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <Video className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-[13px] font-semibold">Chargez la vidéo pour poser les quiz</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Vous pourrez l&apos;arrêter au bon moment et placer un quiz à cette seconde précise.
          </p>
        </div>
      )}

      {/* Quiz intégrés */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold">Quiz pendant la vidéo</h3>
          <span className="text-xs text-muted-foreground">
            La vidéo s&apos;arrête, l&apos;apprenant répond, puis elle reprend.
          </span>
        </div>
        {integres.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-5 text-[13px] text-muted-foreground">
            Aucun quiz intégré. Ils ne sont pas obligatoires, mais c&apos;est ce qui tient l&apos;attention sur une
            vidéo longue.
          </p>
        ) : (
          <ul className="space-y-3">
            {integres.map((p, i) => (
              <Point
                key={p.id}
                point={p}
                numero={i + 1}
                dureeSec={dureeSec}
                competences={competences}
                ouvert={ouvert === p.id}
                onOuvrir={() => setOuvert(ouvert === p.id ? null : p.id)}
                onChanger={(modif) => majPoint(p.id, modif)}
                onSupprimer={() => onPoints(points.filter((x) => x.id !== p.id))}
                onAller={(t) => controle.current?.aller(t)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Quiz final */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold">Quiz final</h3>
          <span className="text-xs text-muted-foreground">Obligatoire : c&apos;est lui qui clôt la formation.</span>
        </div>
        {final ? (
          <Point
            point={final}
            numero={null}
            dureeSec={dureeSec}
            competences={competences}
            ouvert={ouvert === final.id}
            onOuvrir={() => setOuvert(ouvert === final.id ? null : final.id)}
            onChanger={(modif) => majPoint(final.id, modif)}
            onSupprimer={() => onPoints(points.filter((x) => x.id !== final.id))}
          />
        ) : (
          <Bouton
            type="button"
            variante="contour"
            onClick={() => {
              const nouveau: PointBrouillon = {
                id: cleBrouillon(),
                type: "FINAL",
                tempsSec: null,
                titre: "Quiz final",
                questions: [questionVide()],
              };
              onPoints([...points, nouveau]);
              setOuvert(nouveau.id);
            }}
          >
            <Flag className="h-4 w-4" aria-hidden />
            Ajouter le quiz final
          </Bouton>
        )}
      </div>
    </div>
  );
}

function Point({
  point,
  numero,
  dureeSec,
  competences,
  ouvert,
  onOuvrir,
  onChanger,
  onSupprimer,
  onAller,
}: {
  point: PointBrouillon;
  numero: number | null;
  dureeSec: number;
  competences: { id: string; nom: string }[];
  ouvert: boolean;
  onOuvrir: () => void;
  onChanger: (modif: Partial<PointBrouillon>) => void;
  onSupprimer: () => void;
  onAller?: (t: number) => void;
}) {
  // `brouillon` ne vit que pendant la frappe : à null, le champ affiche le
  // temps réel du point, sans avoir à le recopier à chaque changement.
  const [brouillon, setBrouillon] = React.useState<string | null>(null);
  const [tempsInvalide, setTempsInvalide] = React.useState(false);
  const integre = point.type === "INTEGRE";
  const saisie = brouillon ?? ecrireTemps(point.tempsSec ?? 0);

  function validerTemps() {
    const t = lireTemps(saisie);
    if (t === null) {
      setTempsInvalide(true);
      return;
    }
    setTempsInvalide(false);
    setBrouillon(null);
    onChanger({ tempsSec: t });
    onAller?.(t);
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-border">
      <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-3">
        {integre ? (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white tabular-nums">
              {numero}
            </span>
            <label className="sr-only" htmlFor={`temps-${point.id}`}>
              Moment du quiz {numero}
            </label>
            <Champ
              id={`temps-${point.id}`}
              value={saisie}
              onChange={(e) => setBrouillon(e.target.value)}
              onBlur={validerTemps}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  validerTemps();
                }
              }}
              aria-invalid={tempsInvalide || undefined}
              className="h-9 w-24 text-center tabular-nums"
            />
          </>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nuit text-white">
            <Flag className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}

        <Champ
          value={point.titre}
          onChange={(e) => onChanger({ titre: e.target.value })}
          placeholder={integre ? "Titre du point" : "Quiz final"}
          maxLength={140}
          aria-label="Titre du quiz"
          className="h-9 min-w-40 flex-1"
        />
        <Pastille ton={point.questions.length ? "neutre" : "alerte"}>
          {point.questions.length === 0
            ? "aucune question"
            : `${point.questions.length} question${point.questions.length > 1 ? "s" : ""}`}
        </Pastille>
        <Bouton type="button" variante="fantome" taille="sm" onClick={onOuvrir} aria-expanded={ouvert}>
          {ouvert ? "Replier" : "Modifier"}
        </Bouton>
        <Bouton type="button" variante="fantome" taille="icone" onClick={onSupprimer} aria-label="Supprimer ce quiz">
          <Trash2 className="h-4 w-4" aria-hidden />
        </Bouton>
      </div>

      {tempsInvalide ? (
        <p role="alert" className="border-t border-border bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
          Moment illisible. Écrivez-le en minutes et secondes, par exemple 4:30.
        </p>
      ) : integre && dureeSec > 0 && (point.tempsSec ?? 0) >= dureeSec ? (
        <p role="alert" className="border-t border-border bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
          Ce moment tombe après la fin de la vidéo ({ecrireTemps(dureeSec)}).
        </p>
      ) : null}

      {ouvert ? (
        <div className="space-y-3 border-t border-border p-3">
          <ul className="space-y-3">
            {point.questions.map((q, i) => (
              <EditeurQuestion
                key={q.id}
                question={q}
                numero={i + 1}
                competences={competences}
                onChanger={(modifiee) =>
                  onChanger({ questions: point.questions.map((x) => (x.id === q.id ? modifiee : x)) })
                }
                onSupprimer={() => onChanger({ questions: point.questions.filter((x) => x.id !== q.id) })}
              />
            ))}
          </ul>
          <Bouton
            type="button"
            variante="contour"
            taille="sm"
            onClick={() => onChanger({ questions: [...point.questions, questionVide()] })}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Ajouter une question
          </Bouton>
        </div>
      ) : null}
    </li>
  );
}
