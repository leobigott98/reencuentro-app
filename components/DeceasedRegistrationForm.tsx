"use client";

import { useActionState } from "react";
import { createDeceasedRecordReport } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type DeceasedState = { ok: boolean; message: string };

const initialState: DeceasedState = { ok: false, message: "" };

export function DeceasedRegistrationForm() {
  const [state, action] = useActionState<DeceasedState, FormData>(
    createDeceasedRecordReport,
    initialState,
  );

  return (
    <form action={action} className="space-y-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {state.message ? (
        <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
          <p className="font-black">Registro de alto resguardo</p>
          <p className="mt-1">
            Las fotos y evidencias quedan privadas. La ficha pública no mostrará rostro, documento completo, contacto del reportante ni detalles gráficos.
          </p>
        </div>

        <h2 className="text-xl font-black">Información de la persona</h2>
        <div>
          <label>Estado *</label>
          <select name="status" defaultValue="deceased_unidentified" required>
            <option value="deceased_unidentified">Fallecida por identificar</option>
            <option value="deceased_identity_probable">Identidad probable, pendiente de confirmar</option>
          </select>
        </div>
        <div>
          <label>Nombre si se conoce</label>
          <input name="full_name" placeholder="Opcional" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Documento de identidad</label>
            <input name="document_id" placeholder="Opcional, no se mostrará públicamente" />
          </div>
          <div>
            <label>Edad aproximada</label>
            <input name="approximate_age" type="number" min="0" max="120" />
          </div>
        </div>
        <div>
          <label>Género aparente</label>
          <select name="apparent_gender" defaultValue="">
            <option value="">No indicado</option>
            <option value="female">Femenino</option>
            <option value="male">Masculino</option>
            <option value="unknown">No determinado</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Lugar de recuperación *</label>
            <input name="recovery_location" required placeholder="Zona general, sin detalles gráficos" />
          </div>
          <div>
            <label>Morgue, institución o resguardo actual *</label>
            <input name="current_location" required />
          </div>
        </div>
        <div>
          <label>Fecha y hora de recuperación</label>
          <input name="recovered_at" type="datetime-local" />
        </div>
        <div>
          <label>Notas públicas breves</label>
          <textarea name="notes_public" rows={3} maxLength={500} placeholder="Solo información no gráfica y útil para orientar una revisión" />
        </div>
        <div>
          <label>Notas privadas</label>
          <textarea name="notes_private" rows={4} placeholder="Detalles para revisión interna" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Foto privada</label>
            <input name="photo_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" />
          </div>
          <div>
            <label>Evidencia privada</label>
            <input name="evidence_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="text-xl font-black">Reportante / fuente</h2>
        <div>
          <label>Nombre *</label>
          <input name="reporter_name" required />
        </div>
        <div>
          <label>Teléfono privado *</label>
          <input name="reporter_phone" required />
        </div>
        <div>
          <label>Email</label>
          <input name="reporter_email" type="email" />
        </div>
        <div>
          <label>Fuente, hospital, institución o brigada *</label>
          <input name="source_name" required />
        </div>
      </section>

      <SubmitButton>Registrar con alto resguardo</SubmitButton>
    </form>
  );
}