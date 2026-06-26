import { ConfirmReportOtpForm } from "@/components/ConfirmReportOtpForm";

type ConfirmarReporteSearchParams = Promise<{
  draft?: string;
  email?: string;
}>;

export default async function ConfirmarReportePage({
  searchParams,
}: {
  searchParams: ConfirmarReporteSearchParams;
}) {
  const params = await searchParams;

  const draftId = params.draft || "";
  const email = params.email || "";

  if (!draftId || !email) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-3xl font-black">Confirmar reporte</h1>
        <p className="mt-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Falta información para confirmar el reporte. Vuelve a llenar el formulario.
        </p>
        <a
          href="/reportar"
          className="mt-4 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-bold text-white"
        >
          Volver a reportar
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-3xl font-black">Confirma tu correo</h1>
      <p className="mt-2 text-slate-600">
        Te enviamos un código de 6 dígitos. Escríbelo para publicar el reporte.
      </p>

      <div className="mt-5">
        <ConfirmReportOtpForm draftId={draftId} email={email} />
      </div>
    </main>
  );
}