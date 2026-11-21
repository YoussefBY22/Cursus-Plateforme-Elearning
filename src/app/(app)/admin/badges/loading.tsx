import { Squelette } from "@/components/ui/squelette";

export default function ChargementBadges() {
  return (
    <div aria-busy="true" aria-label="Chargement des badges">
      <Squelette className="mb-3 h-9 w-40" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="mb-5 flex gap-2">
        <Squelette className="h-10 flex-1 rounded-full" />
        <Squelette className="h-10 w-36 rounded-full" />
        <Squelette className="h-10 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Squelette key={i} className="h-60 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
