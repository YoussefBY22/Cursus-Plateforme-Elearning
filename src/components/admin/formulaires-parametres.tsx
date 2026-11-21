"use client";

import { useActionState, useState } from "react";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { CaseACocher, Champ, Groupe } from "@/components/ui/champ";
import type { Resultat } from "@/lib/resultat";
import { cn } from "@/lib/utils";
import { enregistrerParametres } from "@/server/actions/admin-parametres";
import type { Parametres } from "@/services/parametres";
import { partsPoids } from "@/services/rapports";
import { useRetourAction } from "./retour-action";

const pct = (v: number) => String(Math.round(v * 1000) / 10);

function Section({
  section,
  titre,
  description,
  bouton,
  children,
  id,
}: {
  section: string;
  titre: string;
  description: React.ReactNode;
  bouton: string;
  children: (erreurs: Record<string, string>) => React.ReactNode;
  id: string;
}) {
  const [etat, action] = useActionState<Resultat, FormData>(enregistrerParametres, {});
  useRetourAction(etat);
  return (
    <Carte id={id} className="scroll-mt-20">
      <EnteteCarte titre={titre} description={description} />
      <CorpsCarte>
        <form action={action} noValidate className="grid gap-4">
          <input type="hidden" name="section" value={section} />
          {children(etat.erreurs ?? {})}
          {etat.erreur ? (
            <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
              {etat.erreur}
            </p>
          ) : null}
          <div className="flex justify-end">
            <BoutonSoumission variante="contour" enCours="Enregistrement…">
              {bouton}
            </BoutonSoumission>
          </div>
        </form>
      </CorpsCarte>
    </Carte>
  );
}

/** Champ numérique avec son unité à droite (%, s, j, points). */
function ChampUnite({
  id,
  name,
  label,
  aide,
  erreur,
  unite,
  defaultValue,
  min,
  max,
  step = "any",
  onChange,
}: {
  id: string;
  name: string;
  label: React.ReactNode;
  aide?: React.ReactNode;
  erreur?: string;
  unite: string;
  defaultValue: string;
  min: number;
  max: number;
  step?: string | number;
  onChange?: (v: number) => void;
}) {
  return (
    <Groupe id={id} label={label} aide={aide} erreur={erreur?.trim() ? erreur : undefined}>
      <div className="relative max-w-[12rem]">
        <Champ
          id={id}
          name={name}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          defaultValue={defaultValue}
          onChange={(e) => onChange?.(Number(e.target.value))}
          aria-invalid={!!erreur}
          className="chiffres pr-16"
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">{unite}</span>
      </div>
    </Groupe>
  );
}

function SectionCircuit({ p }: { p: Parametres }) {
  const [peutCreer, setPeutCreer] = useState(p["contenu.pedagoPeutCreer"]);
  const [validation, setValidation] = useState(p["contenu.pedagoValidationRequise"]);
  const effet = !peutCreer
    ? "Le responsable pédagogique ne peut plus créer de formation ni de parcours (s'il est aussi formateur, ses contenus passent par la validation comme ceux de tout formateur)."
    : validation
      ? "Le responsable pédagogique crée des contenus, qui attendent la validation du super admin avant publication."
      : "Le responsable pédagogique crée et publie directement, sans validation. Les contenus des formateurs restent toujours validés.";
  return (
    <Section
      id="circuit"
      section="circuit"
      titre="Circuit de validation"
      description="Qui publie quoi. Le super admin publie toujours sans validation ; un formateur passe toujours par elle."
      bouton="Enregistrer le circuit"
    >
      {() => (
        <>
          <CaseACocher
            name="pedagoPeutCreer"
            checked={peutCreer}
            onChange={(e) => setPeutCreer(e.target.checked)}
            label="Le responsable pédagogique peut créer des contenus"
            description="Formations et parcours, depuis l'espace formateur."
          />
          <CaseACocher
            name="pedagoValidationRequise"
            checked={validation}
            disabled={!peutCreer}
            onChange={(e) => setValidation(e.target.checked)}
            label="Ses contenus doivent être validés par le super admin"
            description="Décoché : il publie directement."
          />
          {!peutCreer && validation ? <input type="hidden" name="pedagoValidationRequise" value="on" /> : null}
          <p className="rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-[13px]">
            <span className="font-semibold">Effet : </span>
            {effet}
          </p>
        </>
      )}
    </Section>
  );
}

const EXPLICATIONS_PONDERATIONS: {
  cle: keyof Parametres["competences.ponderations"];
  libelle: string;
  explication: string;
  unite: string;
  enPourcent: boolean;
  min: number;
  max: number;
  step?: number;
}[] = [
  { cle: "quiz", libelle: "Poids du quiz", explication: "Part du score au quiz (première tentative seulement) dans le niveau observé après une formation.", unite: "%", enPourcent: true, min: 0, max: 100 },
  { cle: "formateur", libelle: "Poids du formateur", explication: "Part de l'évaluation du membre par le formateur (formations externes saisies par les RH).", unite: "%", enPourcent: true, min: 0, max: 100 },
  { cle: "reevaluation", libelle: "Poids de la réévaluation", explication: "Part de la note que le membre se donne à lui-même en fin de formation.", unite: "%", enPourcent: true, min: 0, max: 100 },
  { cle: "tauxApprentissage", libelle: "Taux d'apprentissage", explication: "Quand le niveau observé dépasse le niveau de départ, part de l'écart réellement gagnée.", unite: "%", enPourcent: true, min: 5, max: 100 },
  { cle: "tauxRecul", libelle: "Taux de recul", explication: "Quand l'observé est sous le départ, part de l'écart retirée : une mauvaise journée ne détruit pas un acquis.", unite: "%", enPourcent: true, min: 0, max: 100 },
  { cle: "plafondGain", libelle: "Plafond de gain", explication: "Gain maximal pour une seule formation, divisé par deux sans mesure objective (ni quiz ni formateur).", unite: "points", enPourcent: false, min: 1, max: 50 },
  { cle: "plafondRecul", libelle: "Plafond de recul", explication: "Perte maximale pour une seule formation.", unite: "points", enPourcent: false, min: 0, max: 50 },
  { cle: "partProvisoire", libelle: "Part appliquée tout de suite", explication: "Le reste du gain attend l'évaluation à froid et n'est acquis que si le membre a mis en pratique.", unite: "%", enPourcent: true, min: 50, max: 100 },
  { cle: "margeAutoEvaluation", libelle: "Marge d'auto-évaluation", explication: "La réévaluation ne peut pas dépasser la mesure objective de plus de cette marge : se surnoter ne paie pas.", unite: "points", enPourcent: false, min: 0, max: 60 },
  { cle: "seuilMiseEnPratique", libelle: "Seuil de mise en pratique", explication: "Note minimale (sur 5) déclarée à l'évaluation à froid pour débloquer la part de gain en attente.", unite: "/5", enPourcent: false, min: 1, max: 5, step: 1 },
];

function SectionPonderations({ p }: { p: Parametres }) {
  const pond = p["competences.ponderations"];
  const [poids, setPoids] = useState({ quiz: pond.quiz * 100, formateur: pond.formateur * 100, reevaluation: pond.reevaluation * 100 });
  const parts = partsPoids(poids);
  const nuls = poids.quiz + poids.formateur + poids.reevaluation <= 0;
  return (
    <Section
      id="ponderations"
      section="ponderations"
      titre="Pondérations des compétences"
      description="La méthode standardisée qui transforme quiz, évaluations et réévaluations en niveau 0–99. Elle s'applique aux formations Cursus comme aux formations externes : les mesures restent comparables."
      bouton="Enregistrer les pondérations"
    >
      {(e) => (
        <>
          <div className="rounded-xl border border-border p-3.5">
            <p className="text-[13px] font-semibold">Répartition effective du niveau observé</p>
            <p className="text-xs text-muted-foreground">Les poids sont renormalisés : une mesure absente est retirée et les autres se partagent sa part.</p>
            <div className="mt-2.5 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span style={{ width: `${parts.quiz * 100}%`, background: "var(--primary)" }} />
              <span style={{ width: `${parts.formateur * 100}%`, background: "var(--turquoise)" }} />
              <span style={{ width: `${parts.reevaluation * 100}%`, background: "var(--or)" }} />
            </div>
            <p className={cn("chiffres mt-2 flex flex-wrap gap-x-4 text-xs", nuls ? "font-medium text-danger" : "text-muted-foreground")}>
              {nuls ? (
                "Les trois poids sont nuls : aucune mesure ne compterait. Donnez du poids à au moins une."
              ) : (
                <>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />Quiz {Math.round(parts.quiz * 100)} %</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-turquoise" />Formateur {Math.round(parts.formateur * 100)} %</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-or" />Réévaluation {Math.round(parts.reevaluation * 100)} %</span>
                </>
              )}
            </p>
          </div>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {EXPLICATIONS_PONDERATIONS.map((x) => (
              <ChampUnite
                key={x.cle}
                id={`pond-${x.cle}`}
                name={x.cle}
                label={x.libelle}
                aide={x.explication}
                erreur={e[x.cle]}
                unite={x.unite}
                min={x.min}
                max={x.max}
                step={x.step ?? "any"}
                defaultValue={x.enPourcent ? pct(pond[x.cle]) : String(pond[x.cle])}
                onChange={
                  x.cle === "quiz" || x.cle === "formateur" || x.cle === "reevaluation"
                    ? (v) => setPoids((prev) => ({ ...prev, [x.cle]: Number.isFinite(v) ? v : 0 }))
                    : undefined
                }
              />
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

export function FormulairesParametres({ p }: { p: Parametres }) {
  const signataires = [0, 1, 2].map((i) => p["certificat.signataires"][i] ?? { nom: "", titre: "" });
  return (
    <div className="grid gap-6">
      <SectionCircuit p={p} />

      <Section
        id="visionnage"
        section="visionnage"
        titre="Visionnage"
        description="Ce qui compte comme « vidéo vue ». Seuls les segments réellement regardés comptent : les sauts et l'accélération excessive sont écartés."
        bouton="Enregistrer le visionnage"
      >
        {(e) => (
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
            <ChampUnite id="seuil" name="seuil" label="Seuil de visionnage" unite="%" min={50} max={100} defaultValue={pct(p["visionnage.seuil"])} erreur={e.seuil} aide="Part de la vidéo à couvrir pour débloquer le quiz final." />
            <ChampUnite id="vitesseMax" name="vitesseMax" label="Vitesse maximale" unite="×" min={1} max={4} defaultValue={String(p["visionnage.vitesseMax"])} erreur={e.vitesseMax} aide="Au-delà, le temps regardé n'est plus compté." />
            <ChampUnite id="toleranceSaut" name="toleranceSaut" label="Tolérance de saut" unite="s" min={0.5} max={10} defaultValue={String(p["visionnage.toleranceSaut"])} erreur={e.toleranceSaut} aide="Avance tolérée sans être prise pour un saut (latence, mise en mémoire)." />
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section id="quiz" section="quiz" titre="Quiz" description="Réussite du quiz final, qui conditionne la fin de la formation." bouton="Enregistrer le seuil">
          {(e) => (
            <ChampUnite id="seuilFinal" name="seuilFinal" label="Seuil de réussite" unite="%" min={0} max={100} defaultValue={pct(p["quiz.seuilFinal"])} erreur={e.seuilFinal} aide="Score minimal au quiz final." />
          )}
        </Section>
        <Section id="auto-evaluation" section="autoEvaluation" titre="Auto-évaluation" description="Le temps limite par question évite de trop réfléchir : on mesure l'intuition." bouton="Enregistrer la durée">
          {(e) => (
            <ChampUnite id="secondesParQuestion" name="secondesParQuestion" label="Temps par question" unite="s" min={5} max={60} step={1} defaultValue={String(p["autoEvaluation.secondesParQuestion"])} erreur={e.secondesParQuestion} aide="Temps écoulé : la réponse vaut « je ne sais pas »." />
          )}
        </Section>
        <Section id="evaluation-froid" section="evaluationFroid" titre="Évaluation à froid" description="Le membre dit s'il a mis en pratique ce qu'il a appris." bouton="Enregistrer le délai">
          {(e) => (
            <ChampUnite id="delaiJours" name="delaiJours" label="Délai après la formation" unite="jours" min={1} max={365} step={1} defaultValue={String(p["evaluationFroid.delaiJours"])} erreur={e.delaiJours} aide="Une relance part à l'échéance." />
          )}
        </Section>
      </div>

      <SectionPonderations p={p} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Section id="inscriptions" section="inscriptions" titre="Inscriptions" description="Fermez-les le temps d'une maintenance ou d'un nettoyage des comptes." bouton="Enregistrer">
          {() => (
            <CaseACocher name="ouverte" defaultChecked={p["inscription.ouverte"]} label="Inscriptions ouvertes" description="Fermées : la page d'inscription refuse les nouveaux comptes. Les membres existants se connectent normalement." />
          )}
        </Section>
        <Section
          id="signataires"
          section="signataires"
          titre="Signataires des certificats"
          description="Imprimés sur les nouveaux certificats (jusqu'à trois). Les certificats déjà émis gardent leurs signataires d'origine."
          bouton="Enregistrer les signataires"
        >
          {(e) => (
            <div className="grid gap-3">
              {signataires.map((s, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-2">
                  <Groupe id={`nom${i}`} label={`Signataire ${i + 1} — nom`} erreur={e[`nom${i}`]}>
                    <Champ id={`nom${i}`} name={`nom${i}`} defaultValue={s.nom} maxLength={80} placeholder={i === 0 ? "Direction" : "Facultatif"} />
                  </Groupe>
                  <Groupe id={`titre${i}`} label="Titre" erreur={e[`titre${i}`]}>
                    <Champ id={`titre${i}`} name={`titre${i}`} defaultValue={s.titre} maxLength={80} placeholder={i === 0 ? "Directeur·rice" : "Facultatif"} />
                  </Groupe>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Laissez une ligne vide pour retirer un signataire.</p>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
