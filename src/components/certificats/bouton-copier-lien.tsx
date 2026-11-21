"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Bouton, type BoutonProps } from "@/components/ui/bouton";
import { toast } from "@/components/ui/toasts";

async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    // Contexte non sécurisé ou permission refusée : ancienne méthode.
    try {
      const zone = document.createElement("textarea");
      zone.value = texte;
      zone.setAttribute("readonly", "");
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      const ok = document.execCommand("copy");
      zone.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Copie le lien de vérification ; le bouton confirme lui-même (la page publique n'a pas de toasts). */
export function BoutonCopierLien({
  lien,
  libelle = "Copier le lien de vérification",
  ...props
}: Omit<BoutonProps, "onClick"> & { lien: string; libelle?: string }) {
  const [copie, setCopie] = useState(false);
  useEffect(() => {
    if (!copie) return;
    const t = setTimeout(() => setCopie(false), 2200);
    return () => clearTimeout(t);
  }, [copie]);

  return (
    <Bouton
      {...props}
      aria-live="polite"
      onClick={async () => {
        if (await copier(lien)) {
          setCopie(true);
          toast({ titre: "Lien copié", description: "Collez-le dans un CV, un e-mail ou un message.", ton: "succes" });
        } else {
          toast({ titre: "Copie impossible", description: lien, ton: "erreur", duree: 9000 });
        }
      }}
    >
      {copie ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      {copie ? "Lien copié" : libelle}
    </Bouton>
  );
}
