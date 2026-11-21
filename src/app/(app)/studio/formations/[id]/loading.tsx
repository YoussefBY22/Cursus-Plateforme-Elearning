import { Squelette } from "@/components/ui/squelette";

export default function ChargementEditionFormation() {
  return (
    <div aria-busy="true" aria-label="Chargement de la formation">
      <Squelette className="mb-3 h-9 w-80 max-w-full" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-5">
          <Squelette className="h-11 rounded-full" />
          <Squelette className="h-96 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Squelette className="h-40 rounded-2xl" />
          <Squelette className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
