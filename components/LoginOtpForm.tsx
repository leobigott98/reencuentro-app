"use client";
import { useActionState } from "react";
import { requestLoginOtp, verifyLoginOtp } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };

export function LoginOtpForm() {
  const [requestState, requestAction] = useActionState(
    requestLoginOtp,
    initial,
  );
  const [verifyState, verifyAction] = useActionState(verifyLoginOtp, initial);
  return (
    <div className="space-y-4">
      <form
        action={requestAction}
        className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <h2 className="text-xl font-black">Recibir código</h2>
        <p className="text-sm text-slate-600">
          Esta pantalla es solo para entrar a tu panel después de haber
          confirmado un reporte. Si acabas de reportar una persona, usa el
          código en la pantalla de confirmación del reporte, no aquí.
        </p>
        {requestState.message ? (
          <p
            className={`rounded-2xl p-3 text-sm ${requestState.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}
          >
            {requestState.message}
          </p>
        ) : null}
        <div>
          <label>Correo</label>
          <input
            name="email"
            type="email"
            required
            placeholder="tu@correo.com"
          />
        </div>
        <SubmitButton>Enviar código</SubmitButton>
      </form>
      <p className="text-xs text-slate-500">
        El código de confirmación de un reporte no funciona como código de
        acceso. Primero debes confirmar el reporte; luego podrás entrar
        normalmente a tu panel.
      </p>
      <form
        action={verifyAction}
        className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <h2 className="text-xl font-black">Entrar</h2>
        {verifyState.message ? (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {verifyState.message}
          </p>
        ) : null}
        <div>
          <label>Correo</label>
          <input name="email" type="email" required />
        </div>
        <div>
          <label>Código de 6 dígitos</label>
          <input name="code" inputMode="numeric" pattern="[0-9]*" required />
        </div>
        <SubmitButton>Entrar</SubmitButton>
      </form>
    </div>
  );
}
