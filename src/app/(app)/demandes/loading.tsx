import { Squelette } from "@/components/ui/squelette";

export default function ChargementDemandes() {
  return (
    <div aria-busy="true" aria-label="Chargement des demandes de formation">
      <Squelette className="mb-3 h-9 w-80" />
      <Squelette className="mb-8 h-4 w-[40rem] max-w-full" />
      <div className="mb-6 flex justify-end">
        <Squelette className="h-10 w-56 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Squelette key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
