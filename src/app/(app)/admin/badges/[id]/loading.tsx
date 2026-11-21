import { Squelette } from "@/components/ui/squelette";

export default function ChargementEditeurBadge() {
  return (
    <div aria-busy="true" aria-label="Chargement de l'éditeur">
      <Squelette className="mb-3 h-4 w-24" />
      <Squelette className="mb-3 h-9 w-64" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="grid gap-6 lg:order-1">
          <Squelette className="h-48 rounded-2xl" />
          <Squelette className="h-96 rounded-2xl" />
        </div>
        <Squelette className="h-[30rem] rounded-2xl lg:order-2" />
      </div>
    </div>
  );
}
