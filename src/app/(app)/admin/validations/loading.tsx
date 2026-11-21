import { Squelette } from "@/components/ui/squelette";

export default function ChargementValidations() {
  return (
    <div aria-busy="true" aria-label="Chargement des validations">
      <Squelette className="mb-3 h-9 w-48" />
      <Squelette className="mb-8 h-4 w-[34rem] max-w-full" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Squelette key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
