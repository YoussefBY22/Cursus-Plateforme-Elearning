"use client";

import * as React from "react";

/**
 * Temps actif sur la plateforme : un battement par minute, seulement si
 * l'onglet est visible ET qu'il y a eu une interaction (souris, clavier,
 * défilement, vidéo en lecture) dans les deux dernières minutes. Laisser un
 * onglet ouvert toute la nuit ne rapporte rien.
 */
export function Battement() {
  React.useEffect(() => {
    let derniereActivite = Date.now();
    const marquer = () => (derniereActivite = Date.now());
    const evenements = ["pointermove", "keydown", "scroll", "touchstart"];
    evenements.forEach((e) => window.addEventListener(e, marquer, { passive: true }));
    window.addEventListener("cursus:activite", marquer);

    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - derniereActivite > 120_000) return;
      fetch("/api/battement", { method: "POST", keepalive: true })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.nouveautes) window.dispatchEvent(new Event("cursus:verifier"));
        })
        .catch(() => {});
    }, 60_000);

    return () => {
      clearInterval(t);
      evenements.forEach((e) => window.removeEventListener(e, marquer));
      window.removeEventListener("cursus:activite", marquer);
    };
  }, []);
  return null;
}
