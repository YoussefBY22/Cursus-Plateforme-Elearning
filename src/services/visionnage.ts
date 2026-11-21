/**
 * Seuil de visionnage — logique pure, testée.
 *
 * Une formation de deux heures n'est pas « vue » parce que le curseur a été
 * tiré jusqu'à la fin. On compte donc le **temps réellement regardé** :
 *
 *  1. le lecteur relève, toutes les ~250 ms, la position de la vidéo ;
 *  2. deux relevés consécutifs forment un segment **seulement si** la
 *     progression est continue : la position a avancé d'au plus
 *     `écoulé réel × vitesseMax + tolérance`. Un saut (seek, clic sur la
 *     barre) casse le segment ; une lecture à ×4 ne compte pas ;
 *  3. les segments sont **fusionnés** : revoir trois fois la même minute ne
 *     compte qu'une minute ;
 *  4. la formation est vue quand la couverture unique atteint le seuil
 *     (90 % par défaut) de la durée.
 *
 * Le serveur ne croit pas le client sur parole : il revérifie que la durée
 * des segments reçus tient dans le temps réel écoulé depuis la dernière
 * synchronisation (voir `segmentsPlausibles`).
 */

export type Segment = [debut: number, fin: number];

export type ReglesVisionnage = {
  /** Part de la durée à couvrir, entre 0,5 et 1. */
  seuil: number;
  /** Au-delà de cette vitesse de lecture, le temps ne compte pas. */
  vitesseMax: number;
  /** Marge (s) entre deux relevés avant de conclure à un saut. */
  toleranceSaut: number;
};

export const REGLES_VISIONNAGE_DEFAUT: ReglesVisionnage = {
  seuil: 0.9,
  vitesseMax: 2,
  toleranceSaut: 1.5,
};

/** Arrondi au dixième de seconde : assez fin, et les JSON restent courts. */
function arrondir(s: number): number {
  return Math.round(s * 10) / 10;
}

/** Fusionne des intervalles qui se chevauchent ou se touchent (à 0,5 s près). */
export function fusionnerSegments(segments: Segment[], jointure = 0.5): Segment[] {
  const valides = segments
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .map(([a, b]) => [Math.max(0, a), b] as Segment)
    .sort((x, y) => x[0] - y[0]);

  const fusion: Segment[] = [];
  for (const [a, b] of valides) {
    const dernier = fusion[fusion.length - 1];
    if (dernier && a <= dernier[1] + jointure) {
      dernier[1] = Math.max(dernier[1], b);
    } else {
      fusion.push([a, b]);
    }
  }
  return fusion.map(([a, b]) => [arrondir(a), arrondir(b)] as Segment);
}

/** Secondes uniques couvertes, bornées à la durée de la vidéo. */
export function secondesCouvertes(segments: Segment[], duree: number): number {
  return arrondir(
    fusionnerSegments(segments).reduce((total, [a, b]) => {
      const debut = Math.min(a, duree);
      const fin = Math.min(b, duree);
      return total + Math.max(0, fin - debut);
    }, 0)
  );
}

export function couverture(segments: Segment[], duree: number): number {
  if (duree <= 0) return 0;
  return Math.min(1, secondesCouvertes(segments, duree) / duree);
}

export function seuilAtteint(
  segments: Segment[],
  duree: number,
  regles: ReglesVisionnage = REGLES_VISIONNAGE_DEFAUT
): boolean {
  return couverture(segments, duree) >= regles.seuil - 1e-9;
}

/* ------------------------------------------------------------------ */
/* Côté lecteur : transformer des relevés en segments                  */
/* ------------------------------------------------------------------ */

export type Releve = {
  /** Position dans la vidéo (s). */
  position: number;
  /** Horloge murale (ms), `performance.now()` côté navigateur. */
  horloge: number;
  /** Vitesse de lecture déclarée par le lecteur. */
  vitesse: number;
  /** La vidéo jouait-elle au moment du relevé ? */
  enLecture: boolean;
};

export type EtatSuivi = {
  precedent: Releve | null;
  /** Segment en cours de construction. */
  courant: Segment | null;
  /** Segments terminés depuis la dernière synchronisation. */
  termines: Segment[];
  /** Nombre de sauts détectés (affiché dans les rapports, pas bloquant). */
  sauts: number;
};

export function etatSuiviInitial(): EtatSuivi {
  return { precedent: null, courant: null, termines: [], sauts: 0 };
}

/**
 * Intègre un relevé. Fonction pure : renvoie un nouvel état.
 *
 * Le segment courant ne s'allonge que si la vidéo jouait aux deux relevés,
 * à une vitesse admise, et que la position a avancé de façon plausible.
 */
export function integrerReleve(
  etat: EtatSuivi,
  releve: Releve,
  regles: ReglesVisionnage = REGLES_VISIONNAGE_DEFAUT
): EtatSuivi {
  const p = etat.precedent;
  const suivant: EtatSuivi = { ...etat, termines: [...etat.termines], precedent: releve };

  const cloturer = () => {
    if (suivant.courant && suivant.courant[1] - suivant.courant[0] > 0.05) {
      suivant.termines.push(suivant.courant);
    }
    suivant.courant = null;
  };

  if (!p || !p.enLecture || !releve.enLecture) {
    cloturer();
    return suivant;
  }

  const ecouleReel = Math.max(0, (releve.horloge - p.horloge) / 1000);
  const avance = releve.position - p.position;
  const vitesseAdmise = releve.vitesse <= regles.vitesseMax + 1e-9;
  const plausible =
    avance >= -0.05 && avance <= ecouleReel * regles.vitesseMax + regles.toleranceSaut;

  if (!vitesseAdmise || !plausible) {
    if (!plausible) suivant.sauts += 1;
    cloturer();
    return suivant;
  }

  if (avance <= 0) return suivant;
  if (suivant.courant && Math.abs(suivant.courant[1] - p.position) < 0.6) {
    suivant.courant = [suivant.courant[0], releve.position];
  } else {
    cloturer();
    suivant.courant = [p.position, releve.position];
  }
  return suivant;
}

/** Segments à envoyer au serveur ; l'état repart à vide mais garde le fil. */
export function vider(etat: EtatSuivi): { segments: Segment[]; etat: EtatSuivi } {
  const segments = [...etat.termines];
  let courant = etat.courant;
  if (courant && courant[1] - courant[0] > 0.05) {
    segments.push(courant);
    // Le segment reprend à sa fin : le prochain envoi ne recompte rien.
    courant = [courant[1], courant[1]];
  }
  return {
    segments: segments.map(([a, b]) => [arrondir(a), arrondir(b)] as Segment),
    etat: { ...etat, termines: [], courant },
  };
}

/* ------------------------------------------------------------------ */
/* Côté serveur : ne croire que ce qui est possible                    */
/* ------------------------------------------------------------------ */

/**
 * Garde les segments plausibles au regard du temps réel écoulé depuis la
 * dernière synchronisation. Un client modifié qui enverrait « j'ai vu
 * 0 → 7200 » après dix secondes se voit rogner à dix secondes × vitesseMax.
 */
export function segmentsPlausibles(
  segments: Segment[],
  ecouleReelSec: number,
  duree: number,
  regles: ReglesVisionnage = REGLES_VISIONNAGE_DEFAUT
): Segment[] {
  let budget = Math.max(0, ecouleReelSec) * regles.vitesseMax + regles.toleranceSaut * 2;
  const retenus: Segment[] = [];
  for (const [a0, b0] of segments) {
    const a = Math.max(0, Math.min(a0, duree));
    const b = Math.max(0, Math.min(b0, duree));
    if (!(b > a) || budget <= 0) continue;
    const longueur = Math.min(b - a, budget);
    retenus.push([a, a + longueur]);
    budget -= longueur;
  }
  return retenus;
}

/** Formate 3725 s en « 1 h 02 », 185 s en « 3 min ». */
export function formaterDuree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

/** Horodatage de lecteur : 754 → « 12:34 », 3725 → « 1:02:05 ». */
export function horodatage(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}
