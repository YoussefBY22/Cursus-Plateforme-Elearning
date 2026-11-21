import { Squelette } from "@/components/ui/squelette";

export default function ChargementSuivi() {
  return (
    <div aria-busy="true" aria-label="Chargement du suivi des organisations">
      <Squelette className="mb-3 h-9 w-72" />
      <Squelette className="mb-8 h-4 w-[38rem] max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Squelette key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Squelette className="mt-6 h-96 rounded-2xl" />
    </div>
  );
}
