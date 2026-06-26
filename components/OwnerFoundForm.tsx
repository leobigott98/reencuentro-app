"use client";
import { useActionState } from "react";
import { requestOwnerFound } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };

export function OwnerFoundForm({ publicCode, token }: { publicCode: string; token: string }) {
  const [state, action] = useActionState(requestOwnerFound, initial);
  return (
    <form action={action} className="mt-5 space-y-3 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <input type="hidden" name="public_code" value={publicCode} />
      <input type="hidden" name="token" value={token} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <h2 className="text-lg font-black text-amber-950">Enlace privado del reportante</h2>
      <p className="text-sm text-amber-900">Puedes marcar este caso como encontrado desde tu enlace privado. La actualización quedará registrada, se notificará al reportante y también a quienes estén suscritos a este caso.</p>
      {state.message ? <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-white text-amber-950" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
      <div><label>Ubicación actual o lugar donde fue encontrado/a *</label><input name="location" required /></div>
      <div><label>Nota de confirmación</label><textarea name="notes" rows={3} placeholder="Ej. Hablé con él/ella, está en el refugio X, fue trasladado/a a..." /></div>
      <div><label>Foto/evidencia privada opcional</label><input name="evidence_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></div>
      <SubmitButton>Marcar como encontrado/a</SubmitButton>
    </form>
  );
}