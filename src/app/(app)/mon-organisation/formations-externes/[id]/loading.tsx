import { Squelette } from "@/components/ui/squelette";

export default function ChargementFormationExterne() {
  return (
    <div aria-busy="true" aria-label="Chargement de la formation externe">
      <Squelette className="mb-3 h-4 w-40" />
      <Squelette className="mb-3 h-9 w-96 max-w-full" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Squelette key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6">
        <Squelette className="h-64 rounded-2xl" />
        <Squelette className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
