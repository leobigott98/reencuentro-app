"use client";

import { useActionState } from "react";
import { submitContentFlag } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type FlagState = { ok: boolean; message: string };

const initialState: FlagState = { ok: false, message: "" };

export function ReportProblemForm({
  subjectType,
  subjectId,
}: {
  subjectType: "missing_case" | "found_record";
  subjectId: string;
}) {
  const [state, action] = useActionState<FlagState, FormData>(submitContentFlag, initialState);

  return (
    <form action={action} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input type="hidden" name="subject_type" value={subjectType} />
      <input type="hidden" name="subject_id" value={subjectId} />
      <div>
        <h2 className="text-lg font-black">Reportar problema</h2>
        <p className="text-sm text-slate-600">Ayuda a revisar información falsa, sensible o duplicada. No cambia la ficha de inmediato.</p>
      </div>
      {state.message ? (
        <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
      <div>
        <label>Motivo *</label>
        <select name="reason" required defaultValue="">
          <option value="" disabled>Selecciona un motivo</option>
          <option value="informacion_falsa">Información falsa</option>
          <option value="datos_sensibles">Datos sensibles expuestos</option>
          <option value="foto_inapropiada">Foto inapropiada</option>
          <option value="duplicado">Duplicado</option>
          <option value="caso_de_menor">Caso de menor</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div>
        <label>Email</label>
        <input name="reporter_email" type="email" placeholder="Opcional" />
      </div>
      <div>
        <label>Notas</label>
        <textarea name="notes" rows={3} placeholder="Explica brevemente el problema" />
      </div>
      <SubmitButton>Reportar problema</SubmitButton>
    </form>
  );
}