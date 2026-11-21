import { Award, BookOpen, CheckCircle2, Clock, Gauge, Landmark, Smile, Users } from "lucide-react";
import { BarresHorizontales } from "@/components/graphiques/barres-horizontales";
import { BarresVerticales } from "@/components/graphiques/barres-verticales";
import { CarteChaleur } from "@/components/graphiques/carte-chaleur";
import { couleurLisible } from "@/components/graphiques/couleurs";
import { LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Stat } from "@/components/ui/stat";
import { donneesPilotage } from "@/server/requetes/admin-pilotage";
import { exigerPermissionPage } from "@/server/session";
import { formaterNote } from "@/services/notation";
import { formaterNombre } from "@/services/rapports";

export const metadata = { title: "Pilotage" };

export default async function PagePilotage() {
  await exigerPermissionPage("rapports", "lire");
  const d = await donneesPilotage();
  const i = d.indicateurs;
  const totalDomaines = d.parDomaine.reduce((s, x) => s + x.valeur, 0);
  const jesMesurees = d.jes.filter((j) => d.chaleur.some((c) => c.ligne === j.id));

  return (
    <div>
      <EntetePage
        titre="Pilotage"
        description="L'activité de la plateforme en un coup d'œil : qui se forme, sur quoi, avec quelle satisfaction, et où en sont les compétences de chaque organisation."
        actions={
          <LienBouton href="/admin/rapports" variante="contour">
            Exporter les données
          </LienBouton>
        }
      />

      <section aria-label="Indicateurs clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat libelle="Organisations actives" valeur={i.jesActives} icone={<Landmark size={16} />} indice="Inscrites et ouvertes sur la plateforme" />
        <Stat libelle="Membres actifs" valeur={i.membres.toLocaleString("fr-FR")} icone={<Users size={16} />} indice="Comptes non désactivés" />
        <Stat libelle="Formations publiées" valeur={i.formationsPubliees} icone={<BookOpen size={16} />} indice="Visibles dans le catalogue ou un parcours" />
        <Stat
          libelle="Formations terminées"
          valeur={i.formationsTerminees.toLocaleString("fr-FR")}
          icone={<CheckCircle2 size={16} />}
          accent="var(--success)"
          indice={
            <>
              <span className="font-bold text-success">+{i.formationsTermineesRecentes.toLocaleString("fr-FR")}</span> sur les 30 derniers jours
            </>
          }
        />
        <Stat
          libelle="Heures de vidéo vues"
          valeur={formaterNombre(i.heuresVues, 0)}
          icone={<Clock size={16} />}
          accent="var(--turquoise)"
          indice="Segments réellement regardés, sauts exclus"
        />
        <Stat libelle="Certificats émis" valeur={i.certificats} icone={<Award size={16} />} accent="var(--or)" indice="Non révoqués" />
        <Stat
          libelle="Satisfaction à chaud"
          valeur={
            i.satisfaction === null ? (
              "—"
            ) : (
              <>
                {formaterNote(Math.round(i.satisfaction * 10) / 10)}
                <span className="text-base font-bold text-muted-foreground"> /5</span>
              </>
            )
          }
          icone={<Smile size={16} />}
          accent="var(--primary)"
          indice={`Note de contenu, ${i.reponsesEnquetes.toLocaleString("fr-FR")} réponses`}
        />
        <Stat
          libelle="NPS"
          valeur={i.nps === null ? "—" : `${i.nps > 0 ? "+" : ""}${i.nps}`}
          icone={<Gauge size={16} />}
          accent={i.nps !== null && i.nps < 0 ? "var(--danger)" : "var(--nuit)"}
          indice="% de promoteurs (9–10) moins % de détracteurs (0–6)"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Carte>
          <EnteteCarte titre="Formations terminées par mois" description="Les six derniers mois, mois en cours inclus." />
          <CorpsCarte>
            {d.parMois.every((m) => m.valeur === 0) ? (
              <EtatVide
                compact
                titre="Aucune formation terminée ces six derniers mois"
                description="Relancez les organisations : une formation est terminée quand le membre a vu la vidéo, réussi le quiz et répondu à l'enquête."
              />
            ) : (
              <BarresVerticales donnees={d.parMois} unite="formations terminées" titre="Formations terminées par mois" />
            )}
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte
            titre="Répartition par domaine"
            description={`${totalDomaines.toLocaleString("fr-FR")} formations terminées depuis le lancement.`}
          />
          <CorpsCarte>
            {totalDomaines === 0 ? (
              <EtatVide
                compact
                titre="Pas encore de formation terminée"
                description="La répartition apparaîtra dès la première formation terminée."
              />
            ) : (
              <BarresHorizontales
                titre="Formations terminées par domaine"
                unite="formations terminées"
                donnees={d.parDomaine.map((x) => ({ cle: x.id, libelle: x.libelle, valeur: x.valeur, couleur: x.couleur }))}
              />
            )}
          </CorpsCarte>
        </Carte>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Carte>
          <EnteteCarte titre="Top 5 des formations" description="Classées par nombre de terminaisons, avec la note moyenne des membres." />
          <CorpsCarte>
            {d.top.length === 0 ? (
              <EtatVide compact titre="Classement vide" description="Le classement se remplit à mesure que les membres terminent des formations." />
            ) : (
              <ol className="grid gap-1">
                {d.top.map((f, rang) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50">
                    <span
                      className="chiffres flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                      style={
                        rang === 0
                          ? { background: "var(--or-soft)", color: "color-mix(in srgb, var(--or) 70%, var(--foreground))" }
                          : { background: "var(--muted)", color: "var(--muted-foreground)" }
                      }
                    >
                      {rang + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold" title={f.titre}>
                        {f.titre}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ background: couleurLisible(f.couleur) }} aria-hidden />
                        {f.domaine}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="chiffres block text-sm font-extrabold">{f.n.toLocaleString("fr-FR")}</span>
                      <span className="block text-[11px] text-muted-foreground">terminée{f.n > 1 ? "s" : ""}</span>
                    </span>
                    <span className="w-14 shrink-0 text-right">
                      <span className="chiffres block text-sm font-bold">
                        {f.note === null ? "—" : formaterNote(Math.round(f.note * 10) / 10)}
                        {f.note === null ? null : <span className="text-or"> ★</span>}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">{f.notes} note{f.notes > 1 ? "s" : ""}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre="Par organisation" description="Membres actifs, activité de formation et niveau moyen des compétences mesurées." />
          <CorpsCarte>
            {d.jes.length === 0 ? (
              <EtatVide compact titre="Aucune organisation active" description="Créez les organisations dans l'onglet dédié pour suivre leur activité." />
            ) : (
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[13px] text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 font-medium">Organisation</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Membres</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Terminées</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Heures</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Certificats</th>
                      <th scope="col" className="py-2 font-medium">Niveau moyen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.jes.map((j) => (
                      <tr key={j.id} className="border-b border-border/60 last:border-0">
                        <th scope="row" className="py-2.5 pr-3 text-left font-semibold">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleurLisible(j.couleur) }} aria-hidden />
                            <span className="truncate" title={j.nom}>
                              {j.sigle ?? j.nom}
                            </span>
                          </span>
                        </th>
                        <td className="chiffres py-2.5 pr-3 text-right">{j.membres}</td>
                        <td className="chiffres py-2.5 pr-3 text-right">{j.terminees}</td>
                        <td className="chiffres py-2.5 pr-3 text-right">{formaterNombre(j.heures)}</td>
                        <td className="chiffres py-2.5 pr-3 text-right">{j.certificats}</td>
                        <td className="py-2.5">
                          {j.niveau === null ? (
                            <span className="text-xs text-muted-foreground">Non mesuré</span>
                          ) : (
                            <span className="flex items-center gap-2" title={`${j.membresMesures} membre(s) mesuré(s)`}>
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <span className="block h-full rounded-full bg-turquoise" style={{ width: `${Math.min(100, (j.niveau / 99) * 100)}%` }} />
                              </span>
                              <span className="chiffres font-bold">{Math.round(j.niveau)}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CorpsCarte>
        </Carte>
      </div>

      <Carte className="mt-6">
        <EnteteCarte
          titre="Niveau moyen par domaine et par organisation"
          description="Moyenne des niveaux de compétence (0–99) des membres mesurés. Repérez les domaines où une organisation a besoin de formations."
        />
        <CorpsCarte>
          {jesMesurees.length === 0 ? (
            <EtatVide
              compact
              titre="Aucune compétence mesurée"
              description="La carte se remplit quand les membres font leur première auto-évaluation."
            />
          ) : (
            <CarteChaleur
              titre="Niveau moyen des compétences, par organisation et par domaine"
              lignes={jesMesurees.map((j) => ({ id: j.id, libelle: j.nom, court: j.sigle, couleur: j.couleur }))}
              colonnes={d.domaines.map((x) => ({ id: x.id, libelle: x.nom, couleur: x.couleur, icone: x.icone }))}
              cellules={d.chaleur}
            />
          )}
        </CorpsCarte>
      </Carte>
    </div>
  );
}
