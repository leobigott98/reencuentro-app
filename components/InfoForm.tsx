"use client";
import { useActionState } from "react";
import { submitInfo } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };
export function InfoForm({ personId }: { personId: string }) {
  const [state, action] = useActionState(submitInfo, initial);
  return (
    <form action={action} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <input type="hidden" name="person_id" value={personId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <h2 className="text-lg font-black">Tengo información</h2>
      <p className="text-sm text-slate-600">Tu aviso queda privado y pendiente de revisión. No cambia el estado automáticamente.</p>
      {state.message ? <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
      <div><label>Tu nombre *</label><input name="info_name" required /></div>
      <div><label>Tu teléfono/WhatsApp *</label><input name="info_phone" required /></div>
      <div><label>Email</label><input name="info_email" type="email" /></div>
      <div><label>Dónde viste o supiste de esta persona *</label><input name="seen_location" required /></div>
      <div><label>Cuándo</label><input name="seen_at" type="datetime-local" /></div>
      <div><label>Información concreta *</label><textarea name="notes" rows={4} required /></div>
      <div><label>Foto/evidencia privada</label><input name="evidence_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></div>
      <div><label>Evidencia URL opcional</label><input name="evidence_url" type="url" /></div>
      <SubmitButton>Enviar información para revisión</SubmitButton>
    </form>
  );
}
