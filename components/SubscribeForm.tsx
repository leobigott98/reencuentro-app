"use client";

import { useActionState } from "react";
import {
  requestCaseSubscription,
  confirmCaseSubscription,
} from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type SubscribeState = {
  ok: boolean;
  message: string;
  personId?: string;
  email?: string;
};

const initial: SubscribeState = {
  ok: false,
  message: "",
  personId: undefined,
  email: undefined,
};

type ConfirmSubscriptionState = {
  ok: boolean;
  message: string;
};

const confirmInitial: ConfirmSubscriptionState = {
  ok: false,
  message: "",
};

function ConfirmSubscription({
  personId,
  email,
}: {
  personId: string;
  email: string;
}) {
  const [state, action] = useActionState<ConfirmSubscriptionState, FormData>(
    confirmCaseSubscription,
    confirmInitial,
  );
  return (
    <form
      action={action}
      className="mt-4 space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="email" value={email} />
      <h2 className="text-lg font-black">Confirma tu suscripción</h2>
      <p className="text-sm text-slate-600">
        Enviamos un código a <b>{email}</b>. Al confirmarlo recibirás correos
        cuando haya actualizaciones verificadas.
      </p>
      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-800" : "bg-red-50 text-red-700"}`}
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
          placeholder="123456"
          required
        />
      </div>
      <SubmitButton>Confirmar suscripción</SubmitButton>
    </form>
  );
}

export function SubscribeForm({ personId }: { personId: string }) {
  const [state, action] = useActionState<SubscribeState, FormData>(
    requestCaseSubscription,
    initial,
  );
  if (state.ok && state.personId && state.email)
    return (
      <ConfirmSubscription personId={state.personId} email={state.email} />
    );
  return (
    <form
      action={action}
      className="mt-4 space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <input type="hidden" name="person_id" value={personId} />
      <h2 className="text-lg font-black">Suscribirme a este caso</h2>
      <p className="text-sm text-slate-600">
        Si estás pendiente de esta persona, deja tu correo. Te avisaremos cuando
        haya un cambio de estado o información verificada.
      </p>
      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-800" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
      <div>
        <label>Tu nombre</label>
        <input name="subscriber_name" placeholder="Opcional" />
      </div>
      <div>
        <label>Tu email *</label>
        <input name="email" type="email" required />
      </div>
      <SubmitButton>Enviar código</SubmitButton>
    </form>
  );
}
