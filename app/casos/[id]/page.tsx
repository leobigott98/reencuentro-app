import { notFound } from "next/navigation";
import { InfoForm } from "@/components/InfoForm";
import { OwnerFoundForm } from "@/components/OwnerFoundForm";
import { ShareButton } from "@/components/ShareButton";
import { SubscribeForm } from "@/components/SubscribeForm";
import { supabaseAdmin, supabaseAnon } from "@/lib/supabase";
import { PersonCase, statusLabels } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string; creado?: string }> }) {
  const { id } = await params;
  const qs = await searchParams;
  const db = supabaseAnon();
  const { data } = await db.from("public_person_cases").select("*").eq("public_code", id).single();
  if (!data) notFound();
  const c = data as PersonCase;
  await supabaseAdmin().from("person_cases").update({ view_count: Number((c as any).view_count || 0) + 1 }).eq("id", c.id);
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/casos/${c.public_code}`;
  const shareText = `Se busca a: ${c.full_name}\nÚltima vez visto/a: ${c.last_seen_location}\nEstado: ${statusLabels[c.status]}\nSi tienes información directa, repórtala aquí:`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {qs.creado ? (
        <div className="mb-4 rounded-3xl bg-cerca-50 p-4 text-sm text-cerca-900 ring-1 ring-cerca-100">
          <b>Ficha creada.</b> Guarda esta página. Si ves un formulario amarillo, es tu enlace privado para solicitar marcar el caso como encontrado; no lo compartas.
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          {c.photo_url ? <img src={c.photo_url} alt="" className="mb-4 max-h-[520px] w-full rounded-3xl object-cover" /> : null}
          <p className="inline-flex rounded-full bg-cerca-50 px-3 py-1 text-sm font-black text-cerca-800">{statusLabels[c.status]}</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">{c.full_name}</h1>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold">Edad aproximada</dt><dd>{c.approximate_age ?? "No indicada"}</dd></div>
            {c.document_last4 ? <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold">Cédula</dt><dd>Termina en {c.document_last4}</dd></div> : null}
            <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold">Última ubicación</dt><dd>{c.last_seen_location}</dd></div>
            {c.current_location ? <div className="rounded-2xl bg-amber-50 p-3"><dt className="font-bold">Ubicación reportada actual</dt><dd>{c.current_location}</dd></div> : null}
            <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold">Último contacto</dt><dd>{c.last_seen_at ? new Date(c.last_seen_at).toLocaleString("es-VE") : "No indicado"}</dd></div>
            <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold">Actualizado</dt><dd>{new Date(c.updated_at).toLocaleString("es-VE")}</dd></div>
          </dl>
          {c.description ? <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-slate-700">{c.description}</p> : null}
          <div className="mt-5"><ShareButton title={`Se busca a ${c.full_name}`} text={shareText} url={url} publicCode={c.public_code} /></div>
          <p className="mt-3 text-xs text-slate-500">No se muestran teléfonos públicamente. Toda información enviada será revisada.</p>
          {qs.token ? <OwnerFoundForm publicCode={c.public_code} token={qs.token} /> : null}
        </section>
        <aside><InfoForm personId={c.id} /><SubscribeForm personId={c.id} /></aside>
      </div>
    </main>
  );
}
