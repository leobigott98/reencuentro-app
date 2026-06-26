"use client";

import { useActionState } from "react";
import { confirmMissingReportOtp } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type ConfirmState = {
  ok: boolean;
  message: string;
};

const initialState: ConfirmState = {
  ok: false,
  message: "",
};

export function ConfirmReportOtpForm({
  draftId,
  email,
}: {
  draftId: string;
  email: string;
}) {
  const [state, action] = useActionState(confirmMissingReportOtp, initialState);

  return (
    <form
      action={action}
      className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-cerca-100 sm:p-6"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <input type="hidden" name="draft_id" value={draftId} />
      <input type="hidden" name="email" value={email} />

      <div className="rounded-2xl bg-cerca-50 p-4 text-sm text-cerca-900">
        <p className="font-black">Último paso</p>
        <p className="mt-1">
          Código enviado a <b>{email}</b>. Al confirmarlo, publicaremos la ficha
          e iniciaremos sesión automáticamente.
        </p>
      </div>

      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${
            state.ok ? "bg-cerca-50 text-cerca-800" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <label>Código OTP *</label>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="123456"
        />
      </div>

      <SubmitButton>Confirmar y publicar reporte</SubmitButton>

      <p className="text-xs text-slate-500">
        Este código solo sirve para confirmar este reporte. No funciona en la
        pantalla normal de acceso.
      </p>
    </form>
  );
}