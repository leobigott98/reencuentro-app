import * as XLSX from "xlsx";

export type FoundPersonRow = {
  full_name: string | null;
  approximate_age: number | null;
  document_id: string | null;
  current_location: string;
  notes_public: string | null;
  source_sheet: string | null;
};

function normalizeHeader(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

const fullNameHeaders = new Set([
  "nombre",
  "nombres",
  "apellidos y nombres",
  "paciente",
  "full name",
  "nombre completo",
  "name",
]);
const ageHeaders = new Set(["edad", "age", "approximate age"]);
const documentHeaders = new Set(["cedula", "ci", "id", "document id", "documento"]);
const phoneHeaders = new Set(["telefono", "phone", "celular", "whatsapp"]);
const addressHeaders = new Set(["direccion", "ubicacion", "current location", "lugar", "location"]);
const centerHeaders = new Set(["hospital", "centro", "refugio"]);
const notesHeaders = new Set(["observaciones", "notas", "notes", "descripcion", "description"]);

function firstMatching(row: Record<string, string>, headers: Set<string>) {
  for (const [header, value] of Object.entries(row)) {
    if (headers.has(header) && value) return value.trim();
  }
  return "";
}

function toAge(value: string) {
  if (!value) return null;
  const numeric = Number(String(value).replace(/[^0-9]/g, ""));
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 120 ? numeric : null;
}

function normalizeRow(
  row: Record<string, string>,
  sourceSheet: string | null,
): FoundPersonRow | null {
  const fullName = firstMatching(row, fullNameHeaders) || null;
  const documentId = firstMatching(row, documentHeaders) || null;
  const approximateAge = toAge(firstMatching(row, ageHeaders));
  const address = firstMatching(row, addressHeaders);
  const center = firstMatching(row, centerHeaders);
  const currentLocation = [center, address].filter(Boolean).join(" - ").trim();
  const phone = firstMatching(row, phoneHeaders);
  const notes = firstMatching(row, notesHeaders);
  const notesParts = [notes, phone ? `Teléfono en listado: ${phone}` : ""].filter(Boolean);

  if (!fullName && !documentId && !approximateAge && !currentLocation && !notesParts.length) {
    return null;
  }
  if (!currentLocation) return null;

  return {
    full_name: fullName,
    approximate_age: approximateAge,
    document_id: documentId,
    current_location: currentLocation,
    notes_public: notesParts.join("\n") || null,
    source_sheet: sourceSheet,
  };
}

function rowsFromMatrix(matrix: unknown[][], sourceSheet: string | null) {
  const nonEmptyRows = matrix.filter((row) =>
    row.some((cell) => String(cell ?? "").trim()),
  );
  if (!nonEmptyRows.length) return [];

  const first = nonEmptyRows[0].map((cell) => normalizeHeader(String(cell ?? "")));
  const knownHeaders = new Set([
    ...fullNameHeaders,
    ...ageHeaders,
    ...documentHeaders,
    ...phoneHeaders,
    ...addressHeaders,
    ...centerHeaders,
    ...notesHeaders,
  ]);
  const hasHeader = first.some((header) => knownHeaders.has(header));
  const headers = hasHeader
    ? first
    : ["nombre", "edad", "ubicacion", "observaciones"];
  const body = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;

  return body
    .map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (!header) return;
        row[header] = String(cells[index] ?? "").trim();
      });
      return normalizeRow(row, sourceSheet);
    })
    .filter((row): row is FoundPersonRow => Boolean(row));
}

export function parseFoundCsv(text: string): FoundPersonRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  return rowsFromMatrix(lines.map(splitCsvLine), "Pegado manual").slice(0, 500);
}

export function parseFoundWorkbook(buffer: Buffer, fileName: string): FoundPersonRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const rows: FoundPersonRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    rows.push(...rowsFromMatrix(matrix, sheetName));
  }
  return rows.slice(0, 1000);
}

export function isSpreadsheetFile(fileName: string, mimeType: string) {
  const name = fileName.toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  );
}
