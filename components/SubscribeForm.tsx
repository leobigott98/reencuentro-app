"use client";

import { useActionState } from "react";
import {
  confirmGenericSubscription,
  requestGenericSubscription,
  type GenericSubscriptionConfirmState,
  type GenericSubscriptionRequestState,
  type SubscriptionSubjectType,
} from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type SubscribeFormProps = {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  title?: string;
};

const requestInitial: GenericSubscriptionRequestState = {
  ok: false,
  message: "",
};

const confirmInitial: GenericSubscriptionConfirmState = {
  ok: false,
  message: "",
};

function ConfirmSubscription({
  subjectType,
  subjectId,
  email,
}: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  email: string;
}) {
  const [state, action] = useActionState<GenericSubscriptionConfirmState, FormData>(
    confirmGenericSubscription,
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
      <input type="hidden" name="subject_type" value={subjectType} />
      <input type="hidden" name="subject_id" value={subjectId} />
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

export function SubscribeForm({ subjectType, subjectId, title }: SubscribeFormProps) {
  const [state, action] = useActionState<GenericSubscriptionRequestState, FormData>(
    requestGenericSubscription,
    requestInitial,
  );

  if (state.ok && state.subjectType && state.subjectId && state.email) {
    return (
      <ConfirmSubscription
        subjectType={state.subjectType}
        subjectId={state.subjectId}
        email={state.email}
      />
    );
  }

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
      <input type="hidden" name="subject_type" value={subjectType} />
      <input type="hidden" name="subject_id" value={subjectId} />
      <h2 className="text-lg font-black">{title || "Suscribirme a actualizaciones"}</h2>
      <p className="text-sm text-slate-600">
        Deja tu correo para recibir avisos sobre cambios relevantes, posibles
        coincidencias o confirmaciones verificadas. No se publicará tu email.
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
