import { CheckCircle2, LinkIcon } from "lucide-react";
import { MiseEnPageAuth } from "@/components/auth/mise-en-page";
import { LienBouton } from "@/components/ui/bouton";
import { verifierEmail } from "@/server/actions/auth";

export const metadata = { title: "Vérification de l'e-mail", robots: { index: false } };

export default async function PageVerification({ params }: PageProps<"/verifier-email/[jeton]">) {
  const { jeton } = await params;
  const resultat = await verifierEmail(jeton);
  return (
    <MiseEnPageAuth>
      {resultat === "ok" ? (
        <div className="anim-apparition text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="titre-page mt-5 text-[28px]">Adresse confirmée</h1>
          <p className="mt-2 text-muted-foreground">Votre badge « Identité vérifiée » vous attend sur votre tableau de bord.</p>
          <LienBouton href="/accueil" taille="lg" className="mt-8">
            Ouvrir mon tableau de bord
          </LienBouton>
        </div>
      ) : (
        <div className="anim-apparition text-center">
          <LinkIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="titre-page mt-5 text-[28px]">Lien expiré ou déjà utilisé</h1>
          <p className="mt-2 text-muted-foreground">
            Les liens de confirmation sont valables 48 heures et ne servent qu&apos;une fois. Demandez-en un nouveau depuis
            votre profil.
          </p>
          <LienBouton href="/profil#email" variante="nuit" taille="lg" className="mt-8">
            Recevoir un nouveau lien
          </LienBouton>
        </div>
      )}
    </MiseEnPageAuth>
  );
}
