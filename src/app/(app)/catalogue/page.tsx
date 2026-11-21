import Link from "next/link";
import { Compass, Play, SearchX } from "lucide-react";
import { CarteFormation } from "@/components/catalogue/carte-formation";
import { FiltresCatalogue } from "@/components/catalogue/filtres";
import { Icone } from "@/components/icones";
import { BarreProgression } from "@/components/ui/barre-progression";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { LienBouton } from "@/components/ui/bouton";
import { pluriel } from "@/lib/utils";
import { aReprendre, domainesDuCatalogue, listeCatalogue } from "@/server/requetes/catalogue";
import {
  cleValide,
  DUREES,
  NIVEAUX,
  TRIS,
  type CodeDuree,
  type CodeNiveau,
  type CodeTri,
} from "@/services/catalogue";
import { exigerPermissionPage } from "@/server/session";
import { formaterDuree, horodatage } from "@/services/visionnage";

export const metadata = { title: "Catalogue" };

export default async function PageCatalogue({ searchParams }: PageProps<"/catalogue">) {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const sp = await searchParams;
  const unique = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const filtres = {
    q: unique(sp.q),
    domaine: unique(sp.domaine),
    niveau: cleValide<CodeNiveau>(unique(sp.niveau), NIVEAUX),
    duree: cleValide<CodeDuree>(unique(sp.duree), DUREES),
    etat: unique(sp.etat),
    tri: cleValide<CodeTri>(unique(sp.tri), TRIS),
  };

  const [domaines, formations, reprendre] = await Promise.all([
    domainesDuCatalogue(),
    listeCatalogue(u.id, filtres),
    aReprendre(u.id, 1),
  ]);

  const total = domaines.reduce((s, d) => s + d.nb, 0);
  const filtree = Boolean(filtres.q || filtres.domaine || filtres.niveau || filtres.duree || filtres.etat);
  const encours = reprendre[0];

  return (
    <div>
      <EntetePage
        titre="Catalogue"
        description={`${total} ${total === 1 ? "formation publiée" : "formations publiées"} par les organisations de la plateforme. Chacune fait progresser des compétences précises de votre profil.`}
      />

      {encours && !filtree ? <ReprendreLaLecture f={encours} /> : null}

      <FiltresCatalogue domaines={domaines} total={total} />

      {formations.length ? (
        <>
          <p className="mb-4 text-[13px] text-muted-foreground">
            {pluriel(formations.length, "formation")}
            {formations.length === 120 ? " (les 120 premières)" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {formations.map((f) => (
              <CarteFormation key={f.id} f={f} />
            ))}
          </div>
        </>
      ) : filtree ? (
        <EtatVide
          icone={<SearchX className="h-6 w-6" />}
          titre="Aucune formation ne correspond"
          description="Élargissez la recherche : retirez un filtre, ou cherchez sur un mot du titre plutôt qu'une phrase entière."
          action={
            <LienBouton href="/catalogue" variante="contour">
              Tout afficher
            </LienBouton>
          }
        />
      ) : (
        <EtatVide
          icone={<Compass className="h-6 w-6" />}
          titre="Le catalogue se remplit"
          description="Aucune formation n'est encore publiée. Les responsables du équipe pédagogique en ajoutent au fil des validations — revenez bientôt."
        />
      )}
    </div>
  );
}

/** Bandeau de reprise : la chose la plus utile quand on revient sur le site. */
function ReprendreLaLecture({ f }: { f: Awaited<ReturnType<typeof aReprendre>>[number] }) {
  const couleur = f.domaine.couleur;
  const pct = Math.round(f.progression!.couverture * 100);
  const restant = Math.max(0, f.dureeSec - f.dureeSec * f.progression!.couverture);

  return (
    <section className="mb-8 overflow-hidden rounded-2xl bg-nuit text-nuit-foreground">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div
          className="relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl sm:h-24 sm:w-40"
          style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${couleur} 55%, #0f1226), #181c3a)` }}
        >
          {f.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.imageUrl} alt="" className="h-full w-full object-cover opacity-80" />
          ) : (
            <Icone nom={f.domaine.icone} className="h-9 w-9 text-white/70" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[19px] font-bold tracking-tight text-white">{f.titre}</h2>
          <div className="mt-3 flex items-center gap-3">
            <BarreProgression
              valeur={f.progression!.couverture}
              couleur="#ffffff"
              className="max-w-xs bg-white/20"
              libelle={`${pct} % de la vidéo vue`}
            />
            <span className="shrink-0 text-xs font-semibold tabular-nums text-white/80">{pct} %</span>
          </div>
          <p className="mt-2 text-[13px] text-white/70">
            Reprise à {horodatage(f.dureeSec * f.progression!.couverture)} — il reste {formaterDuree(restant)}.
          </p>
        </div>

        <Link
          href={`/formations/${f.slug}/lecture`}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          Reprendre
        </Link>
      </div>
    </section>
  );
}
