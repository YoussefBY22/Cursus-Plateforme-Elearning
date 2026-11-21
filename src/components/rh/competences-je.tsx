import Link from "next/link";
import { Award, BookCheck, Clock, Grid3x3, TrendingUp, Users } from "lucide-react";
import { couleurLisible } from "@/components/graphiques/couleurs";
import { Icone } from "@/components/icones";
import { Avatar } from "@/components/ui/avatar";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EtatVide } from "@/components/ui/etat-vide";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { formaterNombre } from "@/services/rapports";
import {
  classesPalier,
  matriceMembresDomaines,
  PALIERS_LEGENDE,
  progressionMoyenneGlobale,
  progressionParDomaine,
  type NiveauMembre,
} from "@/services/rh";

type Domaine = { id: string; nom: string; code: string; couleur: string; icone: string };
type Membre = { id: string; prenom: string; nom: string; photoUrl: string | null; poste: string | null };

const signe = (v: number) => `${v > 0 ? "+" : ""}${formaterNombre(v, 1)}`;

/** Onglet « Compétences » : indicateurs, matrice membres × domaines, progression par domaine. */
export function CompetencesJe({
  membres,
  domaines,
  niveaux,
  indicateurs,
}: {
  membres: Membre[];
  domaines: Domaine[];
  niveaux: NiveauMembre[];
  indicateurs: { membres: number; actifs: number; formationsTerminees: number; heuresVues: number; certificats: number };
}) {
  const matrice = matriceMembresDomaines(niveaux);
  const parDomaine = progressionParDomaine(niveaux);
  const progGlobale = progressionMoyenneGlobale(niveaux);
  // Colonnes : seulement les domaines mesurés chez au moins un membre (les autres sont listés dessous).
  const mesures = domaines.filter((d) => parDomaine.has(d.id));
  const nonMesures = domaines.filter((d) => !parDomaine.has(d.id));

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
        <Stat
          libelle="Membres actifs"
          valeur={indicateurs.actifs}
          indice={`sur ${indicateurs.membres} validé${indicateurs.membres > 1 ? "s" : ""}, actifs ces 30 derniers jours`}
          icone={<Users size={16} aria-hidden />}
        />
        <Stat
          libelle="Formations terminées"
          valeur={indicateurs.formationsTerminees}
          indice="sur Cursus"
          icone={<BookCheck size={16} aria-hidden />}
        />
        <Stat
          libelle="Heures vues"
          valeur={formaterNombre(indicateurs.heuresVues, 1)}
          indice="vidéo réellement regardée"
          icone={<Clock size={16} aria-hidden />}
        />
        <Stat
          libelle="Certificats"
          valeur={indicateurs.certificats}
          indice="parcours certifiants obtenus"
          icone={<Award size={16} aria-hidden />}
          accent="var(--or)"
        />
        <Stat
          libelle="Progression moyenne"
          valeur={progGlobale === null ? "—" : signe(progGlobale)}
          indice="points par compétence depuis l'auto-évaluation initiale"
          icone={<TrendingUp size={16} aria-hidden />}
          accent="var(--success)"
        />
      </div>

      <Carte>
        <EnteteCarte
          titre="Matrice des compétences"
          description="Niveau 0–99 de chaque membre par domaine : la moyenne des compétences mesurées. Une case en pointillés n'a jamais été mesurée."
        />
        <CorpsCarte>
          {!membres.length ? (
            <EtatVide
              compact
              icone={<Users className="h-6 w-6" />}
              titre="Aucun membre validé"
              description="Confirmez les rattachements dans l'onglet Membres : la matrice se remplira avec leurs auto-évaluations."
            />
          ) : !mesures.length ? (
            <EtatVide
              compact
              icone={<Grid3x3 className="h-6 w-6" />}
              titre="Aucune compétence mesurée"
              description="Invitez vos membres à faire leur auto-évaluation dans « Mes compétences », ou créez une formation externe : chaque mesure remplit la matrice."
            />
          ) : (
            <>
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full border-separate border-spacing-1 text-xs">
                  <caption className="sr-only">Niveau par membre et par domaine</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="sticky left-0 z-10 bg-card text-left text-[13px] font-medium text-muted-foreground">
                        Membre
                      </th>
                      {mesures.map((d) => (
                        <th key={d.id} scope="col" className="min-w-[3.5rem] px-0.5 pb-1 align-bottom font-medium text-muted-foreground">
                          <span className="flex flex-col items-center gap-1" title={d.nom}>
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-lg"
                              style={{
                                background: `color-mix(in srgb, ${couleurLisible(d.couleur)} 16%, transparent)`,
                                color: couleurLisible(d.couleur),
                              }}
                            >
                              <Icone nom={d.icone} className="h-3.5 w-3.5" />
                            </span>
                            <span className="line-clamp-2 max-w-[5.5rem] text-center text-[11px] leading-tight">{d.nom}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {membres.map((m) => {
                      const ligne = matrice.get(m.id);
                      return (
                        <tr key={m.id}>
                          <th scope="row" className="sticky left-0 z-10 bg-card pr-2 text-left font-semibold">
                            <Link href={`/membres/${m.id}`} className="flex items-center gap-2 whitespace-nowrap hover:text-primary">
                              <Avatar nom={`${m.prenom} ${m.nom}`} photo={m.photoUrl} taille="xs" />
                              <span className="max-w-[9rem] truncate">
                                {m.prenom} {m.nom}
                              </span>
                            </Link>
                          </th>
                          {mesures.map((d) => {
                            const c = ligne?.get(d.id);
                            return (
                              <td
                                key={d.id}
                                className={cn(
                                  "chiffres h-9 rounded-lg text-center text-[13px] font-bold",
                                  classesPalier(c ? c.palier : "NON_EVALUE")
                                )}
                                title={
                                  c
                                    ? `${m.prenom} ${m.nom} — ${d.nom} : ${c.niveau}/99, ${c.libelle} (${c.mesurees} compétence${c.mesurees > 1 ? "s" : ""} mesurée${c.mesurees > 1 ? "s" : ""})`
                                    : `${m.prenom} ${m.nom} — ${d.nom} : pas encore mesuré`
                                }
                              >
                                {c ? c.niveau : <span aria-label="Non mesuré">·</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-muted-foreground" aria-label="Légende des paliers">
                {PALIERS_LEGENDE.map((p) => (
                  <li key={p.code} className="flex items-center gap-1.5">
                    <span className={cn("inline-block h-3 w-5 rounded", classesPalier(p.code))} aria-hidden />
                    {p.libelle} <span className="chiffres">({p.seuil})</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5">
                  <span className={cn("inline-block h-3 w-5 rounded", classesPalier("NON_EVALUE"))} aria-hidden />
                  Pas encore mesuré
                </li>
              </ul>
              {nonMesures.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Jamais mesurés dans votre organisation : {nonMesures.map((d) => d.nom).join(", ")}.
                </p>
              ) : null}
            </>
          )}
        </CorpsCarte>
      </Carte>

      {mesures.length ? (
        <Carte>
          <EnteteCarte
            titre="Progression par domaine"
            description="Niveau moyen actuel et gain moyen depuis l'auto-évaluation initiale, toutes compétences mesurées confondues."
          />
          <CorpsCarte>
            <ul className="grid gap-3 sm:grid-cols-2">
              {mesures.map((d) => {
                const p = parDomaine.get(d.id)!;
                const ton = p.progressionMoyenne > 0 ? "text-success" : p.progressionMoyenne < 0 ? "text-danger" : "text-muted-foreground";
                return (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: `color-mix(in srgb, ${couleurLisible(d.couleur)} 16%, transparent)`,
                        color: couleurLisible(d.couleur),
                      }}
                    >
                      <Icone nom={d.icone} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{d.nom}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.membres} membre{p.membres > 1 ? "s" : ""} · niveau moyen <span className="chiffres">{p.niveauMoyen}</span>
                      </span>
                    </span>
                    <span className={cn("chiffres text-lg font-extrabold", ton)} title="Points gagnés en moyenne par compétence">
                      {signe(p.progressionMoyenne)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CorpsCarte>
        </Carte>
      ) : null}
    </div>
  );
}
