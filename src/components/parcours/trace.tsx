import Link from "next/link";
import { Check, Lock, Play } from "lucide-react";
import { Pastille } from "@/components/ui/pastille";
import { cn } from "@/lib/utils";
import type { EtapeParcours } from "@/server/requetes/parcours";
import { NIVEAUX } from "@/services/catalogue";
import { formaterDuree } from "@/services/visionnage";

/**
 * Tracé d'un parcours : les étapes s'enchaînent sur une ligne qui se remplit
 * au fur et à mesure. On lit sa progression d'un coup d'œil, et la prochaine
 * étape se distingue des autres sans texte supplémentaire.
 *
 * Rien n'est verrouillé : l'ordre guide, il n'interdit pas. Ce qui bloque,
 * c'est le quiz à l'intérieur d'une formation, pas le parcours.
 */
export function TraceParcours({
  etapes,
  couleur,
  prochaineId,
}: {
  etapes: EtapeParcours[];
  couleur: string;
  prochaineId: string | null;
}) {
  return (
    <ol className="relative">
      {etapes.map((e, i) => {
        const terminee = e.statut === "TERMINEE";
        const commencee = e.statut !== null && !terminee;
        const prochaine = e.id === prochaineId;
        const suivanteTerminee = etapes[i + 1]?.statut === "TERMINEE";
        const dernier = i === etapes.length - 1;

        return (
          <li key={e.id} className="relative flex gap-4 pb-4 last:pb-0">
            {/* Ligne de liaison */}
            {!dernier ? (
              <span
                aria-hidden
                className="absolute left-5 top-11 bottom-0 w-0.5 rounded-full bg-border"
                style={terminee && suivanteTerminee ? { background: "var(--success)" } : terminee ? { background: `color-mix(in srgb, ${couleur} 45%, var(--border))` } : undefined}
              />
            ) : null}

            {/* Pastille d'étape */}
            <span
              className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-4 ring-background",
                terminee ? "bg-success text-white" : prochaine ? "text-white" : commencee ? "text-white" : "bg-muted text-muted-foreground"
              )}
              style={!terminee && (prochaine || commencee) ? { background: couleur } : undefined}
              aria-hidden
            >
              {terminee ? <Check className="h-5 w-5" strokeWidth={3} /> : e.ordre}
              {prochaine ? (
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-40"
                  style={{ background: couleur, animationDuration: "2.4s" }}
                />
              ) : null}
            </span>

            <Link
              href={`/formations/${e.formation.slug}`}
              className={cn(
                "group min-w-0 flex-1 rounded-2xl border p-4 transition-colors",
                prochaine ? "border-transparent bg-card shadow-[0_6px_20px_-14px_rgb(5_41_49/0.5)]" : "border-border bg-card hover:border-foreground/25"
              )}
              style={prochaine ? { boxShadow: `inset 0 0 0 2px ${couleur}` } : undefined}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-bold leading-snug group-hover:text-primary">{e.titre}</h3>
                {terminee ? (
                  <Pastille ton="succes">Terminée</Pastille>
                ) : commencee ? (
                  <Pastille couleur={couleur}>{Math.round(e.couverture * 100)} % vus</Pastille>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{e.formation.resume}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{formaterDuree(e.formation.dureeSec)}</span>
                <span>{NIVEAUX[e.formation.niveau]}</span>
                {prochaine ? (
                  <span className="inline-flex items-center gap-1 font-bold" style={{ color: `color-mix(in srgb, ${couleur} 75%, var(--foreground))` }}>
                    <Play className="h-3 w-3 fill-current" aria-hidden />
                    {commencee ? "Reprendre ici" : "Commencer ici"}
                  </span>
                ) : null}
              </p>
            </Link>
          </li>
        );
      })}

      {/* Le certificat clôt le tracé */}
      <li className="relative flex gap-4">
        <span
          className={cn(
            "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
            prochaineId === null ? "bg-[var(--or)] text-black" : "bg-muted text-muted-foreground"
          )}
          aria-hidden
        >
          {prochaineId === null ? <Check className="h-5 w-5" strokeWidth={3} /> : <Lock className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1 pt-2">
          <p className="text-[15px] font-bold">Certificat du parcours</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {prochaineId === null
              ? "Toutes les étapes sont terminées : le certificat est émis."
              : "Émis automatiquement une fois toutes les étapes terminées."}
          </p>
        </div>
      </li>
    </ol>
  );
}
