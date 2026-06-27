import Link from "next/link";
import { ConfirmVolunteerOtpForm } from "@/components/ConfirmVolunteerOtpForm";

type ConfirmVolunteerSearchParams = Promise<{ email?: string }>;

export default async function ConfirmVolunteerPage({
  searchParams,
}: {
  searchParams: ConfirmVolunteerSearchParams;
}) {
  const params = await searchParams;
  const email = params.email || "";

  if (!email) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-3xl font-black">Confirmar voluntario</h1>
        <p className="mt-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Falta el correo para confirmar el registro. Vuelve a llenar el
          formulario.
        </p>
        <Link
          href="/voluntarios/registro"
          className="mt-4 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-bold text-white"
        >
          Volver al registro
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-3xl font-black">Confirma tu registro</h1>
      <p className="mt-2 text-slate-600">
        Escribe el código que enviamos a tu correo para activar tu perfil de
        voluntario/a.
      </p>
      <div className="mt-5">
        <ConfirmVolunteerOtpForm email={email} />
      </div>
    </main>
  );
}