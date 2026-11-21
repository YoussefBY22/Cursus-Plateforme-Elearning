import { notFound } from "next/navigation";
import { CheckCircle2, Clock, PauseCircle, Users } from "lucide-react";
import { AttributionCharge, CarnetSuivi } from "@/components/admin/carnet-suivi";
import { Avatar } from "@/components/ui/avatar";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { Stat } from "@/components/ui/stat";
import { BarreProgression } from "@/components/ui/barre-progression";
import { formaterPourcentage, formaterNombre } from "@/services/rapports";
import { chargesDisponibles, detailSuivi } from "@/server/requetes/admin-suivi";
import { exigerPermissionPage } from "@/server/session";
import { can, estAdmin } from "@/services/rbac";
import { formaterVariation, LIBELLES_ETAT_JE } from "@/services/tendances";

export async function generateMetadata({ params }: PageProps<"/admin/suivi/[id]">) {
  const { id } = await params;
  const d = await detailSuivi(id);
  return { title: d ? `Suivi — ${d.je.nom}` : "Suivi" };
}

export default async function PageFicheSuivi({ params }: PageProps<"/admin/suivi/[id]">) {
  const u = await exigerPermissionPage("suivi", "lire");
  const { id } = await params;
  const d = await detailSuivi(id);
  if (!d) notFound();

  // Un chargé de suivi n'ouvre que les organisations de son portefeuille.
  const vueGlobale = estAdmin(u.roles);
  if (!vueGlobale && d.je.chargeSuiviId !== u.id) notFound();

  const peutAttribuer = can(u.roles, "suivi", "valider");
  const peutEcrire = can(u.roles, "suivi", "ecrire");
  const l = d.ligne;
  const charges = peutAttribuer ? await chargesDisponibles() : [];

  return (
    <div>
      <EntetePage
        titre={d.je.nom}
        description={[d.je.sigle, d.je.ecole, d.je.ville].filter(Boolean).join(" · ") || "Organisation"}
        retour={{ href: "/admin/suivi", libelle: "Suivi des organisations" }}
        actions={l ? <Pastille ton={LIBELLES_ETAT_JE[l.etat].ton}>{LIBELLES_ETAT_JE[l.etat].libelle}</Pastille> : null}
      />

      {l ? (
        <section aria-label="Activité sur 30 jours" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            libelle="Membres actifs"
            valeur={`${l.membresActifs} / ${l.membres}`}
            icone={<Users size={16} />}
            indice="Au moins une minute de formation sur 30 jours"
          />
          <Stat
            libelle="Formations terminées"
            valeur={l.terminees}
            icone={<CheckCircle2 size={16} />}
            accent="var(--success)"
            indice={`${formaterVariation(l.variation)} par rapport aux 30 jours précédents`}
          />
          <Stat
            libelle="Heures vues"
            valeur={formaterNombre(l.heures, 1)}
            icone={<Clock size={16} />}
            accent="var(--turquoise)"
            indice="Segments réellement regardés"
          />
          <Stat
            libelle="Formations à l'arrêt"
            valeur={l.enPanne}
            icone={<PauseCircle size={16} />}
            accent={l.enPanne > 0 ? "var(--warning)" : undefined}
            indice={`Sur ${l.enCours} commencée${l.enCours > 1 ? "s" : ""}`}
          />
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Carte>
          <EnteteCarte
            titre="Formations à l'arrêt"
            description="Commencées puis laissées de côté depuis plus de deux semaines. Ce sont les relances les plus faciles à faire."
          />
          <CorpsCarte>
            {d.enPanne.length === 0 ? (
              <EtatVide
                icone={<PauseCircle size={22} />}
                titre="Rien ne traîne"
                description="Aucune formation commencée n'est restée sans activité depuis deux semaines."
              />
            ) : (
              <ul className="divide-y divide-border">
                {d.enPanne.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar nom={p.membre} photo={p.photo} taille="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{p.membre}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.formation}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <BarreProgression valeur={p.part} />
                        <span className="shrink-0 text-xs text-muted-foreground">{formaterPourcentage(p.part)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-warning">arrêtée depuis {p.jours} j</span>
                  </li>
                ))}
              </ul>
            )}
          </CorpsCarte>
        </Carte>

        <div className="space-y-6">
          {peutAttribuer ? (
            <AttributionCharge jeId={d.je.id} chargeActuelId={d.je.chargeSuiviId} charges={charges} />
          ) : null}
          <CarnetSuivi jeId={d.je.id} notes={d.notes} peutEcrire={peutEcrire} />
        </div>
      </div>
    </div>
  );
}
