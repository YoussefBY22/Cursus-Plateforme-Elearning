"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CloudOff,
  FileDown,
  ImagePlus,
  Image as IconeImage,
  Loader2,
  Lock,
  Minus,
  MonitorSmartphone,
  QrCode,
  RotateCcw,
  Square,
  Star,
  Type,
  Undo2,
  Upload,
} from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { Pastille } from "@/components/ui/pastille";
import { toast } from "@/components/ui/toasts";
import { lancerAction } from "@/components/admin/retour-action";
import { cn } from "@/lib/utils";
import {
  deposerImageModele,
  definirModeleParDefaut,
  enregistrerModele,
  restaurerModele,
  type ImageModele,
} from "@/server/actions/certificats";
import {
  blocsDansLeCadre,
  cadreEntre,
  contraindre,
  deplacerDansLaPile,
  ENCADREMENT_DEFAUT,
  nomDuBloc,
  parPlan,
  planSuivant,
  STYLE_TEXTE_DEFAUT,
  type Bloc,
  type Canevas,
  type Rectangle,
} from "@/services/canevas/canevas";
import { cadreCommun, CHAMPS_CERTIFICAT, donneesExemple, NUIT } from "@/services/certificats/cadre";
import { aimanter, positionBloc, pxParMm as mesurerEchelle } from "@/services/certificats/echelle";
import {
  avertissementsModele,
  centrerHorizontalement,
  dupliquerBloc,
  recolorer,
  redimensionner,
} from "@/services/certificats/edition";
import { ContenuBloc, RenduCertificat, urlImage } from "../rendu-certificat";
import { ChampTexte, Panneau, Segments, ChoixTheme } from "./controles";
import { PanneauProprietes } from "./proprietes";

/**
 * Éditeur de modèles de certificat — pour poser texte, images, QR code et jetons sur un canevas A4.
 *
 * Le canevas entier vit dans l'état du navigateur et s'enregistre d'un bloc
 * après une pause (action serveur dans une transition, jamais un formulaire) :
 * glisser un bloc ne peut pas coûter un aller-retour par pixel. Les
 * enregistrements sont mis en file : le dernier état gagne toujours.
 *
 * Coordonnées en millimètres ; l'échelle vers les pixels est MESURÉE sur la
 * page (ResizeObserver). L'affichage des blocs, lui, passe par le même
 * composant que la page de vérification (`ContenuBloc`, en unités de
 * conteneur) : ce qu'on voit ici est ce que verra le recruteur.
 *
 * Le cadre commun de la plateforme est dessiné sous les blocs, sans
 * capter la souris : visible, jamais sélectionnable.
 */

export type ModeleEditeur = {
  id: string;
  nom: string;
  couleurTheme: string;
  domaineId: string | null;
  parDefaut: boolean;
  archive: boolean;
  canevas: Canevas;
  images: ImageModele[];
};

export type DomaineChoix = { id: string; nom: string; couleur: string; modele: { id: string; nom: string } | null };

type Reglages = { nom: string; couleurTheme: string; domaineId: string | null };
type EtatSauvegarde = "enregistre" | "attente" | "erreur";

type Geste = {
  mode: "deplacer" | "redimensionner";
  departX: number;
  departY: number;
  origines: Map<string, Bloc>;
  cible: string;
  memorise: boolean;
};

const PAUSE_MS = 800;
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

function champSaisi(cible: EventTarget | null): boolean {
  if (!(cible instanceof HTMLElement)) return false;
  return cible.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName);
}

export function EditeurModele({
  modele,
  domaines,
  qrExemple,
}: {
  modele: ModeleEditeur;
  domaines: DomaineChoix[];
  qrExemple: string;
}) {
  const router = useRouter();
  const peutEcrire = !modele.archive;
  const L = modele.canevas.largeur;

  const [canevas, setCanevas] = useState<Canevas>(modele.canevas);
  const [reglages, setReglages] = useState<Reglages>({
    nom: modele.nom,
    couleurTheme: modele.couleurTheme,
    domaineId: modele.domaineId,
  });
  const [images, setImages] = useState<ImageModele[]>(modele.images);
  const [parDefaut, setParDefaut] = useState(modele.parDefaut);
  const [selection, setSelection] = useState<string[]>([]);
  const [lasso, setLasso] = useState<Rectangle | null>(null);
  const [enGeste, setEnGeste] = useState(false);
  const [exemple, setExemple] = useState<"exemple" | "champs">("exemple");
  const [echelle, setEchelle] = useState(2.6);
  const [etat, setEtat] = useState<EtatSauvegarde>("enregistre");
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [peutAnnuler, setPeutAnnuler] = useState(false);
  const [enCours, demarrer] = useTransition();
  const [depotEnCours, demarrerDepot] = useTransition();

  const page = useRef<HTMLDivElement>(null);
  const fichierRef = useRef<HTMLInputElement>(null);
  const canevasRef = useRef(canevas);
  const reglagesRef = useRef(reglages);
  const echelleRef = useRef(echelle);
  const geste = useRef<Geste | null>(null);
  const departLasso = useRef<{ x: number; y: number } | null>(null);
  const lassoRef = useRef<Rectangle | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const file = useRef<Promise<unknown>>(Promise.resolve());
  const historique = useRef<Canevas[]>([]);
  const derniereCle = useRef<{ cle: string; t: number } | null>(null);
  const compteur = useRef(0);

  const donnees = donneesExemple();
  const blocSeul = selection.length === 1 ? (canevas.blocs.find((b) => b.id === selection[0]) ?? null) : null;
  const cadre = cadreCommun(reglages.couleurTheme);
  const avertissements = avertissementsModele(canevas);
  const aUnQr = canevas.blocs.some((b) => b.type === "QRCODE");

  /* ---------------------------------------------------------------- */
  /* Échelle                                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const observateur = new ResizeObserver(([entree]) => {
      const e = mesurerEchelle(entree.contentRect.width, L);
      if (e) {
        echelleRef.current = e;
        setEchelle(e);
      }
    });
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [L]);

  /* ---------------------------------------------------------------- */
  /* Enregistrement                                                    */
  /* ---------------------------------------------------------------- */

  /** Envoie l'état COURANT, après les envois déjà partis : le dernier état gagne. */
  const envoyer = useCallback((): Promise<boolean> => {
    const tache = file.current.then(
      () =>
        new Promise<boolean>((resolve) => {
          const r = reglagesRef.current;
          if (r.nom.trim().length < 3) {
            setEtat("erreur");
            setErreur("Donnez un nom au modèle (3 caractères au moins) pour l'enregistrer.");
            setErreurs({ nom: "3 caractères au moins." });
            resolve(false);
            return;
          }
          demarrer(async () => {
            try {
              const res = await enregistrerModele({ id: modele.id, ...r, canevas: canevasRef.current });
              if (res.ok) {
                setErreur(null);
                setErreurs({});
                if (!minuterie.current) setEtat("enregistre");
                resolve(true);
              } else {
                setEtat("erreur");
                setErreur(res.erreur ?? "Enregistrement refusé.");
                setErreurs(res.erreurs ?? {});
                resolve(false);
              }
            } catch {
              setEtat("erreur");
              setErreur("Le serveur n'a pas répondu. Vos modifications restent à l'écran.");
              resolve(false);
            }
          });
        })
    );
    file.current = tache.catch(() => false);
    return tache;
  }, [modele.id]);

  const programmer = useCallback(() => {
    if (!peutEcrire) return;
    if (minuterie.current) clearTimeout(minuterie.current);
    setEtat("attente");
    minuterie.current = setTimeout(() => {
      minuterie.current = null;
      void envoyer();
    }, PAUSE_MS);
  }, [envoyer, peutEcrire]);

  const enregistrerMaintenant = useCallback(async () => {
    if (minuterie.current) {
      clearTimeout(minuterie.current);
      minuterie.current = null;
      return envoyer();
    }
    await file.current;
    return true;
  }, [envoyer]);

  useEffect(() => {
    const avantDepart = (e: BeforeUnloadEvent) => {
      if (minuterie.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", avantDepart);
    return () => {
      window.removeEventListener("beforeunload", avantDepart);
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Mises à jour + historique                                         */
  /* ---------------------------------------------------------------- */

  /** Mémorise l'état avant une modification. Une même clé rapprochée ne fait qu'une étape. */
  const memoriser = useCallback((cle?: string) => {
    const t = Date.now();
    if (cle && derniereCle.current?.cle === cle && t - derniereCle.current.t < 1500) {
      derniereCle.current.t = t;
      return;
    }
    derniereCle.current = cle ? { cle, t } : null;
    historique.current = [...historique.current.slice(-49), canevasRef.current];
    setPeutAnnuler(true);
  }, []);

  const appliquer = useCallback(
    (suivant: Canevas) => {
      canevasRef.current = suivant;
      setCanevas(suivant);
      programmer();
    },
    [programmer]
  );

  const majBlocs = useCallback(
    (transformer: (bloc: Bloc) => Bloc, ids: string[]) => {
      const courant = canevasRef.current;
      appliquer({
        ...courant,
        blocs: courant.blocs.map((b) => (ids.includes(b.id) ? contraindre(transformer(b), courant) : b)),
      });
    },
    [appliquer]
  );

  const annuler = useCallback(() => {
    const precedent = historique.current.pop();
    if (!precedent) return;
    setPeutAnnuler(historique.current.length > 0);
    derniereCle.current = null;
    setSelection((s) => s.filter((id) => precedent.blocs.some((b) => b.id === id)));
    appliquer(precedent);
  }, [appliquer]);

  function majReglages(ajouts: Partial<Reglages>) {
    const suivant = { ...reglagesRef.current, ...ajouts };
    if (ajouts.couleurTheme && ajouts.couleurTheme !== reglagesRef.current.couleurTheme) {
      const recolore = recolorer(canevasRef.current, reglagesRef.current.couleurTheme, ajouts.couleurTheme);
      if (recolore !== canevasRef.current) {
        canevasRef.current = recolore;
        setCanevas(recolore);
      }
    }
    reglagesRef.current = suivant;
    setReglages(suivant);
    programmer();
  }

  function identifiant(prefixe: string) {
    compteur.current += 1;
    return `${prefixe}-${Date.now().toString(36)}-${compteur.current}`;
  }

  function ajouter(nouveau: Bloc) {
    memoriser();
    const courant = canevasRef.current;
    appliquer({ ...courant, blocs: [...courant.blocs, contraindre({ ...nouveau, plan: planSuivant(courant.blocs) }, courant)] });
    setSelection([nouveau.id]);
  }

  function supprimer(ids: string[]) {
    if (!ids.length) return;
    memoriser();
    const courant = canevasRef.current;
    appliquer({ ...courant, blocs: courant.blocs.filter((b) => !ids.includes(b.id)) });
    setSelection([]);
    toast({
      titre: ids.length > 1 ? `${ids.length} blocs supprimés` : "Bloc supprimé",
      description: "Ctrl+Z ou « Annuler » pour le retrouver.",
      ton: "info",
    });
  }

  function dupliquer(bloc: Bloc) {
    if (bloc.type === "QRCODE") return;
    const copie = dupliquerBloc(bloc, identifiant(bloc.type.toLowerCase()), 0, canevasRef.current);
    ajouter(copie);
  }

  /* ---------------------------------------------------------------- */
  /* Souris : glissement et lasso                                      */
  /* ---------------------------------------------------------------- */

  const pointDansPage = useCallback((clientX: number, clientY: number) => {
    const r = page.current?.getBoundingClientRect();
    const e = echelleRef.current;
    if (!r) return { x: 0, y: 0 };
    return { x: (clientX - r.left) / e, y: (clientY - r.top) / e };
  }, []);

  useEffect(() => {
    function bouger(ev: PointerEvent) {
      const g = geste.current;
      if (g) {
        const e = echelleRef.current;
        const dx = (ev.clientX - g.departX) / e;
        const dy = (ev.clientY - g.departY) / e;
        if (!g.memorise) {
          if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
          memoriser();
          g.memorise = true;
          setEnGeste(true);
        }
        if (g.mode === "deplacer") {
          majBlocs((b) => {
            const o = g.origines.get(b.id);
            return o ? { ...b, x: aimanter(o.x + dx), y: aimanter(o.y + dy) } : b;
          }, [...g.origines.keys()]);
        } else {
          const o = g.origines.get(g.cible);
          if (o) majBlocs(() => redimensionner(o, dx, dy), [g.cible]);
        }
        return;
      }
      if (departLasso.current) {
        const cadreLasso = cadreEntre(departLasso.current, pointDansPage(ev.clientX, ev.clientY));
        lassoRef.current = cadreLasso;
        setLasso(cadreLasso);
      }
    }

    function lacher() {
      geste.current = null;
      setEnGeste(false);
      const cadreLasso = lassoRef.current;
      if (departLasso.current && cadreLasso && (cadreLasso.largeur > 2 || cadreLasso.hauteur > 2)) {
        // Un cadre minuscule est un clic, pas un lasso.
        setSelection(blocsDansLeCadre(canevasRef.current.blocs, cadreLasso));
      }
      departLasso.current = null;
      lassoRef.current = null;
      setLasso(null);
    }

    window.addEventListener("pointermove", bouger);
    window.addEventListener("pointerup", lacher);
    window.addEventListener("pointercancel", lacher);
    return () => {
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", lacher);
      window.removeEventListener("pointercancel", lacher);
    };
  }, [majBlocs, memoriser, pointDansPage]);

  function saisir(ev: React.PointerEvent, cible: Bloc, mode: Geste["mode"]) {
    if (!peutEcrire || ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    const retenus = ev.shiftKey
      ? selection.includes(cible.id)
        ? selection.filter((id) => id !== cible.id)
        : [...selection, cible.id]
      : selection.includes(cible.id)
        ? selection
        : [cible.id];
    setSelection(retenus);
    geste.current = {
      mode,
      departX: ev.clientX,
      departY: ev.clientY,
      cible: cible.id,
      memorise: false,
      origines: new Map(canevasRef.current.blocs.filter((b) => (mode === "deplacer" ? retenus.includes(b.id) : b.id === cible.id)).map((b) => [b.id, b])),
    };
  }

  function commencerLasso(ev: React.PointerEvent) {
    if (!peutEcrire || ev.button !== 0) return;
    if (!ev.shiftKey) setSelection([]);
    departLasso.current = pointDansPage(ev.clientX, ev.clientY);
  }

  /* ---------------------------------------------------------------- */
  /* Clavier                                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    function touche(ev: KeyboardEvent) {
      if (champSaisi(ev.target)) return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        annuler();
        return;
      }
      if (!peutEcrire || !selection.length) return;
      if (ev.key === "Escape") {
        setSelection([]);
        return;
      }
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        supprimer(selection);
        return;
      }
      if (mod && ev.key.toLowerCase() === "d" && selection.length === 1) {
        ev.preventDefault();
        const b = canevasRef.current.blocs.find((x) => x.id === selection[0]);
        if (b) dupliquer(b);
        return;
      }
      const pas = ev.shiftKey ? 5 : 0.5;
      const deplacement: Record<string, [number, number]> = {
        ArrowLeft: [-pas, 0],
        ArrowRight: [pas, 0],
        ArrowUp: [0, -pas],
        ArrowDown: [0, pas],
      };
      const d = deplacement[ev.key];
      if (d) {
        ev.preventDefault();
        memoriser("clavier");
        majBlocs((b) => ({ ...b, x: aimanter(b.x + d[0]), y: aimanter(b.y + d[1]) }), selection);
      }
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  /* ---------------------------------------------------------------- */
  /* Ajouts                                                            */
  /* ---------------------------------------------------------------- */

  function ajouterTexte(contenu: string, x?: number, y?: number) {
    const largeur = 120;
    ajouter({
      id: identifiant("texte"),
      type: "TEXTE",
      x: x ?? aimanter((L - largeur) / 2),
      y: y ?? 92,
      largeur,
      hauteur: 10,
      plan: 0,
      contenu,
      style: { ...STYLE_TEXTE_DEFAUT, taille: 12, couleur: NUIT, alignement: "centre", alignementVertical: "milieu" },
      encadrement: { ...ENCADREMENT_DEFAUT },
      marge: 0.5,
    });
  }

  function insererChamp(jeton: string) {
    const jetonTexte = `{{${jeton}}}`;
    if (blocSeul?.type === "TEXTE") {
      memoriser();
      const contenu = blocSeul.contenu.trim() ? `${blocSeul.contenu} ${jetonTexte}` : jetonTexte;
      majBlocs((b) => ({ ...b, contenu }) as Bloc, [blocSeul.id]);
      return;
    }
    ajouterTexte(jetonTexte);
  }

  function ajouterImage(image: ImageModele, ratio = 1.6, position?: { x: number; y: number }) {
    const largeur = 40;
    const hauteur = Math.max(5, Math.min(80, largeur / (ratio || 1.6)));
    ajouter({
      id: identifiant("image"),
      type: "IMAGE",
      x: position ? aimanter(position.x - largeur / 2) : aimanter((L - largeur) / 2),
      y: position ? aimanter(position.y - hauteur / 2) : 24,
      largeur,
      hauteur: aimanter(hauteur),
      plan: 0,
      nom: image.nom,
      fichierId: image.fichierId,
      nomFichier: image.nom,
      ajustement: "contenir",
      opacite: 1,
    });
  }

  function televerser(fichier: File, position?: { x: number; y: number }) {
    if (!["image/png", "image/jpeg"].includes(fichier.type)) {
      toast({ titre: "Format non pris en charge", description: "Déposez une image PNG ou JPEG.", ton: "erreur" });
      return;
    }
    if (fichier.size > TAILLE_MAX_IMAGE) {
      toast({ titre: "Image trop lourde", description: "5 Mo au plus. Réduisez-la puis réessayez.", ton: "erreur" });
      return;
    }
    demarrerDepot(async () => {
      let ratio = 1.6;
      try {
        const bmp = await createImageBitmap(fichier);
        ratio = bmp.width / Math.max(1, bmp.height);
        bmp.close();
      } catch {
        // Proportions inconnues : le bloc « contenir » s'en accommode.
      }
      const fd = new FormData();
      fd.set("modeleId", modele.id);
      fd.set("image", fichier);
      const r = await lancerAction(() => deposerImageModele(fd), "Image déposée");
      if (r.ok && r.donnees) {
        const image = r.donnees;
        setImages((liste) => [...liste, image]);
        ajouterImage(image, ratio, position);
      }
    });
  }

  function deposer(ev: React.DragEvent) {
    ev.preventDefault();
    if (!peutEcrire) return;
    const position = pointDansPage(ev.clientX, ev.clientY);
    const jeton = ev.dataTransfer.getData("text/jeton");
    if (jeton) {
      ajouterTexte(`{{${jeton}}}`, aimanter(position.x - 60), aimanter(position.y - 5));
      return;
    }
    const fichier = ev.dataTransfer.files?.[0];
    if (fichier) televerser(fichier, position);
  }

  async function ouvrirApercu() {
    // La fenêtre s'ouvre tout de suite (sinon le navigateur la bloque), puis
    // reçoit l'adresse une fois les dernières modifications enregistrées.
    const fenetre = window.open("about:blank", "_blank");
    const ok = await enregistrerMaintenant();
    if (!ok) {
      fenetre?.close();
      toast({ titre: "Aperçu impossible", description: "Le modèle n'a pas pu être enregistré. Corrigez l'erreur signalée.", ton: "erreur" });
      return;
    }
    const url = `/api/admin/certificats/modeles/${modele.id}/apercu?v=${Date.now()}`;
    if (fenetre) {
      fenetre.opener = null;
      fenetre.location.href = url;
    } else window.location.href = url;
  }

  /* ---------------------------------------------------------------- */
  /* Rendu                                                             */
  /* ---------------------------------------------------------------- */

  const indicateur = (
    <p aria-live="polite" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {!peutEcrire ? (
        <>
          <Lock className="h-3.5 w-3.5" aria-hidden /> Lecture seule
        </>
      ) : enCours ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Enregistrement…
        </>
      ) : etat === "erreur" ? (
        <span className="flex items-center gap-1.5 text-danger">
          <CloudOff className="h-3.5 w-3.5" aria-hidden /> Non enregistré
        </span>
      ) : etat === "attente" ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden /> Modifications en attente
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5 text-success" aria-hidden /> Enregistré
        </>
      )}
    </p>
  );

  return (
    <>
      {/* --------------------------- Mobile : aperçu en lecture seule --- */}
      <div className="lg:hidden">
        <EntetePage titre={reglages.nom} retour={{ href: "/admin/certificats", libelle: "Certificats" }} />
        <div className="rounded-2xl border border-border bg-muted/50 p-3">
          <RenduCertificat
            canevas={canevas}
            couleurTheme={reglages.couleurTheme}
            donnees={donnees}
            qrSvg={qrExemple}
            libelle={`Aperçu du modèle ${reglages.nom}`}
            className="rounded-sm shadow-haut"
          />
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nuit text-white">
            <MonitorSmartphone className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Modifiez ce modèle sur un ordinateur</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Placer les blocs au millimètre demande une souris et un grand écran. Ici, vous voyez le rendu avec des données
              d&apos;exemple.
            </p>
            <Bouton variante="contour" taille="sm" className="mt-3" onClick={ouvrirApercu}>
              <FileDown className="h-4 w-4" aria-hidden /> Aperçu PDF
            </Bouton>
          </div>
        </div>
      </div>

      {/* ------------------------------------------ Bureau : éditeur --- */}
      <div className="hidden lg:block">
        <EntetePage
          titre={reglages.nom || "Modèle sans nom"}
          retour={{ href: "/admin/certificats", libelle: "Certificats" }}
          description="Placez textes, champs, images et QR code. Le cadre de la plateforme est imposé et reste sous vos blocs."
          actions={
            <>
              {indicateur}
              <Bouton onClick={ouvrirApercu}>
                <FileDown className="h-4 w-4" aria-hidden /> Aperçu PDF
              </Bouton>
            </>
          }
          className="mb-5"
        />

        {modele.archive ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
            <span className="font-medium">Ce modèle est archivé : il ne sert plus à aucune émission et ne se modifie pas.</span>
            <Bouton
              variante="contour"
              taille="sm"
              onClick={async () => {
                const fd = new FormData();
                fd.set("id", modele.id);
                const r = await lancerAction(() => restaurerModele(fd));
                if (r.ok) router.refresh();
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Restaurer le modèle
            </Bouton>
          </div>
        ) : null}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-3">
            {/* Barre d'outils */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5">
              <OutilAjout libelle="Texte" disabled={!peutEcrire} onClick={() => ajouterTexte("Texte")}>
                <Type className="h-4 w-4" />
              </OutilAjout>
              <OutilAjout
                libelle="Aplat"
                disabled={!peutEcrire}
                onClick={() =>
                  ajouter({
                    id: identifiant("aplat"),
                    type: "RECTANGLE",
                    x: aimanter((L - 60) / 2),
                    y: 90,
                    largeur: 60,
                    hauteur: 12,
                    plan: 0,
                    encadrement: { ...ENCADREMENT_DEFAUT, fond: reglagesRef.current.couleurTheme },
                  })
                }
              >
                <Square className="h-4 w-4" />
              </OutilAjout>
              <OutilAjout
                libelle="Trait"
                disabled={!peutEcrire}
                onClick={() =>
                  ajouter({
                    id: identifiant("trait"),
                    type: "LIGNE",
                    x: aimanter((L - 60) / 2),
                    y: 100,
                    largeur: 60,
                    hauteur: 3,
                    plan: 0,
                    orientation: "horizontale",
                    couleur: NUIT,
                    epaisseur: 0.4,
                  })
                }
              >
                <Minus className="h-4 w-4" />
              </OutilAjout>
              <OutilAjout libelle="Image" disabled={!peutEcrire || depotEnCours} onClick={() => fichierRef.current?.click()}>
                {depotEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </OutilAjout>
              <OutilAjout
                libelle="QR code"
                titre={aUnQr ? "La page porte déjà un QR code" : "Ajouter le QR code de vérification"}
                disabled={!peutEcrire || aUnQr}
                onClick={() =>
                  ajouter({
                    id: identifiant("qr"),
                    type: "QRCODE",
                    x: aimanter((L - 24) / 2),
                    y: 150,
                    largeur: 24,
                    hauteur: 24,
                    plan: 0,
                    champ: "lienVerification",
                    couleur: NUIT,
                  })
                }
              >
                <QrCode className="h-4 w-4" />
              </OutilAjout>

              <span className="mx-1 h-6 w-px bg-border" aria-hidden />
              <Bouton variante="fantome" taille="sm" disabled={!peutAnnuler || !peutEcrire} onClick={annuler} title="Annuler (Ctrl+Z)">
                <Undo2 className="h-4 w-4" aria-hidden /> Annuler
              </Bouton>

              <div className="ml-auto w-48">
                <Segments
                  libelle="Afficher"
                  valeur={exemple}
                  onChange={setExemple}
                  options={[
                    { valeur: "exemple", libelle: "Exemple" },
                    { valeur: "champs", libelle: "Champs" },
                  ]}
                />
              </div>
            </div>

            {/* Table de travail */}
            <div className="rounded-3xl border border-border bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-muted/40 [background-size:16px_16px] p-4 xl:p-8">
              <div
                ref={page}
                onDragOver={(e) => e.preventDefault()}
                onDrop={deposer}
                onPointerDown={commencerLasso}
                style={{ aspectRatio: `${canevas.largeur} / ${canevas.hauteur}`, containerType: "inline-size", touchAction: "none" }}
                className="relative mx-auto w-full max-w-[1100px] select-none overflow-hidden bg-white shadow-haut"
              >
                {cadre.map((b) => (
                  <div key={b.id} aria-hidden className="pointer-events-none absolute" style={positionBloc(b, canevas)}>
                    <ContenuBloc bloc={b} largeurCanevas={L} donnees={donnees} qrSvg={qrExemple} brut={exemple === "champs"} />
                  </div>
                ))}

                {parPlan(canevas.blocs).map((b) => (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={-1}
                    aria-label={nomDuBloc(b)}
                    onPointerDown={(e) => saisir(e, b, "deplacer")}
                    onDoubleClick={() => {
                      if (b.type === "TEXTE") setTimeout(() => document.getElementById("prop-contenu")?.focus(), 0);
                    }}
                    className={cn(
                      "absolute",
                      peutEcrire ? "cursor-move hover:outline hover:outline-1 hover:outline-dashed hover:outline-primary/60" : ""
                    )}
                    style={{ ...positionBloc(b, canevas), opacity: b.masque ? 0.25 : 1 }}
                  >
                    <ContenuBloc bloc={b} largeurCanevas={L} donnees={donnees} qrSvg={qrExemple} brut={exemple === "champs"} />
                  </div>
                ))}

                {/* Sélection, au-dessus de tout pour rester visible */}
                {canevas.blocs
                  .filter((b) => selection.includes(b.id))
                  .map((b) => (
                    <div
                      key={`sel-${b.id}`}
                      aria-hidden
                      className="pointer-events-none absolute outline outline-2 outline-offset-1 outline-primary"
                      style={positionBloc(b, canevas)}
                    >
                      {selection.length === 1 && peutEcrire ? (
                        <span
                          role="presentation"
                          title={b.type === "QRCODE" ? "Redimensionner (reste carré)" : "Redimensionner"}
                          onPointerDown={(e) => saisir(e, b, "redimensionner")}
                          className="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-[3px] border-2 border-white bg-primary shadow"
                        />
                      ) : null}
                      {enGeste && selection.length === 1 ? (
                        <span className="chiffres absolute -top-6 left-0 whitespace-nowrap rounded-md bg-nuit px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {b.x.toLocaleString("fr-FR")} · {b.y.toLocaleString("fr-FR")} — {b.largeur.toLocaleString("fr-FR")} ×{" "}
                          {b.hauteur.toLocaleString("fr-FR")} mm
                        </span>
                      ) : null}
                    </div>
                  ))}

                {lasso ? (
                  <div
                    aria-hidden
                    style={positionBloc(lasso, canevas)}
                    className="pointer-events-none absolute border border-primary bg-primary/10"
                  />
                ) : null}
              </div>
            </div>

            <p className="flex min-h-4 flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              {erreur && etat === "erreur" ? (
                <span className="flex items-center gap-1.5 font-medium text-danger" role="alert">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {erreur}
                  <button type="button" onClick={() => void envoyer()} className="font-bold underline underline-offset-2">
                    Réessayer
                  </button>
                </span>
              ) : selection.length > 1 ? (
                `${selection.length} blocs retenus : ils se déplacent ensemble.`
              ) : (
                <>
                  <span>Glissez les blocs ; flèches pour ajuster (Maj : 5 mm).</span>
                  <span>Maj + clic ou cadre tracé pour en retenir plusieurs.</span>
                  <span className="chiffres">Échelle {echelle.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} px/mm</span>
                </>
              )}
            </p>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panneau titre="Champs à poser">
                <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
                  Glissez un champ sur la page, ou cliquez-le : il s&apos;ajoute{" "}
                  {blocSeul?.type === "TEXTE" ? <strong className="text-foreground">au texte sélectionné</strong> : "au centre de la page"}.
                  Il sera remplacé par la vraie valeur à l&apos;émission.
                </p>
                <div className="grid max-h-64 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                  {CHAMPS_CERTIFICAT.map((champ) => (
                    <button
                      key={champ.jeton}
                      type="button"
                      draggable={peutEcrire}
                      disabled={!peutEcrire}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/jeton", champ.jeton);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => insererChamp(champ.jeton)}
                      title={`Exemple : ${champ.exemple}`}
                      className="group min-w-0 cursor-grab rounded-xl border border-border px-2.5 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-primary-soft/40 active:cursor-grabbing"
                    >
                      <span className="block truncate font-mono text-[11px] font-semibold text-foreground group-hover:text-primary">{`{{${champ.jeton}}}`}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{champ.exemple}</span>
                    </button>
                  ))}
                </div>
              </Panneau>

              <Panneau
                titre={`Images du modèle (${images.length})`}
                action={
                  <Bouton variante="contour" taille="sm" disabled={!peutEcrire || depotEnCours} onClick={() => fichierRef.current?.click()}>
                    {depotEnCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
                    Déposer
                  </Bouton>
                }
              >
                <input
                  ref={fichierRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  aria-label="Image à déposer (PNG ou JPEG)"
                  tabIndex={-1}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) televerser(f);
                    e.target.value = "";
                  }}
                />
                {images.length === 0 ? (
                  <button
                    type="button"
                    disabled={!peutEcrire}
                    onClick={() => fichierRef.current?.click()}
                    className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-6 text-center hover:border-primary/50 hover:bg-muted/50"
                  >
                    <IconeImage className="h-6 w-6 text-muted-foreground" aria-hidden />
                    <span className="text-xs font-semibold">Ajoutez un logo, une signature ou un cachet</span>
                    <span className="text-[11px] text-muted-foreground">PNG ou JPEG, 5 Mo au plus. Vous pouvez aussi glisser le fichier sur la page.</span>
                  </button>
                ) : (
                  <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {images.map((image) => (
                      <button
                        key={image.fichierId}
                        type="button"
                        disabled={!peutEcrire}
                        onClick={() => ajouterImage(image)}
                        title={`Poser « ${image.nom} » sur la page`}
                        className="group flex min-w-0 flex-col gap-1 rounded-xl border border-border p-1.5 text-left hover:border-primary/50"
                      >
                        <span className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] [background-size:12px_12px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urlImage(image.fichierId)} alt="" className="max-h-full max-w-full object-contain p-1" />
                        </span>
                        <span className="truncate text-[10px] font-medium text-muted-foreground group-hover:text-foreground">{image.nom}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Panneau>
            </div>
          </div>

          {/* --------------------------------- Colonne de droite --- */}
          <aside className="space-y-4 lg:sticky lg:top-4">
            {blocSeul ? (
              <PanneauProprietes
                bloc={blocSeul}
                couleurTheme={reglages.couleurTheme}
                peutEcrire={peutEcrire}
                onChange={(ajouts) => {
                  memoriser(`prop:${blocSeul.id}:${Object.keys(ajouts).join(",")}`);
                  majBlocs((b) => ({ ...b, ...ajouts }) as Bloc, [blocSeul.id]);
                }}
                onPile={(sens) => {
                  memoriser();
                  appliquer({ ...canevasRef.current, blocs: deplacerDansLaPile(canevasRef.current.blocs, blocSeul.id, sens) });
                }}
                onCentrer={() => {
                  memoriser();
                  majBlocs((b) => centrerHorizontalement(b, canevasRef.current), [blocSeul.id]);
                }}
                onDupliquer={() => dupliquer(blocSeul)}
                onSupprimer={() => supprimer([blocSeul.id])}
              />
            ) : selection.length > 1 ? (
              <Panneau titre={`${selection.length} blocs retenus`}>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Déplacez-les ensemble à la souris ou aux flèches. Les réglages s&apos;affichent quand un seul bloc est retenu.
                </p>
                <div className="grid gap-2">
                  <Bouton
                    variante="contour"
                    taille="sm"
                    disabled={!peutEcrire}
                    onClick={() => {
                      memoriser();
                      majBlocs((b) => centrerHorizontalement(b, canevasRef.current), selection);
                    }}
                  >
                    Centrer chacun sur la page
                  </Bouton>
                  <Bouton variante="danger" taille="sm" disabled={!peutEcrire} onClick={() => supprimer(selection)}>
                    Supprimer les blocs retenus
                  </Bouton>
                </div>
              </Panneau>
            ) : (
              <Panneau titre="Réglages du modèle">
                <div className="space-y-4">
                  <div>
                    <ChampTexte
                      id="modele-nom"
                      libelle="Nom du modèle"
                      value={reglages.nom}
                      disabled={!peutEcrire}
                      maxLength={80}
                      aria-invalid={!!erreurs.nom}
                      onChange={(e) => majReglages({ nom: e.target.value })}
                    />
                    {erreurs.nom ? <p className="mt-1 text-[11px] font-medium text-danger">{erreurs.nom}</p> : null}
                  </div>

                  <ChoixTheme valeur={reglages.couleurTheme} disabled={!peutEcrire} onChange={(couleurTheme) => majReglages({ couleurTheme })} />

                  <label htmlFor="modele-domaine" className="block text-[11px] font-semibold text-muted-foreground">
                    Domaine associé
                    <select
                      id="modele-domaine"
                      value={reglages.domaineId ?? ""}
                      disabled={!peutEcrire}
                      aria-invalid={!!erreurs.domaineId}
                      onChange={(e) => majReglages({ domaineId: e.target.value || null })}
                      className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:border-primary focus:outline-none aria-invalid:border-danger"
                    >
                      <option value="">Aucun</option>
                      {domaines.map((d) => {
                        const pris = d.modele && d.modele.id !== modele.id ? d.modele : null;
                        return (
                          <option key={d.id} value={d.id} disabled={!!pris}>
                            {d.nom}
                            {pris ? ` — déjà pris par « ${pris.nom} »` : ""}
                          </option>
                        );
                      })}
                    </select>
                    <span className="mt-1 block font-normal leading-relaxed">
                      {erreurs.domaineId ? (
                        <span className="font-medium text-danger">{erreurs.domaineId}</span>
                      ) : (
                        "Appliqué aux parcours de ce domaine qui n'ont pas choisi de modèle."
                      )}
                    </span>
                  </label>

                  <div className="border-t border-border pt-3">
                    {parDefaut ? (
                      <Pastille ton="or">
                        <Star className="h-3 w-3" aria-hidden /> Modèle par défaut
                      </Pastille>
                    ) : (
                      <Bouton
                        variante="contour"
                        taille="sm"
                        className="w-full"
                        disabled={!peutEcrire}
                        onClick={async () => {
                          const fd = new FormData();
                          fd.set("id", modele.id);
                          const r = await lancerAction(() => definirModeleParDefaut(fd));
                          if (r.ok) setParDefaut(true);
                        }}
                      >
                        <Star className="h-4 w-4" aria-hidden /> Définir comme modèle par défaut
                      </Bouton>
                    )}
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      Le modèle par défaut sert quand ni le parcours ni son domaine n&apos;en désignent un.
                    </p>
                  </div>

                  {avertissements.length ? (
                    <ul className="space-y-1.5">
                      {avertissements.map((a) => (
                        <li key={a} className="flex gap-2 rounded-xl bg-warning-soft px-3 py-2 text-[11px] font-medium leading-relaxed">
                          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warning" aria-hidden /> {a}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">Cliquez un bloc de la page pour le régler.</p>
                </div>
              </Panneau>
            )}

            <Panneau titre={`Calques (${canevas.blocs.length})`}>
              <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
                {[...parPlan(canevas.blocs)].reverse().map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) =>
                      setSelection((courant) =>
                        e.shiftKey ? (courant.includes(b.id) ? courant.filter((id) => id !== b.id) : [...courant, b.id]) : [b.id]
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                      selection.includes(b.id) ? "bg-primary-soft font-semibold text-primary" : "hover:bg-muted",
                      b.masque ? "opacity-50" : ""
                    )}
                  >
                    <IconeType type={b.type} />
                    <span className="truncate">{nomDuBloc(b)}</span>
                  </button>
                ))}
                <p className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>Cadre de la plateforme — imposé, toujours dessous</span>
                </p>
              </div>
            </Panneau>
          </aside>
        </div>
      </div>
    </>
  );
}

function OutilAjout({
  libelle,
  titre,
  children,
  onClick,
  disabled,
}: {
  libelle: string;
  titre?: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titre ?? `Ajouter : ${libelle.toLowerCase()}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
      {libelle}
    </button>
  );
}

function IconeType({ type }: { type: Bloc["type"] }) {
  const classe = "h-3.5 w-3.5 shrink-0 text-muted-foreground";
  switch (type) {
    case "TEXTE":
      return <Type className={classe} aria-hidden />;
    case "IMAGE":
      return <IconeImage className={classe} aria-hidden />;
    case "LIGNE":
      return <Minus className={classe} aria-hidden />;
    case "QRCODE":
      return <QrCode className={classe} aria-hidden />;
    default:
      return <Square className={classe} aria-hidden />;
  }
}
