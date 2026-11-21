"use client";

import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  Eye,
  EyeOff,
  Italic,
  Trash2,
  Type,
} from "lucide-react";
import { nomDuBloc, type Bloc, type BlocImage, type BlocLigne, type BlocQr, type BlocTexte } from "@/services/canevas/canevas";
import { NUIT } from "@/services/certificats/cadre";
import { Bascule, BoutonIcone, ChampCouleur, ChampNombre, ChampTexte, Panneau, Segments } from "./controles";

/**
 * Réglages du bloc sélectionné — texte, image, trait, cadre, plus le
 * bloc QR code (toujours carré) et des teintes suggérées tirées du thème.
 */

type Maj = (ajouts: Partial<Bloc>) => void;

export function PanneauProprietes({
  bloc,
  couleurTheme,
  peutEcrire,
  onChange,
  onPile,
  onCentrer,
  onDupliquer,
  onSupprimer,
}: {
  bloc: Bloc;
  couleurTheme: string;
  peutEcrire: boolean;
  onChange: Maj;
  onPile: (sens: "avancer" | "reculer") => void;
  onCentrer: () => void;
  onDupliquer: () => void;
  onSupprimer: () => void;
}) {
  const suggestions = [couleurTheme, NUIT, "#5a5f80", "#262626", "#FFFFFF"];
  const qr = bloc.type === "QRCODE";

  return (
    <Panneau
      titre={nomDuBloc(bloc)}
      action={
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {LIBELLES_TYPE[bloc.type]}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <ChampNombre id="prop-x" libelle="X" suffixe="mm" valeur={bloc.x} disabled={!peutEcrire} onChange={(x) => onChange({ x })} />
          <ChampNombre id="prop-y" libelle="Y" suffixe="mm" valeur={bloc.y} disabled={!peutEcrire} onChange={(y) => onChange({ y })} />
          {qr ? (
            <ChampNombre
              id="prop-cote"
              libelle="Côté (toujours carré)"
              suffixe="mm"
              min={10}
              max={120}
              valeur={bloc.largeur}
              disabled={!peutEcrire}
              onChange={(cote) => onChange({ largeur: cote, hauteur: cote })}
            />
          ) : (
            <>
              <ChampNombre
                id="prop-largeur"
                libelle="Largeur"
                suffixe="mm"
                min={2}
                valeur={bloc.largeur}
                disabled={!peutEcrire}
                onChange={(largeur) => onChange({ largeur })}
              />
              <ChampNombre
                id="prop-hauteur"
                libelle="Hauteur"
                suffixe="mm"
                min={2}
                valeur={bloc.hauteur}
                disabled={!peutEcrire}
                onChange={(hauteur) => onChange({ hauteur })}
              />
            </>
          )}
        </div>

        {bloc.type === "TEXTE" ? <ReglagesTexte bloc={bloc} suggestions={suggestions} peutEcrire={peutEcrire} onChange={onChange} /> : null}
        {bloc.type === "LIGNE" ? <ReglagesLigne bloc={bloc} suggestions={suggestions} peutEcrire={peutEcrire} onChange={onChange} /> : null}
        {bloc.type === "IMAGE" ? <ReglagesImage bloc={bloc} peutEcrire={peutEcrire} onChange={onChange} /> : null}
        {bloc.type === "QRCODE" ? <ReglagesQr bloc={bloc} suggestions={suggestions} peutEcrire={peutEcrire} onChange={onChange} /> : null}
        {bloc.type === "TEXTE" || bloc.type === "RECTANGLE" ? (
          <ReglagesEncadrement bloc={bloc} suggestions={suggestions} peutEcrire={peutEcrire} onChange={onChange} />
        ) : null}

        <ChampTexte
          id="prop-nom"
          libelle="Nom du calque"
          value={bloc.nom ?? ""}
          placeholder={nomDuBloc({ ...bloc, nom: undefined })}
          disabled={!peutEcrire}
          maxLength={80}
          onChange={(e) => onChange({ nom: e.target.value })}
        />

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <BoutonIcone libelle="Centrer sur la page" disabled={!peutEcrire} onClick={onCentrer}>
            <AlignHorizontalJustifyCenter className="h-4 w-4" />
          </BoutonIcone>
          <BoutonIcone libelle="Avancer d'un plan" disabled={!peutEcrire} onClick={() => onPile("avancer")}>
            <ChevronUp className="h-4 w-4" />
          </BoutonIcone>
          <BoutonIcone libelle="Reculer d'un plan" disabled={!peutEcrire} onClick={() => onPile("reculer")}>
            <ChevronDown className="h-4 w-4" />
          </BoutonIcone>
          <BoutonIcone libelle={bloc.masque ? "Afficher le bloc" : "Masquer le bloc"} disabled={!peutEcrire} onClick={() => onChange({ masque: !bloc.masque })}>
            {bloc.masque ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </BoutonIcone>
          <BoutonIcone libelle="Dupliquer le bloc (Ctrl+D)" disabled={!peutEcrire || qr} onClick={onDupliquer}>
            <CopyPlus className="h-4 w-4" />
          </BoutonIcone>
          <BoutonIcone libelle="Supprimer le bloc (Suppr)" danger disabled={!peutEcrire} onClick={onSupprimer} className="ml-auto">
            <Trash2 className="h-4 w-4" />
          </BoutonIcone>
        </div>
      </div>
    </Panneau>
  );
}

const LIBELLES_TYPE: Record<Bloc["type"], string> = {
  TEXTE: "Texte",
  RECTANGLE: "Aplat",
  IMAGE: "Image",
  LIGNE: "Trait",
  QRCODE: "QR code",
  TABLEAU: "Tableau",
};

function ReglagesTexte({
  bloc,
  suggestions,
  peutEcrire,
  onChange,
}: {
  bloc: BlocTexte;
  suggestions: string[];
  peutEcrire: boolean;
  onChange: Maj;
}) {
  const majStyle = (ajouts: Partial<BlocTexte["style"]>) => onChange({ style: { ...bloc.style, ...ajouts } } as Partial<Bloc>);
  return (
    <div className="space-y-3">
      <label htmlFor="prop-contenu" className="block text-[11px] font-semibold text-muted-foreground">
        Contenu
        <textarea
          id="prop-contenu"
          value={bloc.contenu}
          disabled={!peutEcrire}
          onChange={(e) => onChange({ contenu: e.target.value } as Partial<Bloc>)}
          rows={3}
          maxLength={2000}
          className="mt-1 w-full resize-y rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        <span className="mt-0.5 block font-normal">Texte libre ou champs {"{{…}}"} remplis à l&apos;émission.</span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <ChampNombre
          id="prop-taille"
          libelle="Taille"
          suffixe="pt"
          pas={0.5}
          min={3}
          max={120}
          valeur={bloc.style.taille}
          disabled={!peutEcrire}
          onChange={(taille) => majStyle({ taille })}
        />
        <ChampNombre
          id="prop-interligne"
          libelle="Interligne"
          pas={0.05}
          min={0.6}
          max={4}
          valeur={bloc.style.interligne}
          disabled={!peutEcrire}
          onChange={(interligne) => majStyle({ interligne })}
        />
      </div>

      <div className="flex items-end gap-1.5">
        <Bascule libelle="Gras" actif={bloc.style.gras} disabled={!peutEcrire} onClick={() => majStyle({ gras: !bloc.style.gras })}>
          <Bold className="h-3.5 w-3.5" />
        </Bascule>
        <Bascule libelle="Italique" actif={bloc.style.italique} disabled={!peutEcrire} onClick={() => majStyle({ italique: !bloc.style.italique })}>
          <Italic className="h-3.5 w-3.5" />
        </Bascule>
        <Bascule
          libelle="Majuscules"
          actif={bloc.style.majuscules}
          disabled={!peutEcrire}
          onClick={() => majStyle({ majuscules: !bloc.style.majuscules })}
        >
          <Type className="h-3.5 w-3.5" />
        </Bascule>
        {bloc.style.gras && bloc.style.italique ? (
          <span className="pb-1 text-[10px] leading-tight text-muted-foreground">Gras et italique : le gras l&apos;emporte.</span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Segments
          libelle="Alignement"
          valeur={bloc.style.alignement}
          disabled={!peutEcrire}
          onChange={(alignement) => majStyle({ alignement })}
          options={[
            { valeur: "gauche", libelle: "À gauche", icone: <AlignLeft className="h-3.5 w-3.5" /> },
            { valeur: "centre", libelle: "Centré", icone: <AlignCenter className="h-3.5 w-3.5" /> },
            { valeur: "droite", libelle: "À droite", icone: <AlignRight className="h-3.5 w-3.5" /> },
          ]}
        />
        <Segments
          libelle="Vertical"
          valeur={bloc.style.alignementVertical}
          disabled={!peutEcrire}
          onChange={(alignementVertical) => majStyle({ alignementVertical })}
          options={[
            { valeur: "haut", libelle: "En haut", icone: <AlignVerticalJustifyStart className="h-3.5 w-3.5" /> },
            { valeur: "milieu", libelle: "Au milieu", icone: <AlignVerticalJustifyCenter className="h-3.5 w-3.5" /> },
            { valeur: "bas", libelle: "En bas", icone: <AlignVerticalJustifyEnd className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      <ChampCouleur
        id="prop-couleur-texte"
        libelle="Couleur du texte"
        valeur={bloc.style.couleur}
        suggestions={suggestions}
        disabled={!peutEcrire}
        onChange={(couleur) => couleur && majStyle({ couleur })}
      />

      <ChampNombre
        id="prop-marge"
        libelle="Marge intérieure"
        suffixe="mm"
        min={0}
        max={50}
        valeur={bloc.marge}
        disabled={!peutEcrire}
        onChange={(marge) => onChange({ marge } as Partial<Bloc>)}
      />
    </div>
  );
}

function ReglagesLigne({
  bloc,
  suggestions,
  peutEcrire,
  onChange,
}: {
  bloc: BlocLigne;
  suggestions: string[];
  peutEcrire: boolean;
  onChange: Maj;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Segments
          libelle="Orientation"
          valeur={bloc.orientation}
          disabled={!peutEcrire}
          onChange={(orientation) => onChange({ orientation } as Partial<Bloc>)}
          options={[
            { valeur: "horizontale", libelle: "Horizontal" },
            { valeur: "verticale", libelle: "Vertical" },
          ]}
        />
        <ChampNombre
          id="prop-epaisseur"
          libelle="Épaisseur"
          suffixe="mm"
          pas={0.1}
          min={0.05}
          max={20}
          valeur={bloc.epaisseur}
          disabled={!peutEcrire}
          onChange={(epaisseur) => onChange({ epaisseur } as Partial<Bloc>)}
        />
      </div>
      <ChampCouleur
        id="prop-couleur-trait"
        libelle="Couleur"
        valeur={bloc.couleur}
        suggestions={suggestions}
        disabled={!peutEcrire}
        onChange={(couleur) => couleur && onChange({ couleur } as Partial<Bloc>)}
      />
    </div>
  );
}

function ReglagesImage({ bloc, peutEcrire, onChange }: { bloc: BlocImage; peutEcrire: boolean; onChange: Maj }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Segments
        libelle="Ajustement"
        valeur={bloc.ajustement}
        disabled={!peutEcrire}
        onChange={(ajustement) => onChange({ ajustement } as Partial<Bloc>)}
        options={[
          { valeur: "contenir", libelle: "Contenir" },
          { valeur: "remplir", libelle: "Remplir" },
        ]}
      />
      <ChampNombre
        id="prop-opacite"
        libelle="Opacité"
        pas={0.05}
        min={0}
        max={1}
        valeur={bloc.opacite}
        disabled={!peutEcrire}
        onChange={(opacite) => onChange({ opacite } as Partial<Bloc>)}
      />
    </div>
  );
}

function ReglagesQr({
  bloc,
  suggestions,
  peutEcrire,
  onChange,
}: {
  bloc: BlocQr;
  suggestions: string[];
  peutEcrire: boolean;
  onChange: Maj;
}) {
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-muted/70 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Encode le lien de vérification propre à chaque certificat. Gardez une teinte foncée sur fond blanc et au moins 18 mm de
        côté pour un scan fiable.
      </p>
      <ChampCouleur
        id="prop-couleur-qr"
        libelle="Couleur des modules"
        valeur={bloc.couleur}
        suggestions={suggestions.filter((s) => s !== "#FFFFFF")}
        disabled={!peutEcrire}
        onChange={(couleur) => couleur && onChange({ couleur } as Partial<Bloc>)}
      />
    </div>
  );
}

function ReglagesEncadrement({
  bloc,
  suggestions,
  peutEcrire,
  onChange,
}: {
  bloc: Extract<Bloc, { type: "TEXTE" | "RECTANGLE" }>;
  suggestions: string[];
  peutEcrire: boolean;
  onChange: Maj;
}) {
  const maj = (ajouts: Partial<typeof bloc.encadrement>) => onChange({ encadrement: { ...bloc.encadrement, ...ajouts } } as Partial<Bloc>);
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <ChampCouleur
        id="prop-fond"
        libelle="Fond"
        valeur={bloc.encadrement.fond}
        suggestions={suggestions}
        aucune="Transparent"
        disabled={!peutEcrire}
        onChange={(fond) => maj({ fond })}
      />
      <div className="grid grid-cols-[1fr_88px] items-start gap-2">
        <ChampCouleur
          id="prop-bordure"
          libelle="Filet"
          valeur={bloc.encadrement.bordure}
          suggestions={suggestions.slice(0, 2)}
          aucune="Aucun"
          disabled={!peutEcrire}
          onChange={(bordure) => maj({ bordure })}
        />
        <ChampNombre
          id="prop-epaisseur-filet"
          libelle="Épaisseur"
          suffixe="mm"
          pas={0.05}
          min={0}
          max={20}
          valeur={bloc.encadrement.epaisseurBordure}
          disabled={!peutEcrire}
          onChange={(epaisseurBordure) => maj({ epaisseurBordure })}
        />
      </div>
    </div>
  );
}
