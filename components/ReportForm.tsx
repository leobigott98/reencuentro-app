"use client";
import { useActionState } from "react";
import { createMissingReport } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" } as { ok: boolean; message: string };

export function ReportForm() {
  const [state, action] = useActionState(createMissingReport, initial);
  return (
    <form action={action} className="space-y-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {!state.ok && state.message ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
      <section className="space-y-3">
        <h2 className="text-lg font-black">Persona buscada</h2>
        <div><label>Nombre y apellido *</label><input name="full_name" required placeholder="Ej. María Pérez" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label>Edad aproximada</label><input name="approximate_age" type="number" min="0" max="120" placeholder="Ej. 34" /></div>
          <div><label>Foto principal</label><input name="photo_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></div>
        </div>
        <div><label>Foto URL opcional</label><input name="photo_url" type="url" placeholder="https://... si ya tienes una imagen publicada" /></div>
        <div><label>Última ubicación conocida *</label><input name="last_seen_location" required placeholder="Sector, parroquia, municipio" /></div>
        <div><label>Fecha/hora del último contacto</label><input name="last_seen_at" type="datetime-local" /></div>
        <div><label>Descripción breve</label><textarea name="description" rows={4} placeholder="Ropa, contexto, necesidades médicas, etc." /></div>
      </section>
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="text-lg font-black">Contacto privado del reportante</h2>
        <p className="text-sm text-slate-600">Estos datos no se muestran públicamente. Solo sirven para verificación. Recibirás enlaces y podrás entrar con un código OTP para ver el estado, vistas, compartidos y evidencias recibidas.</p>
        <div><label>Tu nombre *</label><input name="reporter_name" required /></div>
        <div><label>Tu teléfono/WhatsApp *</label><input name="reporter_phone" required /></div>
        <div><label>Tu email *</label><input name="reporter_email" type="email" required /></div>
        <div><label>Relación con la persona *</label><input name="reporter_relationship" required placeholder="Familiar, amigo, vecino..." /></div>
      </section>
      <SubmitButton>Crear ficha pública segura</SubmitButton>
    </form>
  );
}
