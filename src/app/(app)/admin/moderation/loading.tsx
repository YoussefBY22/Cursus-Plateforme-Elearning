import { Squelette } from "@/components/ui/squelette";

export default function ChargementModeration() {
  return (
    <div aria-busy="true" aria-label="Chargement des signalements">
      <Squelette className="mb-3 h-9 w-56" />
      <Squelette className="mb-8 h-4 w-[34rem] max-w-full" />
      <div className="mb-6 flex gap-2">
        <Squelette className="h-9 w-32 rounded-full" />
        <Squelette className="h-9 w-32 rounded-full" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Squelette key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
