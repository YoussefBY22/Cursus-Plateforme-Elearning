import { Squelette } from "@/components/ui/squelette";

export default function ChargementCompetences() {
  return (
    <div aria-busy="true" aria-label="Chargement de vos compétences">
      <Squelette className="mb-3 h-9 w-56" />
      <Squelette className="mb-8 h-4 w-[34rem] max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Squelette className="h-48 rounded-2xl" />
          <Squelette className="h-44 rounded-2xl" />
        </div>
        <Squelette className="h-[28rem] rounded-2xl" />
      </div>
    </div>
  );
}
