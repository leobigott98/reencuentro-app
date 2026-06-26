export type FoundPersonRow = {
  full_name: string;
  approximate_age?: number | null;
  document_id?: string | null;
  current_location: string;
  notes?: string | null;
};

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

export function parseFoundCsv(text: string): FoundPersonRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = first.some((h) => ["nombre", "full_name", "ubicacion", "current_location", "edad"].includes(h));
  const body = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? first : ["full_name", "approximate_age", "current_location", "notes"];

  return body.map((line) => {
    const cells = splitCsvLine(line);
    const get = (...names: string[]) => {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx >= 0) return cells[idx]?.trim() || "";
      }
      return "";
    };
    const ageRaw = get("approximate_age", "edad", "age");
    const age = ageRaw ? Number(ageRaw) : null;
    return {
      full_name: get("full_name", "nombre", "nombre completo", "name"),
      approximate_age: Number.isFinite(age) ? age : null,
      document_id: get("document_id", "cedula", "cédula", "ci", "id") || null,
      current_location: get("current_location", "ubicacion", "ubicación", "lugar", "location"),
      notes: get("notes", "notas", "observaciones", "descripcion", "descripción") || null
    };
  }).filter((r) => r.full_name && r.current_location).slice(0, 200);
}
