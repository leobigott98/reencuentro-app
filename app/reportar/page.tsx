import { ReportForm } from "@/components/ReportForm";

export default function ReportarPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-3xl font-black">Reportar persona desaparecida</h1>
      <p className="mt-2 text-slate-600">El teléfono y email del reportante quedan privados. La ficha pública solo muestra información necesaria para ayudar a encontrar a la persona.</p>
      <div className="mt-5"><ReportForm /></div>
    </main>
  );
}
