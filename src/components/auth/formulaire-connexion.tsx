"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Champ, Groupe } from "@/components/ui/champ";
import { connexion, connexionGoogle, type EtatFormulaire } from "@/server/actions/auth";

export function FormulaireConnexion({ google, suite }: { google: boolean; suite?: string }) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(connexion, {});
  const [email, setEmail] = React.useState("");
  const [voir, setVoir] = React.useState(false);
  return (
    <div className="anim-apparition">
      <h1 className="titre-page text-[32px]">Bon retour parmi nous</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Reprenez votre formation là où vous l&apos;avez laissée.</p>

      {google ? (
        <>
          <form action={connexionGoogle} className="mt-8">
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-card text-sm font-semibold hover:bg-muted"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1Z" />
                <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
              </svg>
              Continuer avec Google
            </button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou avec votre e-mail
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : (
        <div className="mt-8" />
      )}

      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="suite" value={suite ?? "/accueil"} />
        <Groupe id="email" label="Adresse e-mail">
          {/* Contrôlé : React 19 vide un formulaire quand son action se
              termine, et retaper son adresse après un mot de passe raté
              est le genre de détail qui fait abandonner. */}
          <Champ
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="prenom.nom@exemple.test"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
        </Groupe>
        <Groupe id="motDePasse" label="Mot de passe">
          <div className="relative">
            <Champ
              id="motDePasse"
              name="motDePasse"
              type={voir ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setVoir((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {voir ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Groupe>
        {etat.erreur ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {etat.erreur}
          </p>
        ) : null}
        <BoutonSoumission taille="lg" className="w-full" enCours="Connexion…">
          Se connecter
        </BoutonSoumission>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-bold text-primary hover:underline">
          Rejoindre Cursus
        </Link>
      </p>
    </div>
  );
}
