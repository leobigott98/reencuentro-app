"use client";

import { useActionState } from "react";
import { requestVolunteerRegistrationOtp } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initialState = { ok: false, message: "" };

export function VolunteerRegistrationForm() {
  const [state, action] = useActionState(
    requestVolunteerRegistrationOtp,
    initialState,
  );

  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {state.message ? (
        <p
          className={`rounded-2xl p-3 text-sm ${
            state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-black">Datos personales</h2>
        <p className="text-sm text-slate-600">
          Tu registro queda como voluntario/a auto-registrado/a. Puedes ayudar a
          subir información, pero los datos pueden marcarse como no verificados
          hasta revisión.
        </p>
        <div>
          <label>Nombre completo *</label>
          <input name="full_name" required placeholder="Ej. María Pérez" />
        </div>
        <div>
          <label>Correo *</label>
          <input name="email" type="email" required placeholder="tu@correo.com" />
        </div>
        <div>
          <label>Teléfono/WhatsApp *</label>
          <input name="phone" required placeholder="Número de contacto" />
        </div>
        <div>
          <label>Zona donde puedes ayudar *</label>
          <input name="zone" required placeholder="Parroquia, municipio o sector" />
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="text-xl font-black">Contexto de ayuda</h2>
        <div>
          <label>Organización</label>
          <input name="organization_name" placeholder="Opcional" />
        </div>
        <div>
          <label>Centro, refugio u hospital</label>
          <input name="center_name" placeholder="Opcional" />
        </div>
        <div>
          <label>Tipo de ayuda que puedes dar</label>
          <textarea
            name="type_of_help"
            rows={4}
            placeholder="Ej. cargar listados, verificar centros, apoyar traslados, orientar familias..."
          />
        </div>
      </section>

      <SubmitButton>Enviar código de confirmación</SubmitButton>
    </form>
  );
}