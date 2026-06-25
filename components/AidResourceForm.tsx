"use client";
import { useActionState } from "react";
import { createAidResource } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };

export function AidResourceForm() {
  const [state, action] = useActionState(createAidResource, initial);
  return (
    <form action={action} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-black">Publicar información de ayuda</h2>
      {state.message ? <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
      <div><label>Tipo</label><select name="kind" required><option value="collection_center">Centro de acopio</option><option value="specific_request">Solicitud específica</option><option value="news">Información general / noticia</option><option value="emergency_contact">Número o contacto de emergencia</option><option value="tip">Tip útil</option></select></div>
      <div><label>Título</label><input name="title" required /></div>
      <div><label>Ubicación</label><input name="location" placeholder="Municipio, sector, dirección referencial" /></div>
      <div><label>Descripción</label><textarea name="description" required rows={4} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label>Contacto</label><input name="contact_name" /></div><div><label>Teléfono</label><input name="contact_phone" /></div></div>
      <div><label>Fuente / enlace</label><input name="source_url" type="url" /></div>
      <div><label>Prioridad</label><select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option></select></div>
      <SubmitButton>Publicar</SubmitButton>
    </form>
  );
}
