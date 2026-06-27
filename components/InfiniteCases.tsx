"use client";

import { useEffect, useRef, useState } from "react";
import { PersonResultCard, PersonResultCardData } from "@/components/PersonResultCard";
import { PersonCase, statusLabels } from "@/lib/types";

function caseToResult(c: PersonCase): PersonResultCardData {
  return {
    id: c.id,
    href: `/casos/${c.public_code}`,
    kind: "missing",
    name: c.full_name,
    status: c.status,
    statusLabel: statusLabels[c.status],
    location: c.current_location || c.last_seen_location,
    timestamp: c.updated_at || c.created_at,
    hasPhoto: Boolean(c.photo_url),
    documentLast4: c.document_last4 || null,
    hospitalized: c.status === "hospitalized",
  };
}

export function InfiniteCases({
  initialCases,
  initialQ = "",
  initialStatus = "",
}: {
  initialCases: PersonCase[];
  initialQ?: string;
  initialStatus?: string;
}) {
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
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, loading, initialQ, initialStatus]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <PersonResultCard key={c.id} result={caseToResult(c)} />
        ))}
      </div>
      {!cases.length ? (
        <p className="rounded-3xl bg-white p-6 text-center text-slate-600">
          No hay resultados.
        </p>
      ) : null}
      <div ref={sentinel} className="py-8 text-center text-sm text-slate-500">
        {loading
          ? "Cargando más casos..."
          : hasMore
            ? "Desplázate para ver más"
            : cases.length
              ? "No hay más casos por mostrar"
              : ""}
      </div>
    </>
  );
}