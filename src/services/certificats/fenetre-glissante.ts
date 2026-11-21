/**
 * Limiteur à fenêtre glissante — logique pure, horloge injectée.
 *
 * Chaque clé (une adresse IP) garde l'horodatage de ses requêtes récentes ;
 * au-delà de `limite` requêtes dans les `dureeMs` dernières millisecondes,
 * la requête est refusée et l'on dit dans combien de temps réessayer.
 * Une requête refusée n'est pas comptée : attendre suffit à retrouver l'accès.
 */

export type Decision = {
  autorise: boolean;
  /** Requêtes encore permises dans la fenêtre courante. */
  restant: number;
  /** Délai avant qu'une place se libère (0 si autorisé). */
  reessayerDansMs: number;
};

export class FenetreGlissante {
  private readonly traces = new Map<string, number[]>();

  constructor(
    private readonly limite: number,
    private readonly dureeMs: number,
    /** Au-delà, on purge les clés inactives avant d'en ajouter. */
    private readonly maxCles = 10_000
  ) {
    if (limite < 1 || dureeMs <= 0) throw new Error("Limiteur mal configuré.");
  }

  essayer(cle: string, maintenant: number = Date.now()): Decision {
    const debut = maintenant - this.dureeMs;
    const recentes = (this.traces.get(cle) ?? []).filter((t) => t > debut);

    if (recentes.length >= this.limite) {
      this.traces.set(cle, recentes);
      return { autorise: false, restant: 0, reessayerDansMs: Math.max(0, recentes[0] + this.dureeMs - maintenant) };
    }

    if (!this.traces.has(cle) && this.traces.size >= this.maxCles) this.purger(maintenant);
    recentes.push(maintenant);
    this.traces.set(cle, recentes);
    return { autorise: true, restant: this.limite - recentes.length, reessayerDansMs: 0 };
  }

  /** Oublie les clés sans requête récente ; rend le nombre de clés retirées. */
  purger(maintenant: number = Date.now()): number {
    const debut = maintenant - this.dureeMs;
    let retirees = 0;
    for (const [cle, traces] of this.traces) {
      if (!traces.some((t) => t > debut)) {
        this.traces.delete(cle);
        retirees++;
      }
    }
    return retirees;
  }

  get taille(): number {
    return this.traces.size;
  }
}
