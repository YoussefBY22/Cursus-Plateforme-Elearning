"use client";

import { sourcesFichier, type CodeFournisseur } from "./fournisseurs";

/**
 * Pilotes vidéo — la partie exécutable de l'abstraction `VideoProvider`.
 *
 * Chaque pilote monte sa vidéo dans un conteneur et rend une `ControleVideo`
 * uniforme. Le lecteur Cursus (barre de progression, marqueurs de quiz,
 * suivi du visionnage) ne connaît que cette interface.
 */

export type ControleVideo = {
  lire(): void;
  pause(): void;
  aller(secondes: number): void;
  position(): number;
  duree(): number;
  vitesse(): number;
  definirVitesse(v: number): void;
  enLecture(): boolean;
  volume(): number;
  definirVolume(v: number): void;
  muet(): boolean;
  definirMuet(m: boolean): void;
  detruire(): void;
};

export type EvenementsVideo = {
  onPret?(controle: ControleVideo): void;
  onEtat?(etat: "lecture" | "pause" | "fin" | "attente"): void;
  onErreur?(message: string): void;
};

export type OptionsPilote = {
  /** Contrôles natifs du fournisseur (studio) ou contrôles Cursus (lecture suivie). */
  controlesNatifs: boolean;
  debut?: number;
};

type Pilote = (
  conteneur: HTMLElement,
  reference: string,
  options: OptionsPilote,
  evenements: EvenementsVideo
) => () => void;

/* ------------------------------------------------------------------ */
/* Fichier (MP4 / WebM)                                                 */
/* ------------------------------------------------------------------ */

const piloteFichier: Pilote = (conteneur, reference, options, ev) => {
  const video = document.createElement("video");
  video.className = "h-full w-full bg-black object-contain";
  video.playsInline = true;
  video.preload = "metadata";
  video.controls = options.controlesNatifs;
  // Pas d'image-dans-l'image ni de téléchargement : on garde la lecture dans le cadre suivi.
  video.setAttribute("disablepictureinpicture", "");
  video.setAttribute("controlslist", "nodownload noplaybackrate");
  for (const s of sourcesFichier(reference)) {
    const source = document.createElement("source");
    source.src = s.src;
    source.type = s.type;
    video.appendChild(source);
  }
  conteneur.appendChild(video);

  const controle: ControleVideo = {
    lire: () => void video.play().catch(() => ev.onEtat?.("pause")),
    pause: () => video.pause(),
    aller: (s) => {
      video.currentTime = Math.max(0, s);
    },
    position: () => video.currentTime || 0,
    duree: () => (Number.isFinite(video.duration) ? video.duration : 0),
    vitesse: () => video.playbackRate,
    definirVitesse: (v) => {
      video.playbackRate = v;
    },
    enLecture: () => !video.paused && !video.ended,
    volume: () => video.volume,
    definirVolume: (v) => {
      video.volume = Math.min(1, Math.max(0, v));
    },
    muet: () => video.muted,
    definirMuet: (m) => {
      video.muted = m;
    },
    detruire: () => {
      video.pause();
      video.remove();
    },
  };

  let pret = false;
  const surMeta = () => {
    if (pret) return;
    pret = true;
    if (options.debut) video.currentTime = options.debut;
    ev.onPret?.(controle);
  };
  const surLecture = () => ev.onEtat?.("lecture");
  const surPause = () => ev.onEtat?.("pause");
  const surFin = () => ev.onEtat?.("fin");
  const surAttente = () => ev.onEtat?.("attente");
  const surErreur = () => ev.onErreur?.("La vidéo n'a pas pu être chargée. Vérifiez votre connexion puis rechargez la page.");
  video.addEventListener("loadedmetadata", surMeta);
  video.addEventListener("play", surLecture);
  video.addEventListener("playing", surLecture);
  video.addEventListener("pause", surPause);
  video.addEventListener("ended", surFin);
  video.addEventListener("waiting", surAttente);
  video.addEventListener("error", surErreur, true);
  if (video.readyState >= 1) surMeta();

  return () => {
    video.removeEventListener("loadedmetadata", surMeta);
    controle.detruire();
  };
};

/* ------------------------------------------------------------------ */
/* YouTube (IFrame Player API)                                          */
/* ------------------------------------------------------------------ */

type LecteurYT = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, autoriser: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  setPlaybackRate(v: number): void;
  getPlayerState(): number;
  getVolume(): number;
  setVolume(v: number): void;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  destroy(): void;
};

type ApiYT = {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: Record<string, (e: { data: number; target: LecteurYT }) => void>;
    }
  ) => LecteurYT;
};

declare global {
  interface Window {
    YT?: ApiYT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let chargementApi: Promise<ApiYT> | null = null;

/** Charge l'API IFrame une seule fois pour toute la page. */
function apiYoutube(): Promise<ApiYT> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (chargementApi) return chargementApi;
  chargementApi = new Promise<ApiYT>((resoudre, rejeter) => {
    const precedent = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      precedent?.();
      if (window.YT) resoudre(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      chargementApi = null;
      rejeter(new Error("api"));
    };
    document.head.appendChild(script);
    setTimeout(() => rejeter(new Error("delai")), 15000);
  });
  return chargementApi;
}

const piloteYoutube: Pilote = (conteneur, reference, options, ev) => {
  let lecteur: LecteurYT | null = null;
  let detruit = false;
  const cible = document.createElement("div");
  cible.className = "h-full w-full";
  conteneur.appendChild(cible);

  apiYoutube()
    .then((YT) => {
      if (detruit) return;
      lecteur = new YT.Player(cible, {
        // Domaine sans cookie de suivi publicitaire.
        host: "https://www.youtube-nocookie.com",
        videoId: reference,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: options.controlesNatifs ? 1 : 0,
          // Clavier natif coupé en lecture suivie : les flèches ne doivent pas sauter un quiz.
          disablekb: options.controlesNatifs ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          fs: options.controlesNatifs ? 1 : 0,
          start: Math.floor(options.debut ?? 0),
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            const p = e.target;
            ev.onPret?.({
              lire: () => p.playVideo(),
              pause: () => p.pauseVideo(),
              aller: (s) => p.seekTo(Math.max(0, s), true),
              position: () => p.getCurrentTime() || 0,
              duree: () => p.getDuration() || 0,
              vitesse: () => p.getPlaybackRate() || 1,
              definirVitesse: (v) => p.setPlaybackRate(v),
              // 1 = lecture, 3 = mise en mémoire tampon pendant la lecture.
              enLecture: () => p.getPlayerState() === 1,
              volume: () => (p.getVolume() ?? 100) / 100,
              definirVolume: (v) => p.setVolume(Math.round(Math.min(1, Math.max(0, v)) * 100)),
              muet: () => p.isMuted(),
              definirMuet: (m) => (m ? p.mute() : p.unMute()),
              detruire: () => p.destroy(),
            });
          },
          onStateChange: (e) => {
            if (e.data === 1) ev.onEtat?.("lecture");
            else if (e.data === 2) ev.onEtat?.("pause");
            else if (e.data === 0) ev.onEtat?.("fin");
            else if (e.data === 3) ev.onEtat?.("attente");
          },
          onError: () =>
            ev.onErreur?.("Cette vidéo YouTube est indisponible (supprimée, privée ou bloquée). Prévenez le formateur."),
        },
      });
    })
    .catch(() =>
      ev.onErreur?.("Le lecteur YouTube n'a pas pu se charger. Vérifiez votre connexion (ou un bloqueur de contenu) puis rechargez.")
    );

  return () => {
    detruit = true;
    try {
      lecteur?.destroy();
    } catch {
      // déjà détruit
    }
    conteneur.innerHTML = "";
  };
};

export const PILOTES: Record<CodeFournisseur, Pilote> = {
  YOUTUBE: piloteYoutube,
  MP4: piloteFichier,
};
