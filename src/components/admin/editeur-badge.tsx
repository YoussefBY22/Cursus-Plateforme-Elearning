"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Lock, Wand2 } from "lucide-react";
import { BadgeVisuel, type ApparenceBadge } from "@/components/gamification/badge-visuel";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { CaseACocher, Champ, Groupe, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { BoutonConfirme } from "@/components/ui/confirmation";
import type { Resultat } from "@/lib/resultat";
import { cn } from "@/lib/utils";
import { changerActivationBadge, enregistrerBadge } from "@/server/actions/admin-badges";
import { EFFETS, FORMES, LIBELLES, MATIERES, RARETES, effetSuggere, type Effet, type Forme, type Matiere, type Rarete } from "@/services/badges";
import { PastilleRarete, phraseCritere } from "./badges-communs";
import { ChoixCouleur } from "./choix-couleur";
import { ChoixIcone } from "./choix-icone";
import { lancerAction, useRetourAction } from "./retour-action";

export type CritereEditeur = { code: string; libelle: string; description: string; unite: string; parametre: string };

export type BadgeEdite = {
  id: string;
  nom: string;
  description: string;
  couleur: string;
  forme: string;
  matiere: string;
  rarete: string;
  effet: string;
  icone: string;
  critereCode: string;
  seuil: number;
  parametre: string | null;
  xpBonus: number;
  secret: boolean;
  actif: boolean;
  obtenus: number;
};

/** Teintes des matières, pour les pastilles du sélecteur (mêmes dégradés que le badge). */
const TEINTES_MATIERES: Record<Matiere, string> = {
  BRONZE: "linear-gradient(135deg,#f6c08f,#c97a3d 55%,#7a3d17)",
  ARGENT: "linear-gradient(135deg,#ffffff,#c3ccd5 55%,#6f7c8a)",
  OR: "linear-gradient(135deg,#fff3b0,#f2c230 55%,#9c6a06)",
  PLATINE: "linear-gradient(135deg,#ffffff,#dbe7ee 55%,#86a3b4)",
  DIAMANT: "linear-gradient(135deg,#e8fdff,#8be3ff 35%,#7b83ff 70%,#d59bff)",
};

function Choix<T extends string>({
  libelle,
  name,
  options,
  valeur,
  onChange,
  rendu,
}: {
  libelle: string;
  name: string;
  options: readonly T[];
  valeur: T;
  onChange: (v: T) => void;
  rendu: (v: T, actif: boolean) => React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold">{libelle}</legend>
      <input type="hidden" name={name} value={valeur} />
      <div role="radiogroup" aria-label={libelle} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const actif = o === valeur;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => onChange(o)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                actif ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-muted"
              )}
            >
              {rendu(o, actif)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function EditeurBadge({
  badge,
  criteres,
  domaines,
  parcours,
}: {
  badge: BadgeEdite | null;
  criteres: CritereEditeur[];
  domaines: { id: string; nom: string }[];
  parcours: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [etat, action] = useActionState<Resultat<{ id: string }>, FormData>(enregistrerBadge, {});
  useRetourAction(etat, {
    onSucces: (r) => {
      if (!badge && r.donnees?.id) router.replace(`/admin/badges/${r.donnees.id}`);
    },
  });
  const e = etat.erreurs ?? {};

  const [nom, setNom] = useState(badge?.nom ?? "");
  const [description, setDescription] = useState(badge?.description ?? "");
  const [couleur, setCouleur] = useState(badge?.couleur ?? "#4f46e5");
  const [forme, setForme] = useState<Forme>((badge?.forme as Forme) ?? "ROND");
  const [matiere, setMatiere] = useState<Matiere>((badge?.matiere as Matiere) ?? "BRONZE");
  const [rarete, setRarete] = useState<Rarete>((badge?.rarete as Rarete) ?? "COMMUN");
  const [effet, setEffet] = useState<Effet>((badge?.effet as Effet) ?? "AUCUN");
  const [icone, setIcone] = useState(badge?.icone ?? "Award");
  const [critereCode, setCritereCode] = useState(badge?.critereCode ?? criteres[0]?.code ?? "");
  const [seuil, setSeuil] = useState(String(badge?.seuil ?? 1));
  const [parametre, setParametre] = useState(badge?.parametre ?? "");
  const [xpBonus, setXpBonus] = useState(String(badge?.xpBonus ?? 0));
  const [verrouille, setVerrouille] = useState(false);

  const critere = criteres.find((c) => c.code === critereCode);
  const ouiNon = critere?.unite === "";
  const listeParametre = critere?.parametre === "DOMAINE" ? domaines : critere?.parametre === "PARCOURS" ? parcours : null;
  const nomParametre = listeParametre?.find((p) => p.id === parametre)?.nom ?? null;
  const suggestion = effetSuggere(rarete);
  const apparence: ApparenceBadge = { forme, matiere, rarete, effet, couleur, icone };
  const seuilNombre = Number(seuil.replace(",", "."));

  function changerRarete(r: Rarete) {
    // Si l'effet suivait la suggestion de l'ancienne rareté, il suit la nouvelle ;
    // un effet choisi à la main n'est jamais écrasé (la suggestion s'affiche alors).
    if (effet === effetSuggere(rarete)) setEffet(effetSuggere(r));
    setRarete(r);
  }

  return (
    <form action={action} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      {badge ? <input type="hidden" name="id" value={badge.id} /> : null}

      {/* Aperçu : en tête sur mobile, colonne collante sur grand écran */}
      <aside className="lg:order-2">
        <div className="lg:sticky lg:top-20">
          <Carte className="overflow-hidden">
            <div
              className="relative flex flex-col items-center justify-center px-6 pb-8 pt-12"
              style={{
                background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${couleur} 30%, var(--nuit)) 0%, var(--nuit) 70%)`,
              }}
            >
              <BadgeVisuel apparence={apparence} taille={176} verrouille={verrouille} />
              <p className="mt-6 text-center text-lg font-extrabold tracking-tight text-white">{nom || "Nom du badge"}</p>
              <p className="mt-1 max-w-xs text-center text-[13px] leading-snug text-white/70">
                {description || "La description dit au membre ce qu'il a accompli."}
              </p>
              <button
                type="button"
                onClick={() => setVerrouille((v) => !v)}
                aria-pressed={verrouille}
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                <Lock size={12} aria-hidden /> {verrouille ? "Vu verrouillé" : "Voir verrouillé"}
              </button>
            </div>
            <CorpsCarte className="pt-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <PastilleRarete rarete={rarete} />
                <span className="text-xs text-muted-foreground">
                  {LIBELLES.matiere[matiere]} · {LIBELLES.forme[forme]} · effet {LIBELLES.effet[effet].toLowerCase()}
                </span>
              </div>
              <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-[13px] font-medium">
                <span className="text-muted-foreground">Débloqué quand : </span>
                {critere
                  ? phraseCritere(critere.libelle, critere.unite, Number.isFinite(seuilNombre) ? seuilNombre : 0, nomParametre)
                  : "choisissez un critère"}
                {Number(xpBonus) > 0 ? <span className="chiffres ml-1 font-bold text-or">+{Number(xpBonus)} XP</span> : null}
              </p>
              <div className="mt-4 flex items-end justify-around gap-3 border-t border-border pt-4">
                {[72, 48, 32].map((t) => (
                  <span key={t} className="flex flex-col items-center gap-1.5">
                    <BadgeVisuel apparence={apparence} taille={t} />
                    <span className="chiffres text-[11px] text-muted-foreground">{t} px</span>
                  </span>
                ))}
              </div>
            </CorpsCarte>
          </Carte>
        </div>
      </aside>

      <div className="grid min-w-0 gap-6 lg:order-1">
        <Carte>
          <EnteteCarte titre="Identité" description="Ce que le membre lit dans sa collection et dans la célébration." />
          <CorpsCarte className="grid gap-4">
            <Groupe id="badge-nom" label="Nom" erreur={e.nom}>
              <Champ id="badge-nom" name="nom" value={nom} onChange={(ev) => setNom(ev.target.value)} maxLength={60} required aria-invalid={!!e.nom} placeholder="Marathonien du savoir" />
            </Groupe>
            <Groupe id="badge-description" label="Description" erreur={e.description} aide={`${description.length}/240 — une phrase à la deuxième personne, qui félicite.`}>
              <ZoneTexte
                id="badge-description"
                name="description"
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                maxLength={240}
                rows={2}
                className="min-h-16"
                aria-invalid={!!e.description}
                placeholder="Vous avez terminé dix formations : la régularité paie."
              />
            </Groupe>
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre="Apparence" description="Forme, matière et rareté composent le badge ; l'aperçu se met à jour en direct." />
          <CorpsCarte className="grid gap-5">
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Couleur</p>
              <ChoixCouleur id="badge-couleur" name="couleur" valeur={couleur} onChange={setCouleur} erreur={e.couleur} />
            </div>
            <Choix
              libelle="Forme"
              name="forme"
              options={FORMES}
              valeur={forme}
              onChange={setForme}
              rendu={(f) => (
                <>
                  <BadgeVisuel apparence={{ ...apparence, forme: f, effet: "AUCUN", rarete: "COMMUN" }} taille={20} anime={false} />
                  {LIBELLES.forme[f]}
                </>
              )}
            />
            <Choix
              libelle="Matière"
              name="matiere"
              options={MATIERES}
              valeur={matiere}
              onChange={setMatiere}
              rendu={(m) => (
                <>
                  <span className="h-4 w-4 rounded-full ring-1 ring-border" style={{ background: TEINTES_MATIERES[m] }} aria-hidden />
                  {LIBELLES.matiere[m]}
                </>
              )}
            />
            <div>
              <Choix libelle="Rareté" name="rarete" options={RARETES} valeur={rarete} onChange={changerRarete} rendu={(r) => LIBELLES.rarete[r]} />
              <p className="mt-1.5 text-xs text-muted-foreground">La rareté règle la lueur du badge. Réservez Légendaire et Mythique aux exploits.</p>
            </div>
            <div>
              <Choix libelle="Effet" name="effet" options={EFFETS} valeur={effet} onChange={setEffet} rendu={(x) => LIBELLES.effet[x]} />
              {effet !== suggestion ? (
                <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-or-soft px-3 py-2 text-[13px]">
                  <Wand2 size={14} className="text-or" aria-hidden />
                  Effet suggéré pour un badge {LIBELLES.rarete[rarete].toLowerCase()} : <strong>{LIBELLES.effet[suggestion]}</strong>
                  <Bouton variante="contour" taille="sm" className="ml-auto h-7" onClick={() => setEffet(suggestion)}>
                    Appliquer
                  </Bouton>
                </p>
              ) : null}
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Icône</p>
              <ChoixIcone name="icone" valeur={icone} onChange={setIcone} couleur={couleur} />
              {e.icone ? <p className="mt-1.5 text-xs font-medium text-danger">{e.icone}</p> : null}
            </div>
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre="Déblocage" description="Le badge s'attribue tout seul dès que le critère atteint le seuil." />
          <CorpsCarte className="grid gap-4">
            <Groupe id="badge-critere" label="Critère" erreur={e.critereCode} aide={critere?.description}>
              <Selecteur
                id="badge-critere"
                name="critereCode"
                value={critereCode}
                onChange={(ev) => {
                  setCritereCode(ev.target.value);
                  setParametre("");
                  if (criteres.find((c) => c.code === ev.target.value)?.unite === "") setSeuil("1");
                }}
                aria-invalid={!!e.critereCode}
              >
                {criteres.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.libelle}
                  </option>
                ))}
              </Selecteur>
            </Groupe>
            <div className="grid gap-4 sm:grid-cols-2">
              <Groupe
                id="badge-seuil"
                label="Seuil"
                erreur={e.seuil}
                aide={ouiNon ? "Critère oui / non : le seuil vaut 1." : `En ${critere?.unite ?? "unités"}.`}
              >
                <div className="relative">
                  <Champ
                    id="badge-seuil"
                    name="seuil"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={ouiNon ? "1" : seuil}
                    onChange={(ev) => setSeuil(ev.target.value)}
                    readOnly={ouiNon}
                    aria-invalid={!!e.seuil}
                    className={cn("chiffres", critere?.unite ? "pr-24" : "")}
                  />
                  {critere?.unite ? (
                    <span className="pointer-events-none absolute right-3.5 top-1/2 max-w-[5.5rem] -translate-y-1/2 truncate text-[13px] text-muted-foreground">
                      {critere.unite}
                    </span>
                  ) : null}
                </div>
              </Groupe>
              {listeParametre ? (
                <Groupe
                  id="badge-parametre"
                  label={critere?.parametre === "DOMAINE" ? "Domaine" : "Parcours publié"}
                  erreur={e.parametre}
                >
                  <Selecteur id="badge-parametre" name="parametre" value={parametre} onChange={(ev) => setParametre(ev.target.value)} aria-invalid={!!e.parametre}>
                    <option value="">Choisir…</option>
                    {listeParametre.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </Selecteur>
                  {listeParametre.length === 0 ? (
                    <p className="mt-1.5 text-xs text-warning">Aucun parcours publié : publiez-en un avant de créer ce badge.</p>
                  ) : null}
                </Groupe>
              ) : null}
            </div>
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre="Options" />
          <CorpsCarte className="grid gap-4">
            <Groupe id="badge-xp" label="Bonus d'XP" erreur={e.xpBonus} aide="Ajouté une seule fois, à l'obtention. 0 pour aucun bonus.">
              <Champ
                id="badge-xp"
                name="xpBonus"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                value={xpBonus}
                onChange={(ev) => setXpBonus(ev.target.value)}
                className="chiffres max-w-[10rem]"
                aria-invalid={!!e.xpBonus}
              />
            </Groupe>
            <CaseACocher name="secret" defaultChecked={badge?.secret ?? false} label="Badge secret" description="Caché dans la collection des membres tant qu'il n'est pas obtenu : la surprise fait partie du plaisir." />
            <CaseACocher key={String(badge?.actif ?? true)} name="actif" defaultChecked={badge?.actif ?? true} label="Badge actif" description="Décoché : plus aucune attribution. Ceux qui l'ont déjà le gardent." />
          </CorpsCarte>
        </Carte>

        {etat.erreur ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {etat.erreur}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {badge ? (
            <BoutonConfirme
              variante={badge.actif ? "fantome" : "succes"}
              titre={badge.actif ? "Archiver le badge" : "Restaurer le badge"}
              libelleConfirmation={badge.actif ? "Archiver" : "Restaurer"}
              message={
                badge.actif
                  ? `Plus personne ne pourra obtenir « ${badge.nom} ». Les ${badge.obtenus} membre(s) qui l'ont déjà le gardent dans leur collection.`
                  : `« ${badge.nom} » pourra de nouveau être obtenu.`
              }
              champs={{ id: badge.id, actif: badge.actif ? "false" : "true" }}
              action={async (fd) => {
                await lancerAction(() => changerActivationBadge(fd));
                router.refresh();
              }}
            >
              {badge.actif ? <Archive size={16} /> : <ArchiveRestore size={16} />} {badge.actif ? "Archiver" : "Restaurer"}
            </BoutonConfirme>
          ) : null}
          <BoutonSoumission enCours="Enregistrement…">{badge ? "Enregistrer le badge" : "Créer le badge"}</BoutonSoumission>
        </div>
      </div>
    </form>
  );
}
