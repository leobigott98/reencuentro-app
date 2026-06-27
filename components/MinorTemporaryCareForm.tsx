"use client";

import { useActionState } from "react";
import { requestMinorTemporaryCareOtp } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type MinorCareState = { ok: boolean; message: string };

const initialState: MinorCareState = { ok: false, message: "" };

export function MinorTemporaryCareForm() {
  const [state, action] = useActionState<MinorCareState, FormData>(
    requestMinorTemporaryCareOtp,
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
        <div>
          <p className="text-xs font-black uppercase text-cerca-700">Registro restringido</p>
          <h2 className="text-xl font-black">Información del menor</h2>
          <p className="mt-1 text-sm text-slate-600">La foto y los datos exactos se guardan en privado. La vista pública no mostrará el rostro ni dirección exacta.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Estado *</label>
            <select name="status" defaultValue="minor_temporary_care" required>
              <option value="minor_temporary_care">Menor bajo cuidado temporal</option>
              <option value="minor_unaccompanied">Menor sin acompañante</option>
            </select>
          </div>
          <div>
            <label>Edad aproximada *</label>
            <input name="approximate_age" type="number" min="0" max="17" required />
          </div>
        </div>
        <div>
          <label>Nombre si se conoce</label>
          <input name="full_name" placeholder="Opcional" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Lugar donde fue encontrado/a *</label>
            <input name="found_location" required />
          </div>
          <div>
            <label>Ubicación actual resguardada *</label>
            <input name="current_location" required />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Fecha y hora del hallazgo</label>
            <input name="found_at" type="datetime-local" />
          </div>
          <div>
            <label>Foto privada del menor</label>
            <input name="photo_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" />
          </div>
        </div>
        <div>
          <label>Notas privadas</label>
          <textarea name="notes_private" rows={4} />
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-5">
        <div>
          <h2 className="text-xl font-black">Cuidador temporal</h2>
          <p className="mt-1 text-sm text-slate-600">Estos datos solo son visibles para administradores y quedan asociados al registro de auditoría.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label>Nombre completo *</label><input name="caregiver_full_name" required /></div>
          <div><label>Cédula / identificación *</label><input name="caregiver_ci_number" required /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label>Foto de cédula *</label><input name="ci_photo_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required /></div>
          <div><label>Foto del cuidador *</label><input name="caregiver_photo_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label>Teléfono *</label><input name="caregiver_phone" required /></div>
          <div><label>Email para OTP *</label><input name="caregiver_email" type="email" required /></div>
        </div>
        <div>
          <label>Relación declarada *</label>
          <input name="relationship_declared" required placeholder="Familiar, vecino, institución, brigadista..." />
        </div>
        <div>
          <label>Dirección o institución *</label>
          <input name="address_or_institution" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label>Testigo</label><input name="witness_name" /></div>
          <div><label>Teléfono del testigo</label><input name="witness_phone" /></div>
        </div>
        <div>
          <label>Notas de entrega / resguardo</label>
          <textarea name="handoff_notes" rows={4} />
        </div>
      </section>

      <SubmitButton>Enviar código de confirmación</SubmitButton>
    </form>
  );
}