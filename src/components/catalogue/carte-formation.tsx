import Link from "next/link";
import { CirclePlay, Clock, ListChecks } from "lucide-react";
import { Icone } from "@/components/icones";
import { Etoiles } from "@/components/catalogue/etoiles";
import { Pastille } from "@/components/ui/pastille";
import { cn } from "@/lib/utils";
import type { CarteCatalogue } from "@/server/requetes/catalogue";
import { NIVEAUX } from "@/services/catalogue";
import { formaterDuree } from "@/services/visionnage";

/**
 * Carte du catalogue.
 *
 * Le domaine donne son identité à la carte : liseré coloré à gauche et
 * vignette teintée. Une formation commencée porte sa progression sur l'arête
 * haute — on repère d'un coup d'œil ce qui est en cours sans ajouter de barre.
 */
export function CarteFormation({ f, className }: { f: CarteCatalogue; className?: string }) {
  const couleur = f.domaine.couleur;
  const terminee = f.progression?.statut === "TERMINEE";
  const avancement = f.progression?.couverture ?? 0;

  return (
    <Link
      href={`/formations/${f.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgb(5_41_49/0.25)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className
      )}
    >
      {/* Liseré de domaine */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: couleur }} />

      {/* Progression sur l'arête haute */}
      {f.progression ? (
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-muted">
          <span
            className="block h-full"
            style={{ width: `${Math.round((terminee ? 1 : avancement) * 100)}%`, background: terminee ? "var(--success)" : couleur }}
          />
        </span>
      ) : null}

      <div
        className="relative flex h-32 items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${couleur} 16%, var(--card)), color-mix(in srgb, ${couleur} 4%, var(--card)))` }}
      >
        {f.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icone nom={f.domaine.icone} className="h-10 w-10 opacity-45" strokeWidth={1.5} />
        )}
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-nuit/85 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Clock className="h-3 w-3" aria-hidden />
          {formaterDuree(f.dureeSec)}
        </span>
        {terminee ? (
          <span className="absolute left-2 top-2 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">
            Terminée
          </span>
        ) : f.progression ? (
          <span className="absolute left-2 top-2 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold" style={{ color: couleur }}>
            {Math.round(avancement * 100)} % vus
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 pl-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Pastille couleur={couleur}>{f.domaine.nom}</Pastille>
          <span className="text-[11px] font-semibold text-muted-foreground">{NIVEAUX[f.niveau]}</span>
        </div>

        <h3 className="text-[15px] font-bold leading-snug tracking-tight group-hover:text-primary">{f.titre}</h3>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{f.resume}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[11px] text-muted-foreground">
          <Etoiles note={f.note} nb={f.nbNotes} />
          {f.nbQuiz > 0 ? (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              {f.nbQuiz} quiz
            </span>
          ) : null}
          {f.nbInscrits > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CirclePlay className="h-3.5 w-3.5" aria-hidden />
              {f.nbInscrits} inscrits
            </span>
          ) : null}
        </div>

        {f.formateur ? (
          <p className="text-[11px] text-muted-foreground">
            Animée par {f.formateur.prenom} {f.formateur.nom}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
