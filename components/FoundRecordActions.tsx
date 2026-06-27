"use client";

import { useActionState } from "react";
import {
  confirmFoundRecordSubscription,
  requestFoundRecordSubscription,
  submitFoundRecordReport,
} from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type BasicActionState = { ok: boolean; message: string };

type FoundSubscriptionState = BasicActionState & {
  foundRecordId?: string;
  email?: string;
};

const reportInitial: BasicActionState = { ok: false, message: "" };
const subscriptionInitial: FoundSubscriptionState = { ok: false, message: "" };
const confirmInitial: BasicActionState = { ok: false, message: "" };

type FoundRecordActionsProps = {
  foundRecordId: string;
};

function FoundReportForm({
  foundRecordId,
  reportType,
  title,
  description,
  submitLabel,
}: FoundRecordActionsProps & {
  reportType: "identity_tip" | "correction";
  title: string;
  description: string;
  submitLabel: string;
}) {
  const [state, action] = useActionState<BasicActionState, FormData>(
    submitFoundRecordReport,
    reportInitial,
  );
  return (
    <form
      action={action}
      className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <input type="hidden" name="found_record_id" value={foundRecordId} />
      <input type="hidden" name="report_type" value={reportType} />
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
      <div>
        <label>Tu nombre *</label>
        <input name="reporter_name" required />
      </div>
      <div>
        <label>Tu teléfono/WhatsApp *</label>
        <input name="reporter_phone" required />
      </div>
      <div>
        <label>Email</label>
        <input name="reporter_email" type="email" />
      </div>
      <div>
        <label>Información *</label>
        <textarea name="notes" rows={4} required />
      </div>
      <div>
        <label>Evidencia privada</label>
        <input
          name="evidence_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        />
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

function ConfirmFoundSubscription({
  foundRecordId,
  email,
}: {
  foundRecordId: string;
  email: string;
}) {
  const [state, action] = useActionState<BasicActionState, FormData>(
    confirmFoundRecordSubscription,
    confirmInitial,
  );
  return (
    <form
      action={action}
      className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <input type="hidden" name="found_record_id" value={foundRecordId} />
      <input type="hidden" name="email" value={email} />
      <h2 className="text-lg font-black">Confirmar suscripción</h2>
      <p className="text-sm text-slate-600">
        Enviamos un código a <b>{email}</b>.
      </p>
      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
      <div>
        <label>Código OTP *</label>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" required />
      </div>
      <SubmitButton>Confirmar</SubmitButton>
    </form>
  );
}

function FoundSubscriptionForm({ foundRecordId }: FoundRecordActionsProps) {
  const [state, action] = useActionState<FoundSubscriptionState, FormData>(
    requestFoundRecordSubscription,
    subscriptionInitial,
  );
  if (state.ok && state.foundRecordId && state.email) {
    return (
      <ConfirmFoundSubscription
        foundRecordId={state.foundRecordId}
        email={state.email}
      />
    );
  }
  return (
    <form
      action={action}
      className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <input type="hidden" name="found_record_id" value={foundRecordId} />
      <h2 className="text-lg font-black">Suscribirme a actualizaciones</h2>
      <p className="text-sm text-slate-600">
        Recibe correo cuando haya novedades verificadas sobre esta ficha.
      </p>
      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}
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

export function FoundRecordActions({ foundRecordId }: FoundRecordActionsProps) {
  return (
    <div className="grid gap-4">
      <FoundReportForm
        foundRecordId={foundRecordId}
        reportType="identity_tip"
        title="Creo conocer a esta persona"
        description="Envía datos de contacto e información concreta. El aviso queda privado y pendiente de revisión."
        submitLabel="Enviar información"
      />
      <FoundSubscriptionForm foundRecordId={foundRecordId} />
      <FoundReportForm
        foundRecordId={foundRecordId}
        reportType="correction"
        title="Reportar corrección"
        description="Avísanos si hay un dato público incorrecto o sensible que debe revisarse."
        submitLabel="Enviar corrección"
      />
    </div>
  );
}