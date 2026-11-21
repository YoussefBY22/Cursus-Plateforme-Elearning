import Link from "next/link";
import { BadgeCheck, Clock, LinkIcon, OctagonX, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * Habillage de la page publique de vérification (/v/[jeton]) — ce que voit
 * un recruteur qui scanne le QR code. Aucune barre latérale, aucun lien vers
 * l'espace membre : une page de constat, sobre et sans ambiguïté.
 */

export function MiseEnPageVerification({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-[17px]" aria-label="Cursus, accueil">
            <Logo />
          </Link>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:text-[13px]">
            <ShieldCheck className="h-4 w-4 text-turquoise" aria-hidden />
            Vérification de certificat
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>Cursus — plateforme de formation en ligne</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4f46e5]" aria-hidden /> Cursus
          </span>
        </div>
      </footer>
    </div>
  );
}

export function BandeauStatut({
  statut,
  titre,
  children,
  numero,
}: {
  statut: "VALIDE" | "REVOQUE";
  titre: string;
  children: React.ReactNode;
  numero: string;
}) {
  const valide = statut === "VALIDE";
  return (
    <section
      aria-labelledby="statut-certificat"
      className={cn(
        "anim-apparition relative overflow-hidden rounded-3xl border p-5 sm:p-7",
        valide ? "border-success/30 bg-success-soft" : "border-danger/30 bg-danger-soft"
      )}
    >
      {/* Rayure de couleur : se lit avant même le texte. */}
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", valide ? "bg-success" : "bg-danger")} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <span
          aria-hidden
          className={cn(
            "anim-echelle relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white sm:h-20 sm:w-20",
            valide ? "bg-success" : "bg-danger"
          )}
        >
          <span className={cn("absolute inset-0 rounded-full opacity-25 ring-8", valide ? "ring-success" : "ring-danger")} />
          {valide ? <BadgeCheck className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={2.2} /> : <OctagonX className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={2.2} />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="statut-certificat" className={cn("titre-page text-[28px] sm:text-[38px]", valide ? "text-success" : "text-danger")}>
            {titre}
          </h1>
          <div className="mt-1.5 text-[15px] leading-relaxed text-foreground/85">{children}</div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-[11px] font-semibold text-muted-foreground">Numéro</p>
          <p className="chiffres font-mono text-base font-bold tracking-tight sm:text-lg">{numero}</p>
        </div>
      </div>
    </section>
  );
}

export function Fiche({ elements }: { elements: { libelle: string; valeur: React.ReactNode; large?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {elements.map((e) => (
        <div key={e.libelle} className={cn("bg-card px-4 py-3.5", e.large ? "sm:col-span-2" : "")}>
          <dt className="text-xs font-semibold text-muted-foreground">{e.libelle}</dt>
          <dd className="mt-1 text-[15px] font-bold leading-snug tracking-tight">{e.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Message unique pour un lien inconnu, mal formé ou ancien : on ne dit jamais lequel. */
export function LienInvalide() {
  return (
    <div className="anim-apparition mx-auto flex max-w-lg flex-col items-center py-10 text-center sm:py-16">
      <span className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-nuit text-white">
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-[#4f46e5] ring-4 ring-background" aria-hidden />
        <LinkIcon className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="titre-page text-[28px] sm:text-[34px]">Ce lien de vérification n&apos;est pas valide</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Vérifiez que l&apos;adresse est complète, ou scannez à nouveau le QR code imprimé sur le certificat. Si le problème
        persiste, demandez au titulaire un lien à jour.
      </p>
    </div>
  );
}

export function TropDeTentatives({ minutes }: { minutes: number }) {
  return (
    <div className="anim-apparition mx-auto flex max-w-lg flex-col items-center py-10 text-center sm:py-16">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-soft text-warning">
        <Clock className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="titre-page text-[28px] sm:text-[34px]">Trop de tentatives</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Cette adresse a consulté beaucoup de certificats en peu de temps. Réessayez dans{" "}
        {minutes <= 1 ? "une minute" : `${minutes} minutes`}.
      </p>
    </div>
  );
}
