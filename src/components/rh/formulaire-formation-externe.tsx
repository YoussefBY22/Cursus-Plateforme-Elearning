"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useRetourAction } from "@/components/admin/retour-action";
import { Avatar } from "@/components/ui/avatar";
import { Bouton, LienBouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { CaseACocher, Champ, Groupe, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import type { Resultat } from "@/lib/resultat";
import { cn } from "@/lib/utils";
import { creerFormationExterne } from "@/server/actions/rh";
import { avecJe } from "@/services/rh";

export type DomaineFormulaire = {
  id: string;
  nom: string;
  couleur: string;
  competences: { id: string; nom: string; propre: boolean }[];
};

export type MembreFormulaire = {
  id: string;
  prenom: string;
  nom: string;
  photoUrl: string | null;
  poste: string | null;
  departement: string | null;
};

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function FormulaireFormationExterne({
  domaines,
  membres,
  je,
  jeParam,
}: {
  domaines: DomaineFormulaire[];
  membres: MembreFormulaire[];
  je: string;
  /** organisation consultée par un super admin (gardée dans les liens). */
  jeParam: string | null;
}) {
  const router = useRouter();
  const [etat, action] = useActionState<Resultat<{ id: string }>, FormData>(creerFormationExterne, {});
  const [domaineId, setDomaineId] = useState("");
  const [comps, setComps] = useState<Set<string>>(new Set());
  const [parts, setParts] = useState<Set<string>>(new Set());
  const [filtre, setFiltre] = useState("");
  // Champs contrôlés : React vide les champs libres après chaque envoi, même refusé.
  const [champs, setChamps] = useState({ titre: "", description: "", formateurInterne: "", date: aujourdhui(), dureeHeures: "2" });
  const lier = (cle: keyof typeof champs) => ({
    value: champs[cle],
    onChange: (ev: { target: { value: string } }) => setChamps((c) => ({ ...c, [cle]: ev.target.value })),
  });

  useRetourAction(etat, {
    onSucces: (r) => {
      if (r.donnees?.id) router.push(avecJe(`/mon-organisation/formations-externes/${r.donnees.id}`, jeParam));
    },
  });
  const e = etat.erreurs ?? {};
  const domaine = domaines.find((d) => d.id === domaineId);
  const membresFiltres = useMemo(() => {
    const t = filtre.trim().toLowerCase();
    if (!t) return membres;
    return membres.filter((m) => `${m.prenom} ${m.nom} ${m.poste ?? ""} ${m.departement ?? ""}`.toLowerCase().includes(t));
  }, [membres, filtre]);

  const basculer = (ens: Set<string>, id: string, set: (s: Set<string>) => void) => {
    const n = new Set(ens);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    set(n);
  };

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="je" value={je} />
      {/* Les cases cochées hors du filtre courant doivent partir aussi. */}
      {[...comps].map((id) => (
        <input key={`c-${id}`} type="hidden" name="competences" value={id} />
      ))}
      {[...parts].map((id) => (
        <input key={`p-${id}`} type="hidden" name="participants" value={id} />
      ))}

      <Carte>
        <EnteteCarte titre="La formation" description="Ce qui a été animé, par qui et quand." />
        <CorpsCarte className="grid gap-4 sm:grid-cols-2">
          <Groupe id="fe-titre" label="Titre" erreur={e.titre} className="sm:col-span-2">
            <Champ id="fe-titre" name="titre" {...lier("titre")} required minLength={5} maxLength={160} aria-invalid={!!e.titre} placeholder="Atelier interne : négocier une mission" />
          </Groupe>
          <Groupe id="fe-description" label="Description" aide="Facultative : contenu, format, supports." erreur={e.description} className="sm:col-span-2">
            <ZoneTexte id="fe-description" name="description" {...lier("description")} maxLength={2000} className="min-h-20" />
          </Groupe>
          <Groupe id="fe-formateur" label="Formateur interne" aide="Nom et rôle, par exemple « Sami K., responsable commercial »." erreur={e.formateurInterne}>
            <Champ id="fe-formateur" name="formateurInterne" {...lier("formateurInterne")} required minLength={3} maxLength={120} aria-invalid={!!e.formateurInterne} />
          </Groupe>
          <Groupe id="fe-domaine" label="Domaine" erreur={e.domaineId}>
            <Selecteur
              id="fe-domaine"
              name="domaineId"
              required
              value={domaineId}
              aria-invalid={!!e.domaineId}
              onChange={(ev) => {
                setDomaineId(ev.target.value);
                setComps(new Set());
              }}
            >
              <option value="">Choisir un domaine…</option>
              {domaines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </Selecteur>
          </Groupe>
          <Groupe id="fe-date" label="Date" erreur={e.date}>
            <Champ id="fe-date" name="date" type="date" required {...lier("date")} aria-invalid={!!e.date} />
          </Groupe>
          <Groupe id="fe-duree" label="Durée (heures)" erreur={e.dureeHeures}>
            <Champ id="fe-duree" name="dureeHeures" type="number" required min={0.5} max={200} step={0.5} {...lier("dureeHeures")} aria-invalid={!!e.dureeHeures} />
          </Groupe>
        </CorpsCarte>
      </Carte>

      <Carte>
        <EnteteCarte
          titre="Compétences visées"
          description="Le référentiel de votre organisation pour ce domaine. Les niveaux de ces compétences seront mesurés et recalculés."
          action={comps.size ? <Pastille ton="nuit">{comps.size} cochée{comps.size > 1 ? "s" : ""}</Pastille> : null}
        />
        <CorpsCarte>
          {!domaine ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Choisissez d&apos;abord un domaine.
            </p>
          ) : !domaine.competences.length ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune compétence active dans ce domaine. Ajoutez-en dans l&apos;onglet Référentiel.
            </p>
          ) : (
            <>
              <div className="mb-3 flex gap-2">
                <Bouton taille="sm" variante="contour" onClick={() => setComps(new Set(domaine.competences.map((c) => c.id)))}>
                  Tout cocher
                </Bouton>
                {comps.size ? (
                  <Bouton taille="sm" variante="fantome" onClick={() => setComps(new Set())}>
                    Tout décocher
                  </Bouton>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {domaine.competences.map((c) => (
                  <CaseACocher
                    key={c.id}
                    label={c.nom}
                    description={c.propre ? "Référentiel de votre organisation" : "Référentiel commun"}
                    checked={comps.has(c.id)}
                    onChange={() => basculer(comps, c.id, setComps)}
                    className="m-0 rounded-xl border border-border p-3"
                  />
                ))}
              </div>
            </>
          )}
          {e.competences ? (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {e.competences}
            </p>
          ) : null}
        </CorpsCarte>
      </Carte>

      <Carte>
        <EnteteCarte
          titre="Participants"
          description="Les membres validés de votre organisation qui ont suivi la formation."
          action={parts.size ? <Pastille ton="nuit">{parts.size} coché{parts.size > 1 ? "s" : ""}</Pastille> : null}
        />
        <CorpsCarte>
          {!membres.length ? (
            <EtatVide
              compact
              icone={<Users className="h-6 w-6" />}
              titre="Aucun membre validé"
              description="Confirmez d'abord les rattachements de vos membres dans l'onglet Membres."
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Champ
                  value={filtre}
                  onChange={(ev) => setFiltre(ev.target.value)}
                  placeholder="Filtrer par nom, poste, département…"
                  aria-label="Filtrer les membres"
                  className="h-10 min-w-48 flex-1 rounded-full"
                />
                <Bouton
                  taille="sm"
                  variante="contour"
                  onClick={() => setParts(new Set([...parts, ...membresFiltres.map((m) => m.id)]))}
                >
                  Cocher {filtre ? "les résultats" : "tout le monde"}
                </Bouton>
                {parts.size ? (
                  <Bouton taille="sm" variante="fantome" onClick={() => setParts(new Set())}>
                    Tout décocher
                  </Bouton>
                ) : null}
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {membresFiltres.map((m) => {
                  const coche = parts.has(m.id);
                  return (
                    <li key={m.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-colors",
                          coche ? "border-primary bg-primary-soft/50" : "border-border hover:bg-muted/60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={coche}
                          onChange={() => basculer(parts, m.id, setParts)}
                          className="h-[18px] w-[18px] shrink-0 accent-[var(--primary)]"
                        />
                        <Avatar nom={`${m.prenom} ${m.nom}`} photo={m.photoUrl} taille="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {m.prenom} {m.nom}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[m.poste, m.departement].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {!membresFiltres.length ? <p className="py-4 text-center text-sm text-muted-foreground">Aucun membre ne correspond au filtre.</p> : null}
            </>
          )}
          {e.participants ? (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {e.participants}
            </p>
          ) : null}
        </CorpsCarte>
      </Carte>

      <div className="flex flex-wrap justify-end gap-2">
        <LienBouton href={avecJe("/mon-organisation?onglet=formations", jeParam)} variante="contour">
          Annuler
        </LienBouton>
        <BoutonSoumission enCours="Création…">Créer la formation externe</BoutonSoumission>
      </div>
    </form>
  );
}
