import { Squelette } from "@/components/ui/squelette";

export default function ChargementLecture() {
  return (
    <div className="mx-auto max-w-5xl" aria-busy="true" aria-label="Chargement du lecteur">
      <Squelette className="mb-3 h-4 w-40" />
      <Squelette className="mb-3 h-9 w-[26rem] max-w-full" />
      <Squelette className="mb-5 h-4 w-[32rem] max-w-full" />
      <Squelette className="mb-5 aspect-video w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Squelette key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
