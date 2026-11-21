"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, Play, Target, TrendingUp } from "lucide-react";
import { Icone } from "@/components/icones";
import { Radar } from "@/components/competences/radar";
import { LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { Pastille } from "@/components/ui/pastille";
import { cn, formaterDate } from "@/lib/utils";
import type { DetailDomaine, DomaineProfil } from "@/server/requetes/competences";
import { NIVEAUX } from "@/services/catalogue";
import { NOTE_MAX, tracerSparkline } from "@/services/radar";
import { formaterDuree } from "@/services/visionnage";

/**
 * Exploration du profil : le radar sélectionne un domaine, le panneau en
 * dessous l'ouvre. Un seul domaine à la fois — comparer six listes de
 * compétences côte à côte n'aide personne.
 */
export function Explorateur({
  domaines,
  details,
}: {
  domaines: DomaineProfil[];
  details: DetailDomaine[];
}) {
  const [actif, setActif] = React.useState<string | null>(null);
  const detail = details.find((d) => d.domaine.id === actif) ?? null;
  const panneau = React.useRef<HTMLDivElement>(null);

  function activer(id: string | null) {
    setActif(id);
    if (id) requestAnimationFrame(() => panneau.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  return (
    <div className="space-y-6">
      <Carte>
        <EnteteCarte
          titre="Votre radar"
          description="Le trait plein, c'est aujourd'hui ; les pointillés, votre point de départ. Cliquez sur un domaine pour l'ouvrir."
        />
        <CorpsCarte>
          <div className="mx-auto max-w-lg">
            <Radar domaines={domaines} actif={actif} onActiver={activer} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {domaines.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => activer(actif === d.id ? null : d.id)}
                aria-pressed={actif === d.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  actif === d.id ? "border-transparent text-white" : "border-border bg-card hover:bg-muted"
                )}
                style={actif === d.id ? { background: d.couleur } : undefined}
              >
                <Icone nom={d.icone} className="h-3.5 w-3.5" />
                {d.nom}
                <span className={cn("tabular-nums", actif === d.id ? "text-white/80" : "text-muted-foreground")}>
                  {d.niveau ?? "—"}
                </span>
              </button>
            ))}
          </div>
        </CorpsCarte>
      </Carte>

      <div ref={panneau}>
        {detail ? (
          <PanneauDomaine d={detail} onFermer={() => setActif(null)} />
        ) : (
          <Carte>
            <CorpsCarte className="pt-5 text-center">
              <p className="text-[13px] text-muted-foreground">
                Choisissez un domaine sur le radar pour voir le détail de ses compétences, votre progression et les
                formations qui vous feraient avancer.
              </p>
            </CorpsCarte>
          </Carte>
        )}
      </div>
    </div>
  );
}

function PanneauDomaine({ d, onFermer }: { d: DetailDomaine; onFermer: () => void }) {
  const couleur = d.domaine.couleur;
  const progression =
    d.domaine.niveau !== null && d.domaine.niveauInitial !== null ? d.domaine.niveau - d.domaine.niveauInitial : null;

  return (
    <Carte className="border-l-4" style={{ borderLeftColor: couleur }}>
      <EnteteCarte
        titre={
          <span className="flex items-center gap-2">
            <Icone nom={d.domaine.icone} className="h-4 w-4" />
            {d.domaine.nom}
          </span>
        }
        description={d.domaine.description ?? `${d.domaine.mesurees} compétence(s) mesurée(s) sur ${d.domaine.total}.`}
        action={
          <button
            type="button"
            onClick={onFermer}
            className="rounded-full px-3 py-1 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Fermer
          </button>
        }
      />
      <CorpsCarte className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums" style={{ color: couleur }}>
              {d.domaine.niveau ?? "—"}
            </span>
            <span className="text-[13px] text-muted-foreground">/ {NOTE_MAX}</span>
          </div>
          {progression !== null && progression !== 0 ? (
            <Pastille ton={progression > 0 ? "succes" : "alerte"}>
              <TrendingUp className={cn("h-3.5 w-3.5", progression < 0 && "rotate-180")} aria-hidden />
              {progression > 0 ? "+" : ""}
              {Math.round(progression)} depuis le départ
            </Pastille>
          ) : null}
          {!d.aEvalue ? (
            <LienBouton href={`/competences/auto-evaluation/${d.domaine.code}`} taille="sm">
              Faire l&apos;auto-évaluation
            </LienBouton>
          ) : (
            <LienBouton href={`/competences/auto-evaluation/${d.domaine.code}?contexte=LIBRE`} variante="contour" taille="sm">
              Refaire le point
            </LienBouton>
          )}
        </div>

        <ul className="divide-y divide-border rounded-xl border border-border">
          {d.competences.map((c) => {
            const serie = [
              ...(c.niveauInitial !== null ? [c.niveauInitial] : []),
              ...c.historique.map((h) => h.niveau),
            ];
            const courbe = serie.length > 1 ? tracerSparkline(serie, 72, 24) : null;
            return (
              <li key={c.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug">{c.nom}</p>
                  {c.niveau === null ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">Pas encore mesurée</p>
                  ) : c.pistes ? (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{c.pistes}</p>
                  ) : c.historique[0] ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Dernier mouvement : {c.historique[0].libelle ?? c.historique[0].source.toLowerCase()} —{" "}
                      {formaterDate(c.historique[0].le)}
                    </p>
                  ) : null}
                </div>

                {courbe ? (
                  <svg viewBox="0 0 72 24" className="hidden h-6 w-[72px] shrink-0 sm:block" aria-hidden>
                    <path d={courbe.aire} fill={couleur} fillOpacity={0.12} />
                    <path d={courbe.ligne} fill="none" stroke={couleur} strokeWidth={1.6} strokeLinecap="round" />
                  </svg>
                ) : null}

                <div className="w-14 shrink-0 text-right">
                  <span className="text-[15px] font-bold tabular-nums" style={{ color: c.niveau === null ? "var(--muted-foreground)" : couleur }}>
                    {c.niveau ?? "—"}
                  </span>
                  {c.progression ? (
                    <span className={cn("block text-[11px] font-semibold tabular-nums", c.progression > 0 ? "text-success" : "text-warning")}>
                      {c.progression > 0 ? "+" : ""}
                      {Math.round(c.progression)}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {d.prioritaires.length ? (
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Target className="h-4 w-4" style={{ color: couleur }} aria-hidden />
              Où progresser en premier
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {d.prioritaires.map((c) => c.nom).join(", ")}.
            </p>
          </div>
        ) : null}

        {d.formations.length ? (
          <div>
            <p className="mb-3 text-[13px] font-semibold">Formations qui travaillent ces compétences</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {d.formations.map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/formations/${f.slug}`}
                    className="group flex h-full flex-col rounded-xl border border-border p-3 transition-colors hover:border-foreground/25 hover:bg-muted/50"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold leading-snug group-hover:text-primary">{f.titre}</span>
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{f.resume}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden />
                        {formaterDuree(f.dureeSec)}
                      </span>
                      <span>{NIVEAUX[f.niveau]}</span>
                      {f.enCours ? (
                        <span className="inline-flex items-center gap-1 font-semibold" style={{ color: couleur }}>
                          <Play className="h-3 w-3 fill-current" aria-hidden />
                          En cours
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CorpsCarte>
    </Carte>
  );
}
