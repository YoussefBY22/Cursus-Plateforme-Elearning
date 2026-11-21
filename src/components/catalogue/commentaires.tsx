"use client";

import * as React from "react";
import { Flag, Heart, MessageSquare, Reply } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Bouton } from "@/components/ui/bouton";
import { Dialogue } from "@/components/ui/dialogue";
import { Groupe, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { EtatVide } from "@/components/ui/etat-vide";
import { toast } from "@/components/ui/toasts";
import { cn, depuis, nomComplet } from "@/lib/utils";
import { basculerLike, publierCommentaire, signalerCommentaire } from "@/server/actions/apprentissage";
import type { CommentaireAffiche } from "@/server/requetes/catalogue";
import { MOTIFS_SIGNALEMENT, type MotifSignalement } from "@/services/moderation";

/**
 * Fil de commentaires d'une formation : deux niveaux, likes, signalement.
 *
 * Les likes et les nouveaux messages s'affichent tout de suite en local, puis
 * sont confirmés par le serveur — on ne recharge pas la page pour un cœur.
 */

type Etat = { nbLikes: number; aime: boolean; signale: boolean };

/** Clé des commentaires publiés pendant la visite, par message parent. */
const RACINE = "_racine";

export type Moi = { id: string; prenom: string; nom: string; photoUrl: string | null };

export function Commentaires({
  formationId,
  fil,
  moi,
  peutEcrire,
}: {
  formationId: string;
  fil: CommentaireAffiche[];
  moi: Moi;
  peutEcrire: boolean;
}) {
  const moiId = moi.id;
  const [ajouts, setAjouts] = React.useState<Record<string, CommentaireAffiche[]>>({});
  const [etats, setEtats] = React.useState<Record<string, Etat>>({});
  const [aSignaler, setASignaler] = React.useState<string | null>(null);

  const etatDe = (c: CommentaireAffiche): Etat =>
    etats[c.id] ?? { nbLikes: c.nbLikes, aime: c.aime, signale: c.signale };

  const ajouter = (cle: string, c: CommentaireAffiche) =>
    setAjouts((a) => ({ ...a, [cle]: [...(a[cle] ?? []), c] }));

  async function aimer(c: CommentaireAffiche) {
    const avant = etatDe(c);
    const optimiste: Etat = { ...avant, aime: !avant.aime, nbLikes: avant.nbLikes + (avant.aime ? -1 : 1) };
    setEtats((e) => ({ ...e, [c.id]: optimiste }));
    const r = await basculerLike({ commentaireId: c.id });
    if (r.erreur) {
      setEtats((e) => ({ ...e, [c.id]: avant }));
      toast({ titre: "Action impossible", description: r.erreur, ton: "erreur" });
      return;
    }
    if (r.donnees) setEtats((e) => ({ ...e, [c.id]: { ...optimiste, aime: r.donnees!.aime, nbLikes: r.donnees!.nb } }));
  }

  const racines = [...fil, ...(ajouts[RACINE] ?? [])];

  return (
    <div className="space-y-5">
      {peutEcrire ? (
        <Formulaire
          formationId={formationId}
          placeholder="Une question, un retour d'expérience, un point à éclaircir…"
          libelle="Publier le commentaire"
          onPublie={(c) => ajouter(RACINE, c)}
          moi={moi}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
          Commencez la formation pour participer à la discussion.
        </p>
      )}

      {racines.length ? (
        <ul className="space-y-4">
          {racines.map((c) => (
            <li key={c.id}>
              <Message
                c={c}
                etat={etatDe(c)}
                moiId={moiId}
                peutEcrire={peutEcrire}
                formationId={formationId}
                moi={moi}
                onAimer={() => aimer(c)}
                onSignaler={() => setASignaler(c.id)}
                onRepondre={(r) => ajouter(c.id, r)}
                reponses={[...c.reponses, ...(ajouts[c.id] ?? [])].map((r) => ({ c: r, etat: etatDe(r) }))}
                aimerReponse={aimer}
                signalerReponse={setASignaler}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EtatVide
          compact
          icone={<MessageSquare className="h-5 w-5" />}
          titre="Personne n'a encore écrit"
          description="Ouvrez la discussion : une question posée ici profite à tous ceux qui suivront la formation après vous."
        />
      )}

      <DialogueSignalement
        commentaireId={aSignaler}
        onFermer={() => setASignaler(null)}
        onSignale={(id) => setEtats((e) => ({ ...e, [id]: { ...(e[id] ?? { nbLikes: 0, aime: false, signale: false }), signale: true } }))}
      />
    </div>
  );
}

function Message({
  c,
  etat,
  moiId,
  peutEcrire,
  formationId,
  moi,
  reponses,
  onAimer,
  onSignaler,
  onRepondre,
  aimerReponse,
  signalerReponse,
}: {
  c: CommentaireAffiche;
  etat: Etat;
  moiId: string;
  peutEcrire: boolean;
  formationId: string;
  moi: Moi;
  reponses: { c: CommentaireAffiche; etat: Etat }[];
  onAimer: () => void;
  onSignaler: () => void;
  onRepondre: (c: CommentaireAffiche) => void;
  aimerReponse: (c: CommentaireAffiche) => void;
  signalerReponse: (id: string) => void;
}) {
  const [repondre, setRepondre] = React.useState(false);

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <Tete c={c} moiId={moiId} />
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{c.texte}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <BoutonLike etat={etat} onClick={onAimer} />
        {peutEcrire ? (
          <button
            type="button"
            onClick={() => setRepondre((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Reply className="h-3.5 w-3.5" aria-hidden />
            Répondre
          </button>
        ) : null}
        {c.auteur.id !== moiId ? <BoutonSignaler signale={etat.signale} onClick={onSignaler} /> : null}
      </div>

      {repondre ? (
        <div className="mt-3 border-l-2 border-border pl-4">
          <Formulaire
            formationId={formationId}
            parentId={c.id}
            placeholder={`Répondre à ${c.auteur.prenom}…`}
            libelle="Publier la réponse"
            moi={moi}
            onPublie={(r) => {
              onRepondre(r);
              setRepondre(false);
            }}
          />
        </div>
      ) : null}

      {reponses.length ? (
        <ul className="mt-4 space-y-3 border-l-2 border-border pl-4">
          {reponses.map(({ c: r, etat: e }) => (
            <li key={r.id}>
              <Tete c={r} moiId={moiId} />
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{r.texte}</p>
              <div className="mt-2 flex items-center gap-1">
                <BoutonLike etat={e} onClick={() => aimerReponse(r)} />
                {r.auteur.id !== moiId ? <BoutonSignaler signale={e.signale} onClick={() => signalerReponse(r.id)} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function Tete({ c, moiId }: { c: CommentaireAffiche; moiId: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar nom={nomComplet(c.auteur)} photo={c.auteur.photoUrl} taille="sm" />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold">
          {nomComplet(c.auteur)}
          {c.auteur.id === moiId ? <span className="ml-1.5 font-semibold text-muted-foreground">(vous)</span> : null}
        </p>
        <p className="text-[11px] text-muted-foreground">{depuis(c.creeLe)}</p>
      </div>
    </div>
  );
}

function BoutonLike({ etat, onClick }: { etat: Etat; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={etat.aime}
      aria-label={etat.aime ? "Retirer mon j'aime" : "J'aime ce commentaire"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
        etat.aime ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Heart className={cn("h-3.5 w-3.5 transition-transform", etat.aime && "scale-110 fill-current")} aria-hidden />
      {etat.nbLikes > 0 ? <span className="tabular-nums">{etat.nbLikes}</span> : "J'aime"}
    </button>
  );
}

function BoutonSignaler({ signale, onClick }: { signale: boolean; onClick: () => void }) {
  if (signale) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        <Flag className="h-3.5 w-3.5 fill-current" aria-hidden />
        Signalé
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Flag className="h-3.5 w-3.5" aria-hidden />
      Signaler
    </button>
  );
}

const LIMITE = 2000;

function Formulaire({
  formationId,
  parentId,
  placeholder,
  libelle,
  moi,
  onPublie,
}: {
  formationId: string;
  parentId?: string;
  placeholder: string;
  libelle: string;
  moi: Moi;
  onPublie: (c: CommentaireAffiche) => void;
}) {
  const [texte, setTexte] = React.useState("");
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [enCours, setEnCours] = React.useState(false);

  async function envoyer() {
    setEnCours(true);
    setErreur(null);
    const r = await publierCommentaire({ formationId, parentId: parentId ?? null, texte });
    setEnCours(false);
    if (r.erreur || !r.donnees) {
      setErreur(r.erreur ?? "Commentaire non publié.");
      return;
    }
    onPublie({
      id: r.donnees.id,
      texte: texte.trim(),
      creeLe: new Date(),
      auteur: { id: moi.id, prenom: moi.prenom, nom: moi.nom, photoUrl: moi.photoUrl },
      nbLikes: 0,
      aime: false,
      signale: false,
      reponses: [],
    });
    setTexte("");
    toast({ titre: "Commentaire publié", ton: "succes" });
  }

  const trop = texte.length > LIMITE;

  return (
    <div>
      <Groupe id={`commentaire-${parentId ?? "racine"}`} label="Votre message" erreur={erreur}>
        <ZoneTexte
          id={`commentaire-${parentId ?? "racine"}`}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={placeholder}
          maxLength={LIMITE + 200}
          aria-invalid={trop || Boolean(erreur)}
        />
      </Groupe>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={cn("text-xs tabular-nums", trop ? "font-semibold text-danger" : "text-muted-foreground")}>
          {texte.length} / {LIMITE}
        </span>
        <Bouton onClick={envoyer} disabled={enCours || texte.trim().length < 2 || trop} taille="sm">
          {enCours ? "Publication…" : libelle}
        </Bouton>
      </div>
    </div>
  );
}

function DialogueSignalement({
  commentaireId,
  onFermer,
  onSignale,
}: {
  commentaireId: string | null;
  onFermer: () => void;
  onSignale: (id: string) => void;
}) {
  const [motif, setMotif] = React.useState<MotifSignalement>(MOTIFS_SIGNALEMENT[0]);
  const [details, setDetails] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);

  async function envoyer() {
    if (!commentaireId) return;
    setEnCours(true);
    const r = await signalerCommentaire({ commentaireId, motif, details: details.trim() || null });
    setEnCours(false);
    if (r.erreur) {
      toast({ titre: "Signalement non transmis", description: r.erreur, ton: "erreur" });
      return;
    }
    onSignale(commentaireId);
    toast({ titre: "Signalement transmis", description: r.message, ton: "succes" });
    setDetails("");
    onFermer();
  }

  return (
    <Dialogue
      ouvert={Boolean(commentaireId)}
      onFermer={onFermer}
      titre="Signaler ce commentaire"
      description="Un responsable de la plateforme examinera le message. L'auteur ne saura pas qui l'a signalé."
    >
      <div className="space-y-4">
        <Groupe id="motif-signalement" label="Motif">
          <Selecteur
            id="motif-signalement"
            value={motif}
            onChange={(e) => setMotif(e.target.value as MotifSignalement)}
          >
            {MOTIFS_SIGNALEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Selecteur>
        </Groupe>
        <Groupe id="details-signalement" label="Précisions" aide="Facultatif, 500 caractères au plus.">
          <ZoneTexte
            id="details-signalement"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            placeholder="Ce qui pose problème dans ce message."
          />
        </Groupe>
        <div className="flex justify-end gap-2">
          <Bouton variante="contour" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton variante="danger" onClick={envoyer} disabled={enCours}>
            {enCours ? "Envoi…" : "Signaler le commentaire"}
          </Bouton>
        </div>
      </div>
    </Dialogue>
  );
}
