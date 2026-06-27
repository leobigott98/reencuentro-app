"use client";

import { useActionState } from "react";
import { confirmVolunteerRegistrationOtp } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initialState = { ok: false, message: "" };

export function ConfirmVolunteerOtpForm({ email }: { email: string }) {
  const [state, action] = useActionState(
    confirmVolunteerRegistrationOtp,
    initialState,
  );

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
      <input type="hidden" name="email" value={email} />

      <div className="rounded-2xl bg-cerca-50 p-4 text-sm text-cerca-900">
        <p className="font-black">Confirma tu correo</p>
        <p className="mt-1">
          Enviamos un código a <b>{email}</b>. Al confirmarlo, crearemos tu
          perfil voluntario e iniciaremos sesión.
        </p>
      </div>

      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${
            state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <label>Código de 6 dígitos *</label>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          required
          placeholder="123456"
        />
      </div>

      <SubmitButton>Confirmar registro voluntario</SubmitButton>
    </form>
  );
}