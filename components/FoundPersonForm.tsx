"use client";
import { useActionState } from "react";
import { createFoundPersonReport } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };

export function FoundPersonForm() {
  const [state, action] = useActionState(createFoundPersonReport, initial);
  return (
    <form action={action} className="space-y-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.message ? <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
      <section className="space-y-3">
        <h2 className="text-xl font-black">Persona encontrada</h2>
        <p className="text-sm text-slate-600">Se publicará como “posiblemente localizada” hasta verificación. Evita publicar datos médicos sensibles.</p>
        <div><label>Nombre y apellido *</label><input name="full_name" required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label>Edad aproximada</label><input name="approximate_age" type="number" min="0" max="120" /></div>
          <div><label>Cédula de identidad</label><input name="document_id" placeholder="Opcional, ayuda a evitar duplicados" /></div>
        </div>
        <div><label>Foto pública de la persona</label><input name="photo_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></div>
        <div><label>Ubicación actual o lugar donde fue encontrada *</label><input name="current_location" required placeholder="Refugio, hospital, sector" /></div>
        <div><label>Notas públicas breves</label><textarea name="notes" rows={4} placeholder="Información útil no sensible" /></div>
        <div><label>Foto/evidencia privada adicional</label><input name="evidence_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></div>
      </section>
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="text-xl font-black">Contacto privado del reportante</h2>
        <div><label>Tu nombre *</label><input name="reporter_name" required /></div>
        <div><label>Tu teléfono/WhatsApp *</label><input name="reporter_phone" required /></div>
        <div><label>Email</label><input name="reporter_email" type="email" /></div>
        <div><label>Fuente / institución / relación *</label><input name="source_name" required placeholder="Ej. Refugio X, Hospital Y, vecino" /></div>
      </section>
      <SubmitButton>Reportar persona encontrada</SubmitButton>
    </form>
  );
}
