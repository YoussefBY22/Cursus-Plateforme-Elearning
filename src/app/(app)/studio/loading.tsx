import { Squelette } from "@/components/ui/squelette";

export default function ChargementStudio() {
  return (
    <div aria-busy="true" aria-label="Chargement de l'espace formateur">
      <Squelette className="mb-3 h-9 w-52" />
      <Squelette className="mb-8 h-4 w-[28rem] max-w-full" />
      <div className="space-y-4">
        <Squelette className="h-64 rounded-2xl" />
        <Squelette className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}
