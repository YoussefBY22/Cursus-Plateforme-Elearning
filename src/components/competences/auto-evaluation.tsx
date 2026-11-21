"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleHelp, ShieldAlert, Timer, TrendingUp } from "lucide-react";
import { Bouton, LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte } from "@/components/ui/carte";
import { EtatErreur } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { cn } from "@/lib/utils";
import { demarrerAutoEvaluation, terminerAutoEvaluationAction } from "@/server/actions/competences";
import type { PreparationAutoEvaluation } from "@/server/requetes/competences";
import {
  dureeMaxMinutes,
  fractionRestante,
  libelleQuestion,
  reponseExpiree,
  secondesRestantes,
  toucheVersReponse,
  type ContexteAutoEvaluation,
  type QuestionAutoEvaluation,
  type ReponseAutoEvaluation,
  type ResultatCompetence,
} from "@/services/auto-evaluation";
import { NOTE_MAX } from "@/services/radar";

/**
 * Auto-évaluation chronométrée.
 *
 * Le chronomètre n'est pas là pour mettre la pression : il est là pour que la
 * réponse soit la vôtre. Dix secondes suffisent largement à dire où l'on se
 * situe, et pas à aller chercher la réponse ailleurs — c'est ce qui rend la
 * mesure honnête, bien mieux qu'une consigne de ne pas tricher.
 *
 * Le serveur revérifie chaque durée : une réponse arrivée après la fin du
 * délai est traitée comme expirée, quoi qu'en dise le navigateur.
 */

type Etape = "intro" | "questions" | "resultats";

export function AutoEvaluation({
  preparation,
  contexte,
  formationSlug,
  formationExterneId,
  retour,
}: {
  preparation: PreparationAutoEvaluation;
  contexte: ContexteAutoEvaluation;
  formationSlug?: string | null;
  formationExterneId?: string | null;
  retour: string;
}) {
  const router = useRouter();
  const [etape, setEtape] = React.useState<Etape>("intro");
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [enCours, setEnCours] = React.useState(false);
  const [session, setSession] = React.useState<{ id: string; questions: QuestionAutoEvaluation[]; delaiMs: number } | null>(
    null
  );
  const [resultats, setResultats] = React.useState<ResultatCompetence[] | null>(null);

  const couleur = preparation.domaine.couleur;

  async function demarrer() {
    setEnCours(true);
    setErreur(null);
    const r = await demarrerAutoEvaluation({
      domaineCode: preparation.domaine.code,
      contexte,
      formationSlug: formationSlug ?? null,
      formationExterneId: formationExterneId ?? null,
    });
    setEnCours(false);
    if (r.erreur || !r.donnees) {
      setErreur(r.erreur ?? "Impossible de démarrer l'auto-évaluation.");
      return;
    }
    setSession({
      id: r.donnees.id,
      questions: r.donnees.questions,
      delaiMs: r.donnees.secondesParQuestion * 1000,
    });
    setEtape("questions");
  }

  async function terminer(reponses: ReponseAutoEvaluation[]) {
    if (!session) return;
    setEnCours(true);
    const r = await terminerAutoEvaluationAction(session.id, reponses);
    setEnCours(false);
    if (r.erreur || !r.donnees) {
      setErreur(r.erreur ?? "Vos réponses n'ont pas pu être enregistrées.");
      return;
    }
    setResultats(r.donnees.resultats);
    setEtape("resultats");
    router.refresh();
  }

  if (erreur && etape !== "questions") {
    return (
      <EtatErreur
        titre="Auto-évaluation indisponible"
        description={erreur}
        action={<LienBouton href={retour} variante="contour">Revenir</LienBouton>}
      />
    );
  }

  if (etape === "questions" && session) {
    return (
      <Questions
        questions={session.questions}
        delaiMs={session.delaiMs}
        couleur={couleur}
        enEnvoi={enCours}
        erreur={erreur}
        onTerminer={terminer}
      />
    );
  }

  if (etape === "resultats" && resultats) {
    return <Resultats resultats={resultats} couleur={couleur} domaine={preparation.domaine.nom} retour={retour} />;
  }

  return (
    <Intro
      preparation={preparation}
      contexte={contexte}
      couleur={couleur}
      enCours={enCours}
      onDemarrer={demarrer}
      retour={retour}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Introduction                                                        */
/* ------------------------------------------------------------------ */

function Intro({
  preparation,
  contexte,
  couleur,
  enCours,
  onDemarrer,
  retour,
}: {
  preparation: PreparationAutoEvaluation;
  contexte: ContexteAutoEvaluation;
  couleur: string;
  enCours: boolean;
  onDemarrer: () => void;
  retour: string;
}) {
  const n = preparation.questions.length;
  const minutes = dureeMaxMinutes(n, preparation.secondesParQuestion);

  return (
    <Carte className="mx-auto max-w-2xl">
      <CorpsCarte className="space-y-5 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Pastille couleur={couleur}>{preparation.domaine.nom}</Pastille>
          {contexte === "FINALE" ? <Pastille ton="neutre">Après la formation</Pastille> : null}
          {contexte === "LIBRE" ? <Pastille ton="neutre">Nouveau point</Pastille> : null}
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {n} questions, {preparation.secondesParQuestion} secondes chacune
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Pour chaque compétence, situez-vous de 1 à 10. Il n&apos;y a pas de bonne réponse : une mesure juste vaut
            bien mieux qu&apos;une mesure flatteuse, puisque c&apos;est votre progression qui sera calculée ensuite.
          </p>
        </div>

        <ul className="space-y-3 rounded-xl bg-muted/50 p-4 text-[13px] leading-relaxed">
          <li className="flex gap-3">
            <Timer className="mt-0.5 h-4 w-4 shrink-0" style={{ color: couleur }} aria-hidden />
            <span>
              Comptez {minutes} minute{minutes > 1 ? "s" : ""} au plus. Une question sans réponse dans le temps imparti
              passe simplement à la suivante.
            </span>
          </li>
          <li className="flex gap-3">
            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: couleur }} aria-hidden />
            <span>
              <strong className="font-semibold">« Je ne connais pas »</strong> est une vraie réponse. Elle vaut mieux
              qu&apos;un chiffre au hasard, et elle ne vous pénalise pas.
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: couleur }} aria-hidden />
            <span>
              Répondez seul, sans IA ni recherche : le chronomètre est court exprès, et une réponse qui ne vient pas de
              vous fausse votre propre suivi — personne d&apos;autre.
            </span>
          </li>
        </ul>

        <p className="text-[13px] text-muted-foreground">
          Raccourcis : les touches <kbd className="rounded border border-border px-1 font-sans">1</kbd> à{" "}
          <kbd className="rounded border border-border px-1 font-sans">9</kbd>,{" "}
          <kbd className="rounded border border-border px-1 font-sans">0</kbd> pour 10, et{" "}
          <kbd className="rounded border border-border px-1 font-sans">Échap</kbd> pour « je ne connais pas ».
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Bouton onClick={onDemarrer} disabled={enCours} taille="lg">
            {enCours ? "Préparation…" : "Démarrer"}
            {!enCours ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </Bouton>
          <LienBouton href={retour} variante="fantome">
            Plus tard
          </LienBouton>
        </div>
      </CorpsCarte>
    </Carte>
  );
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

function Questions({
  questions,
  delaiMs,
  couleur,
  enEnvoi,
  erreur,
  onTerminer,
}: {
  questions: QuestionAutoEvaluation[];
  delaiMs: number;
  couleur: string;
  enEnvoi: boolean;
  erreur: string | null;
  onTerminer: (reponses: ReponseAutoEvaluation[]) => void;
}) {
  const [index, setIndex] = React.useState(0);
  const [ecoule, setEcoule] = React.useState(0);
  const reponses = React.useRef<ReponseAutoEvaluation[]>([]);
  const depart = React.useRef(performance.now());
  const question = questions[index];
  const termine = React.useRef(false);

  const repondre = React.useCallback(
    (valeur: number | null, inconnu: boolean) => {
      if (termine.current) return;
      const q = questions[index];
      if (!q) return;
      reponses.current = [
        ...reponses.current,
        { competenceId: q.competenceId, valeur, inconnu, dureeMs: Math.round(performance.now() - depart.current) },
      ];
      if (index + 1 < questions.length) {
        setIndex((i) => i + 1);
        depart.current = performance.now();
        setEcoule(0);
      } else {
        termine.current = true;
        onTerminer(reponses.current);
      }
    },
    [index, questions, onTerminer]
  );

  // Chronomètre : une question non répondue à temps est marquée expirée.
  React.useEffect(() => {
    const minuteur = setInterval(() => {
      const e = performance.now() - depart.current;
      setEcoule(e);
      if (e >= delaiMs) {
        const q = questions[index];
        if (!q || termine.current) return;
        reponses.current = [...reponses.current, reponseExpiree(q.competenceId, delaiMs)];
        if (index + 1 < questions.length) {
          setIndex((i) => i + 1);
          depart.current = performance.now();
          setEcoule(0);
        } else {
          termine.current = true;
          onTerminer(reponses.current);
        }
      }
    }, 100);
    return () => clearInterval(minuteur);
  }, [index, delaiMs, questions, onTerminer]);

  // Clavier : 1–9, 0 pour 10, Échap pour « je ne connais pas ».
  React.useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const r = toucheVersReponse(e.key);
      if (r === null) return;
      e.preventDefault();
      if (r === "inconnu") repondre(null, true);
      else repondre(r, false);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [repondre]);

  const restant = secondesRestantes(ecoule, delaiMs);
  const fraction = fractionRestante(ecoule, delaiMs);
  const urgence = fraction < 0.3;

  if (!question) return null;

  return (
    <Carte className="mx-auto max-w-2xl overflow-hidden">
      {/* Chronomètre : une barre qui se vide, lisible sans être anxiogène */}
      <div className="h-1 w-full bg-muted" aria-hidden>
        <div
          className="h-full transition-[width] duration-100 ease-linear"
          style={{ width: `${fraction * 100}%`, background: urgence ? "var(--warning)" : couleur }}
        />
      </div>

      <CorpsCarte className="pt-5">
        <div className="mb-5 flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold tabular-nums text-muted-foreground">
            Question {index + 1} / {questions.length}
          </span>
          <span
            className={cn("inline-flex items-center gap-1.5 font-bold tabular-nums", urgence ? "text-warning" : "text-muted-foreground")}
            aria-live="off"
          >
            <Timer className="h-3.5 w-3.5" aria-hidden />
            {restant} s
          </span>
        </div>

        <h2 className="text-lg font-bold leading-snug" aria-live="polite">
          {libelleQuestion(question.nom, question.question)}
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">1 = je découvre · 10 = je peux former quelqu&apos;un</p>

        <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                type="button"
                onClick={() => repondre(n, false)}
                disabled={enEnvoi}
                aria-label={`${n} sur 10`}
                className="h-12 rounded-xl bg-muted text-sm font-bold tabular-nums transition-[background-color,transform] hover:scale-105 hover:text-white active:scale-95 disabled:opacity-50"
                style={{ ["--survol" as string]: couleur }}
                onMouseEnter={(e) => (e.currentTarget.style.background = couleur)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                onFocus={(e) => (e.currentTarget.style.background = couleur)}
                onBlur={(e) => (e.currentTarget.style.background = "")}
              >
                {n}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => repondre(null, true)}
          disabled={enEnvoi}
          className="mt-3 w-full rounded-xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          Je ne connais pas cette compétence
        </button>

        {erreur ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {erreur}
          </p>
        ) : null}

        {/* Avancement global */}
        <div className="mt-5 flex gap-1" aria-hidden>
          {questions.map((q, i) => (
            <span
              key={q.competenceId}
              className={cn("h-1 flex-1 rounded-full", i < index ? "bg-success" : i === index ? "" : "bg-muted")}
              style={i === index ? { background: couleur } : undefined}
            />
          ))}
        </div>
      </CorpsCarte>
    </Carte>
  );
}

/* ------------------------------------------------------------------ */
/* Résultats                                                           */
/* ------------------------------------------------------------------ */

function Resultats({
  resultats,
  couleur,
  domaine,
  retour,
}: {
  resultats: ResultatCompetence[];
  couleur: string;
  domaine: string;
  retour: string;
}) {
  const mesurees = resultats.filter((r) => r.niveauDeclare !== null);
  const moyenne = mesurees.length
    ? Math.round(mesurees.reduce((s, r) => s + (r.niveauActuel ?? r.niveauDeclare ?? 0), 0) / mesurees.length)
    : null;
  const inconnues = resultats.filter((r) => r.inconnu).length;
  const expirees = resultats.filter((r) => r.expire).length;

  return (
    <Carte className="mx-auto max-w-2xl">
      <div className="px-5 py-6 text-center text-white" style={{ background: couleur }}>
        <p className="text-[13px] font-semibold text-white/80">{domaine}</p>
        <p className="mt-1 text-4xl font-black tabular-nums">
          {moyenne ?? "—"}
          <span className="text-lg font-bold text-white/70"> / {NOTE_MAX}</span>
        </p>
        <p className="mt-1.5 text-[13px] text-white/85">
          {moyenne === null
            ? "Aucune compétence mesurée cette fois."
            : "Voilà votre point de départ. Tout ce que vous ferez ensuite se mesure à partir d'ici."}
        </p>
      </div>

      <CorpsCarte className="space-y-4 pt-5">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {resultats.map((r) => (
            <li key={r.competenceId} className="flex items-center gap-3 p-3.5">
              <span className="min-w-0 flex-1 text-[13px] font-medium">{r.nom}</span>
              {r.expire ? (
                <Pastille ton="neutre">Temps écoulé</Pastille>
              ) : r.inconnu ? (
                <Pastille ton="neutre">Je ne connais pas</Pastille>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">déclaré {r.valeur}/10</span>
                  <span className="w-9 text-right text-[15px] font-bold tabular-nums" style={{ color: couleur }}>
                    {r.niveauActuel ?? r.niveauDeclare}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>

        {inconnues || expirees ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {inconnues ? `${inconnues} compétence(s) marquée(s) « je ne connais pas ». ` : ""}
            {expirees ? `${expirees} question(s) sans réponse à temps. ` : ""}
            Elles restent non mesurées — vous pourrez refaire le point quand vous voudrez.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <LienBouton href={retour}>
            <TrendingUp className="h-4 w-4" aria-hidden />
            Voir mon profil
          </LienBouton>
          <LienBouton href="/catalogue" variante="contour">
            Trouver une formation
          </LienBouton>
        </div>
      </CorpsCarte>
    </Carte>
  );
}
