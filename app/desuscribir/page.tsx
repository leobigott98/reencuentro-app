import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  token?: string;
  subject_type?: string;
  subject_id?: string;
}>;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = String(params.token || "").trim();
  let message = "El enlace no es válido o ya no está activo.";

  if (token) {
    const db = supabaseAdmin();
    const genericQuery = db
      .from("generic_subscriptions")
      .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
      .eq("unsubscribe_token", token)
      .neq("status", "unsubscribed")
      .select("id")
      .limit(1);

    const { data: genericData, error: genericError } = await genericQuery;

    if (!genericError && genericData?.length) {
      message = "Listo. Cancelamos tu suscripción a estas actualizaciones.";
    } else {
      const { data: legacyData, error: legacyError } = await db
        .from("case_subscriptions")
        .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
        .eq("unsubscribe_token", token)
        .neq("status", "unsubscribed")
        .select("id")
        .limit(1);

      if (!legacyError && legacyData?.length) {
        message = "Listo. Cancelamos tu suscripción a estas actualizaciones.";
      }
    }
  }

  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-10">
      <section className="rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase text-cerca-700">Suscripción</p>
        <h1 className="mt-2 text-3xl font-black">Cancelar actualizaciones</h1>
        <p className="mt-3 text-slate-600">{message}</p>
        <Link
          href="/buscar"
          className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
        >
          Volver a buscar
        </Link>
      </section>
    </main>
  );
}