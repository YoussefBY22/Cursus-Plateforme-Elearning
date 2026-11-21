import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, Clock, Route } from "lucide-react";
import { Icone } from "@/components/icones";
import { TraceParcours } from "@/components/parcours/trace";
import { Avatar } from "@/components/ui/avatar";
import { BarreProgression } from "@/components/ui/barre-progression";
import { LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Pastille } from "@/components/ui/pastille";
import { formaterDate, nomComplet, pluriel } from "@/lib/utils";
import { remplirJetons } from "@/services/canevas/canevas";
import { detailParcours } from "@/server/requetes/parcours";
import { exigerPermissionPage } from "@/server/session";
import { formaterDuree } from "@/services/visionnage";

export async function generateMetadata({ params }: PageProps<"/parcours/[slug]">) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function PageParcoursDetail({ params }: PageProps<"/parcours/[slug]">) {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const { slug } = await params;
  const p = await detailParcours(slug, u.id);
  if (!p) notFound();

  const avancement = p.etapes.length ? p.terminees / p.etapes.length : 0;
  const fini = p.terminees === p.etapes.length && p.etapes.length > 0;

  return (
    <div>
      <EntetePage
        retour={{ href: "/parcours", libelle: "Parcours certifiants" }}
        titre={p.titre}
        description={p.sousTitre ?? p.description}
        actions={
          p.prochaine ? (
            <LienBouton href={`/formations/${p.prochaine.formation.slug}/lecture`} taille="lg">
              {p.prochaine.statut ? "Reprendre le parcours" : p.terminees > 0 ? "Poursuivre le parcours" : "Commencer le parcours"}
            </LienBouton>
          ) : p.certificat ? (
            <LienBouton href="/certificats" taille="lg" variante="succes">
              <Award className="h-4 w-4" aria-hidden />
              Voir mon certificat
            </LienBouton>
          ) : undefined
        }
      />

      <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
        <Pastille couleur={p.domaine.couleur}>
          <Icone nom={p.domaine.icone} className="h-3.5 w-3.5" />
          {p.domaine.nom}
        </Pastille>
        <span className="inline-flex items-center gap-1.5">
          <Route className="h-4 w-4" aria-hidden />
          {pluriel(p.etapes.length, "étape")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden />
          {formaterDuree(p.dureeSec)} au total
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-6">
          <Carte>
            <CorpsCarte className="pt-5">
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-semibold">
                  {fini ? "Parcours terminé" : `${p.terminees} étape${p.terminees > 1 ? "s" : ""} sur ${p.etapes.length}`}
                </span>
                <span className="tabular-nums text-muted-foreground">{Math.round(avancement * 100)} %</span>
              </div>
              <BarreProgression
                valeur={avancement}
                couleur={fini ? "var(--success)" : p.domaine.couleur}
                libelle="Avancement du parcours"
              />
            </CorpsCarte>
          </Carte>

          <Carte>
            <EnteteCarte titre="Les étapes" description="Suivez-les dans l'ordre, ou attrapez celle qui vous manque." />
            <CorpsCarte>
              <TraceParcours etapes={p.etapes} couleur={p.domaine.couleur} prochaineId={p.prochaine?.id ?? null} />
            </CorpsCarte>
          </Carte>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Carte>
            <EnteteCarte titre="À propos du parcours" />
            <CorpsCarte>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">{p.description}</p>
            </CorpsCarte>
          </Carte>

          <Carte>
            <EnteteCarte titre="Certificat" />
            <CorpsCarte>
              {p.certificat ? (
                <>
                  <p className="text-[13px] leading-relaxed">
                    Certificat émis le {formaterDate(p.certificat.emisLe)}. Il porte un QR code qui mène à une page de
                    vérification publique.
                  </p>
                  <Link href="/certificats" className="mt-3 inline-block text-[13px] font-semibold text-primary hover:underline">
                    Ouvrir mes certificats
                  </Link>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {p.intituleCertificat
                    ? `À la fin du parcours : « ${remplirJetons(p.intituleCertificat, {
                        parcours: p.titre,
                        domaine: p.domaine.nom,
                        apprenant: u.name ?? "votre nom",
                      })} »`
                    : "Un certificat vérifiable est émis automatiquement une fois toutes les étapes terminées."}
                </p>
              )}
            </CorpsCarte>
          </Carte>

          {p.auteur ? (
            <Carte>
              <EnteteCarte titre="Conçu par" />
              <CorpsCarte>
                <div className="flex items-center gap-3">
                  <Avatar nom={nomComplet(p.auteur)} photo={p.auteur.photoUrl} taille="md" />
                  <p className="min-w-0 truncate text-sm font-bold">{nomComplet(p.auteur)}</p>
                </div>
              </CorpsCarte>
            </Carte>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
