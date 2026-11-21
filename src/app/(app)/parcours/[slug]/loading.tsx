import { Squelette } from "@/components/ui/squelette";

export default function ChargementParcoursDetail() {
  return (
    <div aria-busy="true" aria-label="Chargement du parcours">
      <Squelette className="mb-3 h-4 w-40" />
      <Squelette className="mb-3 h-9 w-[24rem] max-w-full" />
      <Squelette className="mb-7 h-4 w-[30rem] max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-6">
          <Squelette className="h-20 rounded-2xl" />
          <Squelette className="h-96 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Squelette className="h-32 rounded-2xl" />
          <Squelette className="h-28 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
