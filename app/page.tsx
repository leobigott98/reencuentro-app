import Link from "next/link";
import { Search, ShieldCheck, Share2, Users, HeartHandshake, Clock3, HandHeart, LogIn } from "lucide-react";
import { supabaseAnon } from "@/lib/supabase";
import { PersonCase } from "@/lib/types";
import { InfiniteCases } from "@/components/InfiniteCases";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const db = supabaseAnon();

  let query = db.from("public_person_cases").select("*").order("updated_at", { ascending: false }).range(0, 24);
  if (q) query = query.ilike("full_name", `%${q}%`);
  if (params.estado) query = query.eq("status", params.estado);

  const [{ data }, { data: stats }] = await Promise.all([
    query,
    db.from("public_case_stats").select("*").single()
  ]);
  const cases = ((data || []).slice(0, 24)) as PersonCase[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-cerca-600 to-cerca-900 p-5 text-white shadow-sm sm:p-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-cerca-100">Contacto protegido · Verificación · Difusión responsable</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Busca, reporta y comparte personas sin exponer a sus familias.</h1>
        <p className="mt-4 max-w-2xl text-cerca-50">Los teléfonos quedan privados. Los avisos se revisan antes de cambiar estados. Cada caso tiene una ficha fácil de compartir.</p>
        <div className="mt-5 grid gap-3 sm:flex">
          <Link href="/reportar" className="rounded-2xl bg-white px-5 py-3 text-center font-black text-cerca-900">Reportar desaparecido/a</Link>
          <Link href="/encontrados/subir" className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/30">Subir listado de encontrados</Link>
          <a href="#buscar" className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/30">Buscar caso</a>
          <Link href="/ayudar" className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/30">Quiero ayudar</Link>
          <Link href="/mi-cuenta" className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/30">Mis reportes</Link>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><Users className="mb-2 text-cerca-600"/><p className="text-3xl font-black">{stats?.total_cases ?? 0}</p><p className="text-sm font-bold text-slate-600">Personas reportadas</p></div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><HeartHandshake className="mb-2 text-cerca-600"/><p className="text-3xl font-black">{stats?.found_or_reunified ?? 0}</p><p className="text-sm font-bold text-slate-600">Encontradas o reunificadas</p></div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><Clock3 className="mb-2 text-cerca-600"/><p className="text-3xl font-black">{stats?.still_missing ?? 0}</p><p className="text-sm font-bold text-slate-600">Aún sin contacto</p></div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href="/ayudar" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><HandHeart className="mb-2 text-cerca-600"/><b>También puedes ayudar</b><p className="text-sm text-slate-600">Centros de acopio, solicitudes específicas, contactos, noticias y tips verificados.</p></Link>
        <Link href="/mi-cuenta" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><LogIn className="mb-2 text-cerca-600"/><b>Panel de reportante</b><p className="text-sm text-slate-600">Entra con OTP para ver vistas, compartidos, estado y evidencias privadas de tus casos.</p></Link>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><ShieldCheck className="mb-2 text-cerca-600"/><b>Privacidad primero</b><p className="text-sm text-slate-600">No publicamos teléfonos ni emails de familiares.</p></div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><Share2 className="mb-2 text-cerca-600"/><b>Compartir rápido</b><p className="text-sm text-slate-600">Cada ficha genera un mensaje seguro para WhatsApp y redes.</p></div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><Search className="mb-2 text-cerca-600"/><b>Estados validados</b><p className="text-sm text-slate-600">“Encontrado” requiere revisión, no un clic público.</p></div>
      </section>

      <section id="buscar" className="mt-8">
        <form className="mb-4 grid gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1fr_auto_auto]">
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o apellido" className="border-0 focus:ring-0" />
          <select name="estado" defaultValue={params.estado || ""} className="border-0 focus:ring-0">
            <option value="">Todos</option>
            <option value="missing">Aún sin contacto</option>
            <option value="possibly_found">Posiblemente localizado/a</option>
            <option value="verifying_location">En verificación</option>
            <option value="found_alive">Localizado/a con vida</option>
            <option value="reunified">Reunificado/a</option>
          </select>
          <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Buscar</button>
        </form>
        <InfiniteCases initialCases={cases} initialQ={q} initialStatus={params.estado || ""} />
      </section>
    </main>
  );
}
