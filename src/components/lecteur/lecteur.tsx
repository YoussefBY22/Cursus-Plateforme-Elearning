"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, ClipboardCheck, Loader2, Play, ShieldCheck } from "lucide-react";
import { BarreLecture } from "@/components/lecteur/barre-lecture";
import { EnqueteChaud } from "@/components/lecteur/enquete-chaud";
import { PanneauQuiz } from "@/components/lecteur/panneau-quiz";
import { SurfaceVideo } from "@/components/video/surface-video";
import type { CodeFournisseur } from "@/components/video/fournisseurs";
import type { ControleVideo } from "@/components/video/pilotes";
import { Bouton } from "@/components/ui/bouton";
import { EtatErreur } from "@/components/ui/etat-vide";
import { toast } from "@/components/ui/toasts";
import { cn } from "@/lib/utils";
import { chargerQuiz, synchroniserLecture } from "@/server/actions/apprentissage";
import type { Correction } from "@/server/moteur/apprentissage";
import type { PreparationLecture, QuestionLecture } from "@/server/requetes/lecture";
import { prochaineBarriere, positionAutorisee } from "@/services/quiz";
import {
  etatSuiviInitial,
  integrerReleve,
  vider,
  type EtatSuivi,
  type Segment,
} from "@/services/visionnage";

/**
 * Lecteur suivi.
 *
 * Il tient trois promesses :
 *   1. on reprend exactement où l'on s'est arrêté, quiz ouvert compris ;
 *   2. un quiz non fait barre la lecture — impossible de l'esquiver en
 *      déplaçant le curseur, et le serveur rogne de toute façon ce qu'on lui
 *      raconte ;
 *   3. seul le temps réellement regardé compte (pas la position atteinte).
 *
 * Le navigateur ne fait que proposer : `synchroniser()` côté serveur recalcule
 * tout à partir du temps réel écoulé. L'état affiché vient de ses réponses.
 */

const PERIODE_RELEVE = 250;
const PERIODE_SYNC = 10_000;

type Props = { d: PreparationLecture };

export function Lecteur({ d }: Props) {
  const router = useRouter();
  const { formation, regles } = d;

  const controle = React.useRef<ControleVideo | null>(null);
  const suivi = React.useRef<EtatSuivi>(etatSuiviInitial());
  const dernierSync = React.useRef(0);
  const enCoursDeSync = React.useRef(false);

  const [pret, setPret] = React.useState(false);
  const [erreurVideo, setErreurVideo] = React.useState<string | null>(null);
  const [position, setPosition] = React.useState(d.progression.positionSec);
  const [duree, setDuree] = React.useState(formation.dureeSec);
  const [enLecture, setEnLecture] = React.useState(false);
  const [volume, setVolume] = React.useState(1);
  const [muet, setMuet] = React.useState(false);
  const [vitesse, setVitesse] = React.useState(1);
  const [pleinEcran, setPleinEcran] = React.useState(false);

  const [points, setPoints] = React.useState(d.points);
  const [segments, setSegments] = React.useState<Segment[]>(d.progression.segments);
  const [couverture, setCouverture] = React.useState(
    formation.dureeSec > 0 ? Math.min(1, d.progression.secondesVues / formation.dureeSec) : 0
  );
  const [seuilAtteint, setSeuilAtteint] = React.useState(d.progression.seuilAtteint);
  const [statut, setStatut] = React.useState(d.progression.statut);

  const [quiz, setQuiz] = React.useState<{ point: (typeof d.points)[number]; questions: QuestionLecture[] } | null>(null);
  const [ouvertureQuiz, setOuvertureQuiz] = React.useState<string | null>(null);
  const [enquete, setEnquete] = React.useState(false);

  const cadre = React.useRef<HTMLDivElement>(null);

  /* ---------------- barrière ---------------- */

  const integres = React.useMemo(
    () => points.filter((p) => p.type === "INTEGRE" && p.tempsSec !== null).map((p) => ({ id: p.id, tempsSec: p.tempsSec! })),
    [points]
  );
  const realises = React.useMemo(
    () => new Set(points.filter((p) => p.type === "INTEGRE" && p.realise).map((p) => p.id)),
    [points]
  );
  const barriere = React.useMemo(() => prochaineBarriere(integres, realises), [integres, realises]);
  const pointFinal = points.find((p) => p.type === "FINAL") ?? null;
  const tousIntegresFaits = integres.every((p) => realises.has(p.id));

  /* ---------------- ouverture d'un quiz ---------------- */

  // Un quiz qui refuse de s'ouvrir ne doit pas être redemandé en boucle par la
  // boucle de relevé : on retient l'échec jusqu'à une relance explicite.
  const echecQuiz = React.useRef<string | null>(null);
  const [bloque, setBloque] = React.useState<string | null>(null);

  const ouvrirQuiz = React.useCallback(
    async (pointId: string, forcer = false) => {
      if (quiz || ouvertureQuiz) return;
      if (echecQuiz.current === pointId && !forcer) return;
      const point = points.find((p) => p.id === pointId);
      if (!point) return;
      controle.current?.pause();
      echecQuiz.current = null;
      setBloque(null);
      setOuvertureQuiz(pointId);
      const r = await chargerQuiz({ pointQuizId: pointId });
      setOuvertureQuiz(null);
      if (r.erreur || !r.donnees) {
        echecQuiz.current = pointId;
        setBloque(r.erreur ?? "Quiz indisponible pour le moment.");
        toast({ titre: "Quiz indisponible", description: r.erreur, ton: "erreur" });
        return;
      }
      setQuiz({ point, questions: r.donnees.questions });
    },
    [points, quiz, ouvertureQuiz]
  );

  /* ---------------- synchronisation ---------------- */

  const synchroniser = React.useCallback(
    async (quizEnCoursId: string | null) => {
      const c = controle.current;
      if (!c || enCoursDeSync.current) return;
      enCoursDeSync.current = true;
      const { segments: aEnvoyer, etat } = vider(suivi.current);
      const sauts = etat.sauts;
      suivi.current = { ...etat, sauts: 0 };
      dernierSync.current = Date.now();

      const r = await synchroniserLecture({
        formationId: formation.id,
        positionSec: c.position(),
        segments: aEnvoyer,
        quizEnCoursId,
        dureeReelle: c.duree() || null,
        sauts,
      });
      enCoursDeSync.current = false;
      if (!r.donnees) return;
      setSegments(r.donnees.segments);
      setCouverture(r.donnees.couverture);
      setSeuilAtteint(r.donnees.seuilAtteint);
      setStatut(r.donnees.statut);
    },
    [formation.id]
  );

  /* ---------------- boucle de relevé ---------------- */

  React.useEffect(() => {
    if (!pret) return;
    const minuteur = setInterval(() => {
      const c = controle.current;
      if (!c) return;
      const p = c.position();
      const joue = c.enLecture();
      setPosition(p);
      setEnLecture(joue);

      suivi.current = integrerReleve(
        suivi.current,
        { position: p, horloge: performance.now(), vitesse: c.vitesse(), enLecture: joue },
        regles
      );

      // Barrière : la lecture s'arrête sur le quiz, qui s'ouvre aussitôt.
      if (barriere && p >= barriere.tempsSec - 0.25 && !quiz && !ouvertureQuiz) {
        c.pause();
        c.aller(barriere.tempsSec);
        void ouvrirQuiz(barriere.id);
        return;
      }

      if (joue && Date.now() - dernierSync.current > PERIODE_SYNC) void synchroniser(null);
    }, PERIODE_RELEVE);
    return () => clearInterval(minuteur);
  }, [pret, barriere, quiz, ouvertureQuiz, ouvrirQuiz, synchroniser, regles]);

  /* ---------------- reprise d'un quiz laissé ouvert ---------------- */

  const quizAReprendre = React.useRef(d.progression.quizEnCoursId);
  React.useEffect(() => {
    if (!pret || !quizAReprendre.current) return;
    const id = quizAReprendre.current;
    quizAReprendre.current = null;
    void ouvrirQuiz(id);
  }, [pret, ouvrirQuiz]);

  /* ---------------- onglet masqué, départ de la page ---------------- */

  const quizOuvertId = quiz?.point.id ?? null;
  const dernierQuizOuvert = React.useRef<string | null>(null);
  dernierQuizOuvert.current = quizOuvertId;

  React.useEffect(() => {
    const surMasquage = () => {
      if (document.visibilityState === "hidden") {
        controle.current?.pause();
        void synchroniser(dernierQuizOuvert.current);
      }
    };
    document.addEventListener("visibilitychange", surMasquage);
    return () => document.removeEventListener("visibilitychange", surMasquage);
  }, [synchroniser]);

  // Dernier enregistrement en quittant la page : le quiz ouvert est mémorisé
  // pour qu'on y revienne exactement à la reprise.
  React.useEffect(
    () => () => {
      void synchroniser(dernierQuizOuvert.current);
    },
    [synchroniser]
  );

  /* ---------------- plein écran ---------------- */

  React.useEffect(() => {
    const surChangement = () => setPleinEcran(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", surChangement);
    return () => document.removeEventListener("fullscreenchange", surChangement);
  }, []);

  /* ---------------- raccourcis clavier ---------------- */

  React.useEffect(() => {
    if (quiz || enquete) return;
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      const c = controle.current;
      if (!c) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        basculerLecture();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        aller(c.position() + 5);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        aller(c.position() - 5);
      } else if (e.key === "m") {
        definirMuet(!muet);
      } else if (e.key === "f") {
        basculerPleinEcran();
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, enquete, muet, barriere]);

  /* ---------------- commandes ---------------- */

  function basculerLecture() {
    const c = controle.current;
    if (!c) return;
    if (c.enLecture()) {
      c.pause();
      void synchroniser(null);
    } else {
      // Repartir depuis la barrière relancerait le quiz en boucle.
      if (barriere && c.position() >= barriere.tempsSec - 0.25) {
        void ouvrirQuiz(barriere.id);
        return;
      }
      c.lire();
    }
  }

  function aller(demandee: number) {
    const c = controle.current;
    if (!c) return;
    const { position: cible, quizId } = positionAutorisee(Math.max(0, demandee), integres, realises);
    c.aller(cible);
    setPosition(cible);
    if (quizId) {
      c.pause();
      void ouvrirQuiz(quizId);
    }
  }

  function definirVolume(v: number) {
    controle.current?.definirVolume(v);
    setVolume(v);
  }

  function definirMuet(m: boolean) {
    controle.current?.definirMuet(m);
    setMuet(m);
  }

  function definirVitesse(v: number) {
    controle.current?.definirVitesse(v);
    setVitesse(v);
  }

  function basculerPleinEcran() {
    const el = cadre.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  /* ---------------- fin d'un quiz ---------------- */

  function quizCorrige(c: Correction) {
    const pointId = quiz?.point.id;
    setQuiz(null);
    if (!pointId) return;
    setPoints((ps) =>
      ps.map((p) =>
        p.id === pointId
          ? {
              ...p,
              realise: true,
              reussi: p.reussi || c.reussi,
              meilleurScore: Math.max(p.meilleurScore ?? 0, c.score),
              tentatives: c.numero,
            }
          : p
      )
    );
    setStatut(c.statut);
    void synchroniser(null);
    // Un quiz intégré réussi relance la lecture : l'enchaînement reste fluide.
    if (quiz?.point.type === "INTEGRE") {
      setTimeout(() => controle.current?.lire(), 150);
    }
  }

  /* ---------------- rendu ---------------- */

  const seuilPct = Math.round(regles.seuil * 100);
  const finalOuvrable = seuilAtteint && tousIntegresFaits && pointFinal && !pointFinal.reussi;
  const enqueteOuvrable = statut === "ENQUETE_REQUISE" && !d.enqueteChaudFaite;

  return (
    <div className="space-y-5">
      <div ref={cadre} className="relative overflow-hidden rounded-2xl bg-black">
        <div className="relative aspect-video w-full">
          {erreurVideo ? (
            <div className="flex h-full items-center justify-center p-6">
              <EtatErreur
                titre="Vidéo indisponible"
                description={erreurVideo}
                action={
                  <Bouton variante="contour" onClick={() => router.refresh()}>
                    Recharger
                  </Bouton>
                }
              />
            </div>
          ) : (
            <SurfaceVideo
              fournisseur={formation.fournisseurVideo as CodeFournisseur}
              reference={formation.referenceVideo}
              debut={d.progression.positionSec}
              onPret={(c) => {
                controle.current = c;
                setDuree(c.duree() || formation.dureeSec);
                setVolume(c.volume());
                setMuet(c.muet());
                setPret(true);
              }}
              onEtat={(e) => {
                if (e === "fin") void synchroniser(null);
              }}
              onErreur={(m) => setErreurVideo(m)}
            />
          )}

          {!pret && !erreurVideo ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <Loader2 className="h-7 w-7 animate-spin text-white/70" aria-hidden />
              <span className="sr-only">Chargement de la vidéo</span>
            </div>
          ) : null}

          {/* Voile de départ : on ne lance pas la lecture à l'insu du membre. */}
          {pret && !enLecture && !quiz && !ouvertureQuiz && position < 0.5 ? (
            <button
              type="button"
              onClick={basculerLecture}
              className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors hover:bg-black/25"
              aria-label="Lancer la lecture"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105">
                <Play className="h-7 w-7 fill-current text-white" aria-hidden />
              </span>
            </button>
          ) : null}

          {ouvertureQuiz ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
              <span className="sr-only">Ouverture du quiz</span>
            </div>
          ) : null}

          {bloque && !quiz ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-6">
              <div className="max-w-sm rounded-2xl bg-card p-5 text-center">
                <p className="text-[15px] font-bold">La lecture est en attente d'un quiz</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{bloque}</p>
                <Bouton
                  className="mt-4"
                  onClick={() => {
                    const id = echecQuiz.current ?? barriere?.id;
                    if (id) void ouvrirQuiz(id, true);
                  }}
                >
                  Réessayer d'ouvrir le quiz
                </Bouton>
              </div>
            </div>
          ) : null}

          {/* Quiz et enquête se posent sur la vidéo : la lecture est vraiment bloquée. */}
          {quiz ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-3 sm:p-6">
              <PanneauQuiz
                point={quiz.point}
                questions={quiz.questions}
                seuilFinal={regles.seuilFinal}
                couleur={formation.domaine.couleur}
                onRevoir={
                  quiz.point.type === "INTEGRE" && quiz.point.tempsSec !== null
                    ? () => {
                        const retour = Math.max(0, quiz.point.tempsSec! - 30);
                        setQuiz(null);
                        controle.current?.aller(retour);
                        setPosition(retour);
                        controle.current?.lire();
                      }
                    : undefined
                }
                onFermer={quiz.point.type === "FINAL" ? () => setQuiz(null) : undefined}
                onTermine={quizCorrige}
              />
            </div>
          ) : null}

          {enquete ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-3 sm:p-6">
              <EnqueteChaud
                formationId={formation.id}
                titre={formation.titre}
                competences={d.competencesVisees}
                couleur={formation.domaine.couleur}
                onEnvoyee={(s) => {
                  setStatut(s);
                  setEnquete(false);
                  toast({
                    titre: s === "TERMINEE" ? "Formation terminée" : "Enquête enregistrée",
                    description:
                      s === "TERMINEE"
                        ? "Vos compétences et votre expérience ont été mises à jour."
                        : undefined,
                    ton: "succes",
                  });
                  router.refresh();
                }}
              />
            </div>
          ) : null}
        </div>

        {pret && !erreurVideo ? (
          <div className={cn("absolute inset-x-0 bottom-0", (quiz || enquete) && "pointer-events-none opacity-0")}>
            <BarreLecture
              position={position}
              duree={duree}
              segments={segments}
              points={points}
              barriere={barriere?.tempsSec ?? null}
              enLecture={enLecture}
              volume={volume}
              muet={muet}
              vitesse={vitesse}
              pleinEcran={pleinEcran}
              couleur={formation.domaine.couleur}
              vitesseMax={regles.vitesseMax}
              onBasculerLecture={basculerLecture}
              onAller={aller}
              onVolume={definirVolume}
              onMuet={definirMuet}
              onVitesse={definirVitesse}
              onPleinEcran={basculerPleinEcran}
            />
          </div>
        ) : null}
      </div>

      {/* Ce qu'il reste à faire pour valider */}
      <ol className="grid gap-3 sm:grid-cols-3">
        <Etape
          numero={1}
          titre={`Voir ${seuilPct} % de la vidéo`}
          detail={`${Math.round(couverture * 100)} % comptabilisés`}
          faite={seuilAtteint}
          couleur={formation.domaine.couleur}
          progression={Math.min(1, couverture / Math.max(0.01, regles.seuil))}
        />
        <Etape
          numero={2}
          titre={pointFinal ? "Réussir les quiz" : "Faire les quiz"}
          detail={
            integres.length
              ? `${realises.size} / ${integres.length} quiz faits${pointFinal ? (pointFinal.reussi ? " · final réussi" : " · final à passer") : ""}`
              : pointFinal
                ? pointFinal.reussi
                  ? "Quiz final réussi"
                  : "Quiz final à passer"
                : "Pas de quiz sur cette formation"
          }
          faite={tousIntegresFaits && (!pointFinal || pointFinal.reussi)}
          couleur={formation.domaine.couleur}
          progression={
            (realises.size + (pointFinal?.reussi ? 1 : 0)) / Math.max(1, integres.length + (pointFinal ? 1 : 0))
          }
          action={
            finalOuvrable ? (
              <Bouton taille="sm" onClick={() => void ouvrirQuiz(pointFinal.id)}>
                <ClipboardCheck className="h-4 w-4" aria-hidden />
                Passer le quiz final
              </Bouton>
            ) : undefined
          }
        />
        <Etape
          numero={3}
          titre="Remplir l'enquête"
          detail={
            statut === "TERMINEE"
              ? "Formation validée"
              : enqueteOuvrable
                ? "Dernière étape"
                : "S'ouvre après la vidéo et les quiz"
          }
          faite={statut === "TERMINEE"}
          couleur={formation.domaine.couleur}
          progression={statut === "TERMINEE" ? 1 : 0}
          action={
            enqueteOuvrable ? (
              <Bouton taille="sm" onClick={() => setEnquete(true)}>
                Remplir l'enquête
              </Bouton>
            ) : undefined
          }
        />
      </ol>

      {statut === "TERMINEE" ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-success/30 bg-success-soft/70 p-5">
          <Award className="h-6 w-6 shrink-0 text-success" aria-hidden />
          <p className="min-w-48 flex-1 text-sm leading-relaxed">
            Formation validée. Vos compétences ont été recalculées — l'évaluation à froid, dans un mois, confirmera
            ce que vous avez vraiment mis en pratique.
          </p>
          <div className="flex gap-2">
            <Link href="/competences" className="text-[13px] font-semibold text-primary hover:underline">
              Voir mes compétences
            </Link>
            <Link href="/catalogue" className="text-[13px] font-semibold text-primary hover:underline">
              Continuer à apprendre
            </Link>
          </div>
        </div>
      ) : (
        <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Seul le temps réellement regardé est compté : avancer le curseur ne fait pas progresser, et la lecture
          s'arrête sur chaque quiz. C'est ce qui donne de la valeur à vos compétences.
        </p>
      )}
    </div>
  );
}

function Etape({
  numero,
  titre,
  detail,
  faite,
  couleur,
  progression,
  action,
}: {
  numero: number;
  titre: string;
  detail: string;
  faite: boolean;
  couleur: string;
  progression: number;
  action?: React.ReactNode;
}) {
  return (
    <li className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-muted">
        <span
          className="block h-full transition-[width] duration-700"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, progression)) * 100)}%`, background: faite ? "var(--success)" : couleur }}
        />
      </span>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            faite ? "bg-success text-white" : "bg-muted text-muted-foreground"
          )}
          aria-hidden
        >
          {faite ? "✓" : numero}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-snug">{titre}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
          {action ? <div className="mt-2.5">{action}</div> : null}
        </div>
      </div>
    </li>
  );
}
