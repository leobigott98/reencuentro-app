import { LoginOtpForm } from "@/components/LoginOtpForm";

export default function EntrarPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-3xl font-black">Acceso seguro</h1>
      <p className="mt-2 text-slate-600">Sin contraseñas. Solo correo y código de un solo uso.</p>
      <div className="mt-5"><LoginOtpForm /></div>
    </main>
  );
}
