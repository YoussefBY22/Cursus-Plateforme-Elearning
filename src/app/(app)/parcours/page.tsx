import Link from "next/link";
import { Map as Carte3, Route } from "lucide-react";
import { Icone } from "@/components/icones";
import { Anneau } from "@/components/ui/barre-progression";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { pluriel } from "@/lib/utils";
import { listeParcours, type CarteParcours } from "@/server/requetes/parcours";
import { exigerPermissionPage } from "@/server/session";
import { formaterDuree } from "@/services/visionnage";

export const metadata = { title: "Parcours certifiants" };

export default async function PageParcours() {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const liste = await listeParcours(u.id);
  const encours = liste.filter((p) => p.inscrit && !p.termineLe);
  const termines = liste.filter((p) => p.termineLe);
  const autres = liste.filter((p) => !p.inscrit);

  return (
    <div>
      <EntetePage
        titre="Parcours certifiants"
        description="Une suite de formations qui se tiennent. Terminez toutes les étapes et le certificat est émis automatiquement, vérifiable par QR code."
      />

      {liste.length === 0 ? (
        <EtatVide
          icone={<Carte3 className="h-6 w-6" />}
          titre="Aucun parcours publié"
          description="Les parcours certifiants arrivent. En attendant, le catalogue propose des formations à l'unité."
        />
      ) : (
        <div className="space-y-10">
          {encours.length ? <Groupe titre="En cours" liste={encours} /> : null}
          {autres.length ? <Groupe titre={encours.length || termines.length ? "À découvrir" : "Tous les parcours"} liste={autres} /> : null}
          {termines.length ? <Groupe titre="Terminés" liste={termines} /> : null}
        </div>
      )}
    </div>
  );
}

function Groupe({ titre, liste }: { titre: string; liste: CarteParcours[] }) {
  return (
    <section>
      <h2 className="mb-4 text-[15px] font-bold tracking-tight">{titre}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {liste.map((p) => (
          <CarteDeParcours key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function CarteDeParcours({ p }: { p: CarteParcours }) {
  const avancement = p.nbEtapes > 0 ? p.etapesTerminees / p.nbEtapes : 0;
  const fini = Boolean(p.termineLe);

  return (
    <Link
      href={`/parcours/${p.slug}`}
      className="group relative flex gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-14px_rgb(5_41_49/0.3)]"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: p.domaine.couleur }} />

      <div className="shrink-0 pl-1">
        <Anneau valeur={avancement} taille={56} epaisseur={5} couleur={fini ? "var(--success)" : p.domaine.couleur}>
          {fini ? (
            <Icone nom="Trophy" className="h-5 w-5 text-success" />
          ) : (
            <span className="text-xs font-bold tabular-nums">
              {p.etapesTerminees}/{p.nbEtapes}
            </span>
          )}
        </Anneau>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Pastille couleur={p.domaine.couleur}>
            <Icone nom={p.domaine.icone} className="h-3.5 w-3.5" />
            {p.domaine.nom}
          </Pastille>
          {fini ? <Pastille ton="succes">Certificat obtenu</Pastille> : null}
        </div>
        <h3 className="text-[15px] font-bold leading-snug group-hover:text-primary">{p.titre}</h3>
        {/* La pastille dit déjà le domaine : un sous-titre qui le répète
            n'apporte rien, et un formateur peut le saisir ainsi. */}
        {p.sousTitre && p.sousTitre !== p.domaine.nom ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{p.sousTitre}</p>
        ) : null}
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{p.description}</p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Route className="h-3.5 w-3.5" aria-hidden />
            {pluriel(p.nbEtapes, "étape")}
          </span>
          <span>{formaterDuree(p.dureeSec)} au total</span>
        </p>
      </div>
    </Link>
  );
}
