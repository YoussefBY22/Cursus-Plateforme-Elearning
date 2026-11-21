"use client";

import * as React from "react";
import { Bouton } from "@/components/ui/bouton";
import { Groupe, ZoneTexte } from "@/components/ui/champ";
import { cn } from "@/lib/utils";
import { envoyerEnquete } from "@/server/actions/apprentissage";

/**
 * Enquête de satisfaction à chaud — dernière étape avant « terminée ».
 *
 * Elle comporte la réévaluation des compétences visées : le membre se
 * repositionne de 1 à 10 juste après la formation. Combinée à la mesure
 * d'avant et aux scores de quiz, elle alimente le calcul standardisé — et
 * « je ne sais pas » reste une réponse valable, plus utile qu'un chiffre
 * inventé.
 */

type Competence = { id: string; nom: string; question: string | null };

export function EnqueteChaud({
  formationId,
  titre,
  competences,
  couleur,
  onEnvoyee,
}: {
  formationId: string;
  titre: string;
  competences: Competence[];
  couleur: string;
  onEnvoyee: (statut: "EN_COURS" | "ENQUETE_REQUISE" | "TERMINEE") => void;
}) {
  const [contenu, setContenu] = React.useState<number | null>(null);
  const [formateur, setFormateur] = React.useState<number | null>(null);
  const [clarte, setClarte] = React.useState<number | null>(null);
  const [recommandation, setRecommandation] = React.useState<number | null>(null);
  const [commentaire, setCommentaire] = React.useState("");
  const [niveaux, setNiveaux] = React.useState<Record<string, number | null>>({});
  const [envoi, setEnvoi] = React.useState(false);
  const [erreur, setErreur] = React.useState<string | null>(null);

  const notesFaites = contenu !== null && formateur !== null && clarte !== null && recommandation !== null;
  const competencesFaites = competences.every((c) => c.id in niveaux);
  const complet = notesFaites && competencesFaites;

  async function envoyer() {
    if (!complet) return;
    setEnvoi(true);
    setErreur(null);
    const r = await envoyerEnquete({
      formationId,
      type: "CHAUD",
      noteContenu: contenu,
      noteFormateur: formateur,
      noteSpecifique: clarte,
      recommandation,
      commentaire: commentaire.trim() || null,
      reevaluation: niveaux,
    });
    setEnvoi(false);
    if (r.erreur || !r.donnees) {
      setErreur(r.erreur ?? "Enquête non enregistrée. Réessayez.");
      return;
    }
    onEnvoyee(r.donnees.statut);
  }

  return (
    <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-bold tracking-wide" style={{ color: `color-mix(in srgb, ${couleur} 75%, var(--foreground))` }}>
          Dernière étape
        </p>
        <h2 className="mt-0.5 text-[17px] font-bold tracking-tight">Votre retour sur « {titre} »</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Trois minutes qui servent au formateur, à votre organisation et à votre profil de compétences.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <Echelle
          label="Le contenu a-t-il répondu à vos attentes ?"
          valeur={contenu}
          onChange={setContenu}
          bas="Pas du tout"
          haut="Tout à fait"
          couleur={couleur}
        />
        <Echelle
          label="Comment avez-vous trouvé l'animation du formateur ?"
          valeur={formateur}
          onChange={setFormateur}
          bas="Décevante"
          haut="Excellente"
          couleur={couleur}
        />
        <Echelle
          label="Les explications étaient-elles claires ?"
          valeur={clarte}
          onChange={setClarte}
          bas="Confuses"
          haut="Limpides"
          couleur={couleur}
        />

        <div>
          <p className="mb-2 text-[13px] font-semibold">
            Recommanderiez-vous cette formation à un autre membre ? <span className="font-normal text-muted-foreground">(0 à 10)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }).map((_, n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRecommandation(n)}
                aria-pressed={recommandation === n}
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

        {competences.length ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[13px] font-semibold">Où vous situez-vous maintenant ?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Répondez d'instinct, sans chercher la bonne réponse : cette mesure n'est pas une note, elle sert à
              situer votre progression. Si une compétence ne vous parle pas, dites-le — c'est une réponse utile.
            </p>
            <ul className="mt-4 space-y-4">
              {competences.map((c) => (
                <li key={c.id}>
                  <p className="mb-2 text-[13px] font-medium">{c.question ?? c.nom}</p>
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

        <Groupe id="commentaire-enquete" label="Un mot pour le formateur" aide="Facultatif.">
          <ZoneTexte
            id="commentaire-enquete"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            maxLength={2000}
            placeholder="Ce qui vous a servi, ce qui manquait, un exemple que vous auriez aimé voir…"
          />
        </Groupe>

        {erreur ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {erreur}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <span className="text-xs text-muted-foreground">
          {complet ? "Tout est rempli." : "Répondez à tout pour valider la formation."}
        </span>
        <Bouton onClick={envoyer} disabled={envoi || !complet}>
          {envoi ? "Enregistrement…" : "Envoyer et terminer"}
        </Bouton>
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
