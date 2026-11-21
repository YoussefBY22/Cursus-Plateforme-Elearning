import { Avatar } from "@/components/ui/avatar";
import { Icone } from "@/components/icones";
import { cn } from "@/lib/utils";
import type { DomaineProfil } from "@/server/requetes/competences";
import { abreviationsDomaines } from "@/services/radar";

/**
 * Carte de niveau — la vitrine du profil.
 *
 * Une note générale, le palier atteint, et le détail par domaine. Le format
 * est volontairement reconnaissable : ce que les membres d'organisation connaissent
 * d'un jeu de football, appliqué à des compétences réelles.
 */
export function CarteJoueur({
  identite,
  noteGenerale,
  palier,
  domaines,
  className,
}: {
  identite: { nom: string; photo: string | null; je: string | null; xp: number };
  noteGenerale: number;
  palier: { code: string; libelle: string };
  domaines: DomaineProfil[];
  className?: string;
}) {
  const mesures = domaines.filter((d) => d.niveau !== null);
  const sigles = abreviationsDomaines(domaines.map((d) => d.code));

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl text-white",
        "bg-[linear-gradient(145deg,var(--nuit-3),var(--nuit)_55%,#080a18)]",
        className
      )}
    >
      {/* Trame discrète : une lueur, pas un dégradé décoratif de plus. */}
      <span
        aria-hidden
        className="absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--primary)" }}
      />

      <div className="relative flex items-center gap-4 p-5 pb-4">
        <div className="flex flex-col items-center">
          <span className="text-[44px] font-black leading-none tabular-nums">{noteGenerale || "—"}</span>
          <span className="mt-0.5 text-[10px] font-bold tracking-[0.12em] text-white/60">{palier.libelle}</span>
        </div>

        <span aria-hidden className="h-14 w-px bg-white/15" />

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar nom={identite.nom} photo={identite.photo} taille="lg" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{identite.nom}</p>
            {identite.je ? <p className="truncate text-[13px] text-white/70">{identite.je}</p> : null}
            <p className="text-[11px] text-white/55">{identite.xp.toLocaleString("fr-FR")} XP</p>
          </div>
        </div>
      </div>

      {mesures.length ? (
        <dl className="relative grid grid-cols-3 gap-px bg-white/10 text-center">
          {domaines.map((d, i) => (
            <div key={d.id} className="bg-nuit/85 px-2 py-3 backdrop-blur-sm">
              <dt className="flex items-center justify-center gap-1 text-[10px] font-semibold text-white/60">
                <Icone nom={d.icone} className="h-3 w-3" />
                <span className="truncate">{sigles[i]}</span>
              </dt>
              <dd
                className="mt-0.5 text-[17px] font-black tabular-nums"
                style={{
                  // La couleur du domaine est pensée pour un fond clair : telle
                  // quelle, un domaine sombre devient illisible sur la carte.
                  // On l'éclaircit juste assez pour garder la teinte lisible.
                  color:
                    d.niveau === null
                      ? "rgba(255,255,255,.35)"
                      : `color-mix(in srgb, ${d.couleur} 62%, white)`,
                }}
              >
                {d.niveau ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="relative border-t border-white/10 px-5 py-4 text-[13px] leading-relaxed text-white/70">
          Votre carte se remplit dès la première auto-évaluation. Deux minutes par domaine, et vous saurez où vous en
          êtes.
        </p>
      )}
    </div>
  );
}
