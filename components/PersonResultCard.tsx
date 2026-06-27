import Link from "next/link";
import { relativeTime } from "@/lib/time";

export type PersonResultCardData = {
  id: string;
  href: string;
  kind: "found" | "missing";
  name: string | null;
  status: string;
  statusLabel: string;
  location: string | null;
  timestamp: string | null;
  sourceName?: string | null;
  hasPhoto?: boolean;
  sensitive?: boolean;
  hospitalized?: boolean;
  deceased?: boolean;
  documentLast4?: string | null;
};

function badgeClass(kind: PersonResultCardData["kind"]) {
  return kind === "found"
    ? "bg-cerca-50 text-cerca-800 ring-cerca-100"
    : "bg-amber-50 text-amber-900 ring-amber-100";
}

export function PersonResultCard({ result }: { result: PersonResultCardData }) {
  const badges = [
    result.hasPhoto ? "con foto" : "sin foto",
    result.sensitive ? "sensible" : null,
    result.hospitalized ? "hospitalizada" : null,
    result.deceased ? "fallecida" : null,
    result.documentLast4 ? `doc. ${result.documentLast4}` : null,
  ].filter(Boolean);

  return (
    <Link
      href={result.href}
      className="block rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-cerca-500"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${badgeClass(result.kind)}`}
          >
            {result.statusLabel || result.status}
          </p>
          <h2 className="mt-2 text-xl font-black">
            {result.name || "Persona por identificar"}
          </h2>
        </div>
        <p className="text-xs font-bold text-slate-500">
          reportado {relativeTime(result.timestamp)}
        </p>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {result.location || "Ubicación no indicada"}
      </p>
      {result.sourceName ? (
        <p className="mt-1 text-xs font-bold text-slate-500">
          Fuente: {result.sourceName}
        </p>
      ) : null}
      {badges.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}