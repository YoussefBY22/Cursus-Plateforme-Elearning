import { Squelette } from "@/components/ui/squelette";

export default function ChargementModeleCertificat() {
  return (
    <div aria-busy="true" aria-label="Chargement de l'éditeur de modèle">
      <Squelette className="mb-3 h-4 w-28" />
      <Squelette className="mb-6 h-9 w-80 max-w-full" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <Squelette className="hidden h-12 rounded-2xl lg:block" />
          <Squelette className="aspect-[297/210] w-full rounded-3xl" />
        </div>
        <div className="hidden space-y-4 lg:block">
          <Squelette className="h-96 rounded-2xl" />
          <Squelette className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
