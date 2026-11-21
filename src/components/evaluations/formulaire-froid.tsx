"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, TrendingUp } from "lucide-react";
import { Bouton, LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { Groupe, ZoneTexte } from "@/components/ui/champ";
import { cn } from "@/lib/utils";
import { envoyerEnquete } from "@/server/actions/apprentissage";
import type { PreparationFroid } from "@/server/requetes/evaluations";
import { toast } from "@/components/ui/toasts";

/**
 * Évaluation à froid.
 *
 * Elle ne redemande pas si la formation était bien : c'est l'enquête à chaud
 * qui le fait. Ici, une seule question compte vraiment — qu'en avez-vous
 * réellement fait depuis ? C'est elle qui confirme la part de gain restée
 * provisoire, et c'est pour ça qu'on attend un mois avant de la poser.
 */
export function FormulaireFroid({ p }: { p: PreparationFroid }) {
  const router = useRouter();
  const [pratique, setPratique] = React.useState<number | null>(null);
  const [contenu, setContenu] = React.useState<number | null>(null);
  const [formateur, setFormateur] = React.useState<number | null>(null);
  const [recommandation, setRecommandation] = React.useState<number | null>(null);
  const [niveaux, setNiveaux] = React.useState<Record<string, number | null>>({});
  const [commentaire, setCommentaire] = React.useState("");
  const [envoi, setEnvoi] = React.useState(false);
  const [erreur, setErreur] = React.useState<string | null>(null);

  const couleur = p.domaine.couleur;
  const notesFaites = pratique !== null && contenu !== null && formateur !== null && recommandation !== null;
  const competencesFaites = p.competences.every((c) => c.id in niveaux);
  const complet = notesFaites && competencesFaites;

  async function envoyer() {
    if (!complet) return;
    setEnvoi(true);
    setErreur(null);
    const r = await envoyerEnquete({
      formationId: p.formationId,
      type: "FROID",
      noteContenu: contenu,
      noteFormateur: formateur,
      noteSpecifique: pratique,
      recommandation,
      commentaire: commentaire.trim() || null,
      reevaluation: niveaux,
    });
    setEnvoi(false);
    if (r.erreur || !r.donnees) {
      setErreur(r.erreur ?? "L'évaluation n'a pas pu être enregistrée. Réessayez.");
      return;
    }
    toast({ titre: "Évaluation enregistrée", description: "Vos compétences ont été recalculées.", ton: "succes" });
    router.push("/competences");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Carte>
        <CorpsCarte className="pt-5">
          <p className="text-[13px] text-muted-foreground">
            Formation terminée il y a {p.joursEcoules} jours{p.formateur ? `, animée par ${p.formateur}` : ""}.
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight">{p.titre}</h2>
          {p.gainEnAttente > 0 ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 px-3.5 py-2.5 text-[13px] leading-relaxed">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: couleur }} aria-hidden />
              <span>
                <strong className="font-semibold">{p.gainEnAttente} points</strong> de compétence attendent cette
                réponse. S&apos;il n&apos;y a pas eu de mise en pratique, ils ne seront pas acquis — et c&apos;est
                normal.
              </span>
            </p>
          ) : null}
        </CorpsCarte>
      </Carte>

      <Carte>
        <EnteteCarte
          titre="Ce que vous en avez fait"
          description="La seule question qui décide de la consolidation de vos acquis."
        />
        <CorpsCarte className="space-y-6 pt-0">
          <Echelle
            label="Avez-vous mis en pratique ce que la formation vous a appris ?"
            valeur={pratique}
            onChange={setPratique}
            bas="Jamais"
            haut="Régulièrement"
            couleur={couleur}
          />

          {p.competences.length ? (
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-[13px] font-semibold">Où vous situez-vous aujourd&apos;hui ?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Un mois après, le recul change souvent le jugement. Répondez d&apos;instinct — se surnoter ne sert à
                rien, la part déclarative est plafonnée par les mesures objectives.
              </p>
              <ul className="mt-4 space-y-4">
                {p.competences.map((c) => (
                  <li key={c.id}>
                    <p className="mb-2 text-[13px] font-medium">
                      {c.question ?? c.nom}
                      {c.niveauActuel !== null ? (
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          (niveau mesuré : {c.niveauActuel}/99)
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const n = i + 1;
                        const actif = niveaux[c.id] === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setNiveaux((v) => ({ ...v, [c.id]: n }))}
                            aria-pressed={actif}
                            aria-label={`${c.nom} : ${n} sur 10`}
                            className={cn(
                              "h-8 w-8 rounded-lg text-xs font-bold tabular-nums transition-colors",
                              actif ? "text-white" : "bg-card text-foreground hover:bg-border"
                            )}
                            style={actif ? { background: couleur } : undefined}
                          >
                            {n}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setNiveaux((v) => ({ ...v, [c.id]: null }))}
                        aria-pressed={c.id in niveaux && niveaux[c.id] === null}
                        className={cn(
                          "h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                          c.id in niveaux && niveaux[c.id] === null
                            ? "bg-nuit text-white"
                            : "bg-card text-muted-foreground hover:bg-border"
                        )}
                      >
                        Je ne sais pas
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CorpsCarte>
      </Carte>

      <Carte>
        <EnteteCarte titre="Avec le recul" description="Le même jugement, un mois plus tard, n'a pas la même valeur." />
        <CorpsCarte className="space-y-6 pt-0">
          <Echelle
            label="Le contenu s'est-il révélé utile dans la durée ?"
            valeur={contenu}
            onChange={setContenu}
            bas="Pas vraiment"
            haut="Très utile"
            couleur={couleur}
          />
          <Echelle
            label="Et l'animation du formateur, vous en gardez quoi ?"
            valeur={formateur}
            onChange={setFormateur}
            bas="Un mauvais souvenir"
            haut="Un excellent souvenir"
            couleur={couleur}
          />
          <div>
            <p className="mb-2 text-[13px] font-semibold">
              La recommanderiez-vous aujourd&apos;hui ?{" "}
              <span className="font-normal text-muted-foreground">(0 à 10)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }).map((_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRecommandation(n)}
                  aria-pressed={recommandation === n}
                  aria-label={`${n} sur 10`}
                  className={cn(
                    "h-9 w-9 rounded-lg text-[13px] font-bold tabular-nums transition-colors",
                    recommandation === n ? "text-white" : "bg-muted text-foreground hover:bg-border"
                  )}
                  style={recommandation === n ? { background: couleur } : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Groupe id="commentaire-froid" label="Un exemple concret" aide="Facultatif, mais c'est ce qui aide le plus le formateur.">
            <ZoneTexte
              id="commentaire-froid"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Une situation où ce que vous avez appris vous a servi…"
            />
          </Groupe>
        </CorpsCarte>
      </Carte>

      {erreur ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {erreur}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Bouton onClick={envoyer} disabled={envoi || !complet} taille="lg">
          {envoi ? "Enregistrement…" : "Envoyer l'évaluation"}
          {!envoi && complet ? <Check className="h-4 w-4" aria-hidden /> : null}
        </Bouton>
        <LienBouton href="/evaluations" variante="fantome">
          Plus tard
        </LienBouton>
        {!complet ? (
          <span className="text-[13px] text-muted-foreground">Répondez à tout pour envoyer.</span>
        ) : null}
      </div>
    </div>
  );
}

function Echelle({
  label,
  valeur,
  onChange,
  bas,
  haut,
  couleur,
}: {
  label: string;
  valeur: number | null;
  onChange: (n: number) => void;
  bas: string;
  haut: string;
  couleur: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={valeur === n}
            aria-label={`${n} sur 5`}
            className={cn(
              "h-10 flex-1 rounded-lg text-sm font-bold tabular-nums transition-colors",
              valeur === n ? "text-white" : "bg-muted text-foreground hover:bg-border"
            )}
            style={valeur === n ? { background: couleur } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{bas}</span>
        <span>{haut}</span>
      </div>
    </div>
  );
}
