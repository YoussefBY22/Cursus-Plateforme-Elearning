"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Champ, Groupe, Selecteur } from "@/components/ui/champ";
import { inscription, type EtatFormulaire } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

function forceMotDePasse(m: string): number {
  let f = 0;
  if (m.length >= 8) f++;
  if (m.length >= 12) f++;
  if (/[A-Z]/.test(m) && /[a-z]/.test(m)) f++;
  if (/\d/.test(m) && /[^A-Za-z0-9]/.test(m)) f++;
  return f;
}

export function FormulaireInscription({
  jes,
  departements,
}: {
  jes: { id: string; nom: string; ville: string | null }[];
  departements: { code: string; nom: string }[];
}) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(inscription, {});
  // Champs contrôlés : React 19 réinitialise un formulaire dès que son
  // action se termine. Sans cela, une erreur de validation ferait retaper
  // tout le formulaire — la faute la plus agaçante d'une inscription.
  const [saisie, setSaisie] = React.useState({
    prenom: "",
    nom: "",
    email: "",
    motDePasse: "",
    jeId: "",
    departement: "",
  });
  const champ = (cle: keyof typeof saisie) => ({
    value: saisie[cle],
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setSaisie((s) => ({ ...s, [cle]: ev.target.value })),
  });
  const force = forceMotDePasse(saisie.motDePasse);
  const e = etat.erreurs ?? {};

  return (
    <div className="anim-apparition">
      <h1 className="titre-page text-[32px]">Rejoindre Cursus</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Gratuit pour tous les membres des organisations de la plateforme.
      </p>
      <form action={action} className="mt-8 space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Groupe id="prenom" label="Prénom" erreur={e.prenom}>
            <Champ id="prenom" name="prenom" autoComplete="given-name" required aria-invalid={!!e.prenom} {...champ("prenom")} />
          </Groupe>
          <Groupe id="nom" label="Nom" erreur={e.nom}>
            <Champ id="nom" name="nom" autoComplete="family-name" required aria-invalid={!!e.nom} {...champ("nom")} />
          </Groupe>
        </div>
        <Groupe id="email" label="Adresse e-mail" erreur={e.email}>
          <Champ id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!e.email} {...champ("email")} />
        </Groupe>
        <Groupe
          id="motDePasse"
          label="Mot de passe"
          erreur={e.motDePasse}
          aide="8 caractères au moins, avec une lettre et un chiffre."
        >
          <Champ
            id="motDePasse"
            name="motDePasse"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={!!e.motDePasse}
            {...champ("motDePasse")}
          />
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i < force ? (force <= 1 ? "bg-danger" : force === 2 ? "bg-warning" : "bg-success") : "bg-muted"
                )}
              />
            ))}
          </div>
        </Groupe>
        <Groupe id="jeId" label="Votre organisation" aide="Votre responsable RH confirmera votre rattachement.">
          <Selecteur id="jeId" name="jeId" {...champ("jeId")}>
            <option value="">Je choisirai plus tard</option>
            {jes.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nom}
                {j.ville ? ` — ${j.ville}` : ""}
              </option>
            ))}
          </Selecteur>
        </Groupe>
        <Groupe id="departement" label="Votre département">
          <Selecteur id="departement" name="departement" {...champ("departement")}>
            <option value="">Non précisé</option>
            {departements.map((d) => (
              <option key={d.code} value={d.nom}>
                {d.nom}
              </option>
            ))}
          </Selecteur>
        </Groupe>
        {etat.erreur ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {etat.erreur}
          </p>
        ) : null}
        <BoutonSoumission taille="lg" className="w-full" enCours="Création du compte…">
          Créer mon compte
        </BoutonSoumission>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-bold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
