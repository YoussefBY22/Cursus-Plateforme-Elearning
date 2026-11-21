/** Retour standard d'une action serveur appelée par un formulaire client. */
export type Resultat<T = undefined> = {
  ok?: boolean;
  erreur?: string;
  erreurs?: Record<string, string>;
  message?: string;
  donnees?: T;
};

/** Convertit les erreurs Zod en { champ: message } pour les formulaires. */
export function erreursZod(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const erreurs: Record<string, string> = {};
  for (const i of issues) erreurs[String(i.path.join("."))] ??= i.message;
  return erreurs;
}

/** Message lisible d'une exception, sans fuite de détails techniques. */
export function messageErreur(err: unknown, defaut = "Une erreur est survenue. Réessayez dans un instant."): string {
  if (err instanceof Error && (err.name === "AccesRefuse" || err.name === "ErreurMetier")) {
    return err.message;
  }
  return defaut;
}

/** Erreur fonctionnelle dont le message peut être montré tel quel. */
export class ErreurMetier extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurMetier";
  }
}
