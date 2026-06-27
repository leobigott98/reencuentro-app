import Link from "next/link";
import { VolunteerRegistrationForm } from "@/components/VolunteerRegistrationForm";

export default function VolunteerRegistrationPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/" className="text-sm font-bold text-cerca-700">
        ← Volver
      </Link>
      <h1 className="mt-4 text-3xl font-black">Registro de voluntarios</h1>
      <p className="mt-2 text-slate-600">
        Crea un perfil para ayudar a cargar listados, reportar información de
        centros y colaborar con datos útiles. Los perfiles auto-registrados no
        implican verificación institucional inmediata.
      </p>
      <div className="mt-5">
        <VolunteerRegistrationForm />
      </div>
    </main>
  );
}