"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PersonCase, statusLabels } from "@/lib/types";

export function InfiniteCases({ initialCases, initialQ = "", initialStatus = "" }: { initialCases: PersonCase[]; initialQ?: string; initialStatus?: string }) {
  const [cases, setCases] = useState(initialCases);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCases.length >= 24);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page + 1), limit: "24" });
    if (initialQ) params.set("q", initialQ);
    if (initialStatus) params.set("estado", initialStatus);
    const res = await fetch(`/api/casos?${params.toString()}`);
    const json = await res.json();
    const next = json.cases as PersonCase[];
    setCases((prev) => [...prev, ...next]);
    setPage((p) => p + 1);
    setHasMore(Boolean(json.hasMore));
    setLoading(false);
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, loading, initialQ, initialStatus]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <Link key={c.id} href={`/casos/${c.public_code}`} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-cerca-500">
            {c.photo_url ? <img src={c.photo_url} alt="" className="mb-3 h-44 w-full rounded-2xl object-cover" /> : <div className="mb-3 flex h-44 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">Sin foto</div>}
            <p className="text-xs font-bold uppercase text-cerca-700">{statusLabels[c.status]}</p>
            <h2 className="mt-1 text-xl font-black">{c.full_name}</h2>
            <p className="mt-2 text-sm text-slate-600">Ubicación: {c.current_location || c.last_seen_location}</p>
          </Link>
        ))}
      </div>
      {!cases.length ? <p className="rounded-3xl bg-white p-6 text-center text-slate-600">No hay resultados.</p> : null}
      <div ref={sentinel} className="py-8 text-center text-sm text-slate-500">
        {loading ? "Cargando más casos..." : hasMore ? "Desplázate para ver más" : cases.length ? "No hay más casos por mostrar" : ""}
      </div>
    </>
  );
}
