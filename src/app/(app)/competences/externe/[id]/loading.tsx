import { Squelette } from "@/components/ui/squelette";

export default function ChargementFormationExterne() {
  return (
    <div aria-busy="true" aria-label="Chargement de la formation">
      <Squelette className="mb-3 h-9 w-72 max-w-full" />
      <Squelette className="mb-8 h-4 w-[26rem] max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Squelette className="h-64 rounded-2xl" />
        <div className="space-y-6">
          <Squelette className="h-56 rounded-2xl" />
          <Squelette className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
