import { Squelette } from "@/components/ui/squelette";

export default function ChargementVerification() {
  return (
    <div aria-busy="true" aria-label="Vérification du certificat" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Squelette className="mb-10 h-8 w-40" />
      <Squelette className="h-32 rounded-3xl" />
      <Squelette className="mt-8 aspect-[297/210] w-full rounded-[28px]" />
    </div>
  );
}
