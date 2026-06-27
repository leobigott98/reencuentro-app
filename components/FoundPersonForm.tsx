"use client";

import { useActionState } from "react";
import { createFoundPersonReport } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };

const statusOptions = [
  ["unidentified", "No identificada"],
  ["partially_identified", "Parcialmente identificada"],
  ["safe", "A salvo"],
  ["hospitalized", "Hospitalizada"],
  ["transferred", "Trasladada"],
  ["minor_unaccompanied", "Menor sin acompañante"],
  ["deceased_unidentified", "Fallecida no identificada"],
] as const;

export function FoundPersonForm() {
  const [state, action] = useActionState(createFoundPersonReport, initial);
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
          className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-xl font-black">Persona encontrada</h2>
        <p className="text-sm text-slate-600">
          La ficha pública mostrará solo información útil y no sensible. Los
          casos sin identificación, de menores o de personas fallecidas se
          manejan con mayor restricción.
        </p>
        <div>
          <label>Nombre y apellido</label>
          <input name="full_name" placeholder="Opcional si no está identificada" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Documento de identidad</label>
            <input name="document_id" placeholder="Opcional, ayuda a cruzar casos" />
          </div>
          <div>
            <label>Edad aproximada</label>
            <input name="approximate_age" type="number" min="0" max="120" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label>Género aparente</label>
            <select name="apparent_gender" defaultValue="">
              <option value="">No indicado</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
              <option value="unknown">No determinado</option>
            </select>
          </div>
          <div>
            <label>Estado *</label>
            <select name="status" required defaultValue="unidentified">
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label>Foto pública de la persona</label>
          <input
            name="photo_file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          />
        </div>
        <div>
          <label>Ubicación actual *</label>
          <input
            name="current_location"
            required
            placeholder="Refugio, hospital, centro o sector"
          />
        </div>
        <div>
          <label>Lugar donde fue encontrada</label>
          <input name="found_location" placeholder="Opcional" />
        </div>
        <div>
          <label>Hacia dónde iba / a dónde fue trasladada</label>
          <input name="destination" placeholder="Opcional" />
        </div>
        <div>
          <label>Fecha y hora en que fue encontrada</label>
          <input name="found_at" type="datetime-local" />
        </div>
        <div>
          <label>Notas públicas</label>
          <textarea
            name="notes_public"
            rows={4}
            placeholder="Información útil no sensible"
          />
        </div>
        <div>
          <label>Notas privadas</label>
          <textarea
            name="notes_private"
            rows={4}
            placeholder="Datos para verificación interna"
          />
        </div>
        <div>
          <label>Evidencia privada</label>
          <input
            name="evidence_file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          />
        </div>
      </section>
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="text-xl font-black">Contacto privado del reportante</h2>
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
          <label>Fuente / institución / relación *</label>
          <input
            name="source_name"
            required
            placeholder="Ej. Refugio X, Hospital Y, vecino"
          />
        </div>
      </section>
      <SubmitButton>Reportar persona encontrada</SubmitButton>
    </form>
  );
}