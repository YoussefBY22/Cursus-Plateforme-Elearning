import { Squelette } from "@/components/ui/squelette";

export default function ChargementFicheCompte() {
  return (
    <div aria-busy="true" aria-label="Chargement de la fiche">
      <Squelette className="mb-3 h-4 w-32" />
      <Squelette className="mb-3 h-9 w-72" />
      <Squelette className="mb-8 h-4 w-56" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Squelette className="h-96 rounded-2xl" />
        <Squelette className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
