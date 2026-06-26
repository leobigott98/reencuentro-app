"use client";
import { useActionState } from "react";
import { ownerUpdateCaseStatus } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { statusLabels } from "@/lib/types";

const initial = { ok: false, message: "" };

export function OwnerStatusForm({ personId }: { personId: string }) {
  const [state, action] = useActionState(ownerUpdateCaseStatus, initial);

  return (
    <form action={action} className="mt-4 space-y-3 rounded-3xl bg-cerca-50 p-4 ring-1 ring-cerca-100">
      <input type="hidden" name="person_id" value={personId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div>
        <h3 className="font-black text-cerca-900">Actualizar estado como reportante</h3>
        <p className="mt-1 text-sm text-cerca-900/80">
          Usa esto si ya sabes que la persona fue localizada, está a salvo, hospitalizada o reunificada. La actualización quedará registrada y se notificará por correo.
        </p>
      </div>
      {state.message ? <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-white text-cerca-900" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
      <div>
        <label>Nuevo estado *</label>
        <select name="status" required defaultValue="located">
          <option value="located">{statusLabels.located}</option>
          <option value="safe">{statusLabels.safe}</option>
          <option value="hospitalized">{statusLabels.hospitalized}</option>
          <option value="found_alive">{statusLabels.found_alive}</option>
          <option value="reunified">{statusLabels.reunified}</option>
        </select>
      </div>
      <div>
        <label>Ubicación actual o lugar de referencia *</label>
        <input name="location" required placeholder="Ej. Hospital X, refugio Y, casa de familiar..." />
      </div>
      <div>
        <label>Nota de actualización</label>
        <textarea name="notes" rows={3} placeholder="Ej. Hablé con él/ella, fue trasladado/a, está con un familiar..." />
      </div>
      <div>
        <label>Foto/evidencia privada opcional</label>
        <input name="evidence_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" />
        <p className="mt-1 text-xs text-cerca-900/70">La evidencia será privada: visible para ti y moderadores, no para el público.</p>
      </div>
      <SubmitButton>Publicar actualización</SubmitButton>
    </form>
  );
}
