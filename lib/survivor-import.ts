import * as XLSX from "xlsx";

export type SurvivorImportRow = {
  full_name: string;
  normalized_name: string;
  approximate_age: number | null;
  document_id: string | null;
  document_last4: string | null;
  hospital: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  source_sheet: string | null;
};

function norm(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function key(value: unknown) {
  return norm(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function toAge(value: unknown) {
  const raw = norm(value).replace(/[^0-9]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
}

function last4(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : digits || null;
}

function findHeaderRow(rows: unknown[][]) {
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const keys = rows[i].map(key);
    const hasName = keys.some((k) => ["apellidos_y_nombres", "nombre", "nombres", "full_name", "paciente"].includes(k));
    const hasAnyUseful = keys.some((k) => ["cedula_id", "cedula", "telefono", "direccion", "observaciones", "hospital"].includes(k));
    if (hasName && hasAnyUseful) return i;
  }
  return -1;
}

function getCell(record: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const k = key(name);
    if (record[k] !== undefined && norm(record[k])) return norm(record[k]);
  }
  return "";
}

export function parseSurvivorWorkbook(buffer: Buffer, filename: string): SurvivorImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const perSheet: { sheetName: string; rows: SurvivorImportRow[]; hasHospitalColumn: boolean }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
    const headerIndex = findHeaderRow(matrix);
    if (headerIndex < 0) continue;

    const headers = matrix[headerIndex].map(key);
    const hasHospitalColumn = headers.includes("hospital");
    const sheetRows: SurvivorImportRow[] = [];
    const dataRows = matrix.slice(headerIndex + 1);
    const sheetHospital = sheetName.includes("BUSCAR") ? null : sheetName;

    for (const row of dataRows) {
      const record: Record<string, unknown> = {};
      headers.forEach((h, idx) => { if (h) record[h] = row[idx]; });
      const fullName = getCell(record, ["apellidos y nombres", "nombre", "nombres", "full_name", "paciente"]);
      if (!fullName || /^total/i.test(fullName)) continue;
      const documentId = getCell(record, ["cédula / id", "cedula / id", "cedula_id", "cédula", "cedula", "id"]) || null;
      const hospital = getCell(record, ["hospital", "centro", "ubicacion hospitalaria"]) || sheetHospital || null;
      const rowObj: SurvivorImportRow = {
        full_name: fullName,
        normalized_name: normalizeName(fullName),
        approximate_age: toAge(getCell(record, ["edad", "age"])),
        document_id: documentId,
        document_last4: last4(documentId),
        hospital,
        phone: getCell(record, ["teléfono", "telefono", "phone", "contacto"]) || null,
        address: getCell(record, ["dirección", "direccion", "address", "residencia", "zona"]) || null,
        notes: getCell(record, ["observaciones", "notas", "notes", "descripcion", "descripción"]) || null,
        source_sheet: sheetName || filename
      };
      sheetRows.push(rowObj);
    }
    perSheet.push({ sheetName, rows: sheetRows, hasHospitalColumn });
  }

  const master = perSheet.find((s) => s.rows.length > 0 && (s.sheetName.includes("BUSCAR") || s.hasHospitalColumn));
  const out = master ? master.rows : perSheet.flatMap((s) => s.rows);

  const seen = new Set<string>();
  return out.filter((r) => {
    const dedupe = `${r.normalized_name}|${r.document_last4 || ""}|${r.hospital || ""}`;
    if (seen.has(dedupe)) return false;
    seen.add(dedupe);
    return true;
  });
}
