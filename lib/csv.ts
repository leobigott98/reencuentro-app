import * as XLSX from "xlsx";

export type FoundPersonRow = {
  row_number: string | null;
  full_name: string | null;
  approximate_age: number | null;
  document_id: string | null;
  current_location: string;
  found_location: string | null;
  phone: string | null;
  address: string | null;
  notes_public: string | null;
  notes_private: string | null;
  source_sheet: string | null;
};

function cleanCell(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: string) {
  return cleanCell(value)
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

const rowNumberHeaders = new Set(["n", "no", "nro", "numero", "num", "n orden"]);
const fullNameHeaders = new Set([
  "nombre",
  "nombres",
  "apellido nombre",
  "apellidos nombres",
  "apellidos y nombres",
  "nombre y apellido",
  "nombres y apellidos",
  "paciente",
  "full name",
  "nombre completo",
  "name",
]);
const ageHeaders = new Set(["edad", "age", "approximate age"]);
const documentHeaders = new Set([
  "cedula",
  "cedula id",
  "cedula identificacion",
  "ci",
  "c i",
  "id",
  "document id",
  "documento",
  "identificacion",
]);
const phoneHeaders = new Set(["telefono", "phone", "tlf", "cel", "celular", "whatsapp"]);
const addressHeaders = new Set([
  "direccion",
  "ubicacion",
  "current location",
  "lugar",
  "location",
  "procedencia",
  "zona",
  "sector",
]);
const centerHeaders = new Set(["hospital", "centro", "refugio", "institucion", "morgue"]);
const notesHeaders = new Set([
  "observaciones",
  "notas",
  "notes",
  "descripcion",
  "description",
  "diagnostico",
  "parentesco obs",
  "parentesco",
  "obs",
]);
const ignoredHeaders = new Set(["", "sexo", "genero"]);

const knownHeaders = new Set([
  ...rowNumberHeaders,
  ...fullNameHeaders,
  ...ageHeaders,
  ...documentHeaders,
  ...phoneHeaders,
  ...addressHeaders,
  ...centerHeaders,
  ...notesHeaders,
]);

function headerScore(cells: unknown[]) {
  return cells.reduce<number>((score, cell) => {
    const header = normalizeHeader(String(cell ?? ""));
    return score + (knownHeaders.has(header) ? 1 : 0);
  }, 0);
}

function findHeaderIndex(matrix: unknown[][]) {
  let bestIndex = -1;
  let bestScore = 0;
  const limit = Math.min(matrix.length, 25);
  for (let index = 0; index < limit; index++) {
    const score = headerScore(matrix[index] || []);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? bestIndex : -1;
}

function firstMatching(row: Record<string, string>, headers: Set<string>) {
  for (const [header, value] of Object.entries(row)) {
    if (headers.has(header) && value) return value;
  }
  return "";
}

function toAge(value: string) {
  if (!value) return null;
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 120 ? numeric : null;
}

function looksLikeTitleRow(row: unknown[]) {
  const text = row.map(cleanCell).filter(Boolean).join(" ");
  if (!text) return false;
  return /pacientes|hospital|centro|refugio|listado|buscar/i.test(text) && row.filter((cell) => cleanCell(cell)).length <= 3;
}

function inferSheetLocation(matrix: unknown[][], sourceSheet: string | null) {
  const title = matrix.find(looksLikeTitleRow)?.map(cleanCell).filter(Boolean).join(" ");
  const sheet = sourceSheet && !/buscar pacientes/i.test(sourceSheet) ? sourceSheet : "";
  return cleanCell(title || sheet || "");
}

function compactParts(parts: Array<string | null | undefined>) {
  return parts.map((part) => cleanCell(part)).filter(Boolean);
}

function normalizeRow(
  row: Record<string, string>,
  sourceSheet: string | null,
  inferredLocation: string,
): FoundPersonRow | null {
  const rowNumber = firstMatching(row, rowNumberHeaders) || null;
  const fullName = firstMatching(row, fullNameHeaders) || null;
  const documentId = firstMatching(row, documentHeaders) || null;
  const rawAge = firstMatching(row, ageHeaders);
  const approximateAge = toAge(rawAge);
  const address = firstMatching(row, addressHeaders) || null;
  const center = firstMatching(row, centerHeaders) || null;
  const phone = firstMatching(row, phoneHeaders) || null;
  const notes = firstMatching(row, notesHeaders) || null;
  const currentLocation = compactParts([center, !center && inferredLocation ? inferredLocation : null, address]).join(" - ");

  const publicNotes = compactParts([
    rowNumber ? `Nro: ${rowNumber}` : null,
    notes,
    address ? `Dirección/procedencia: ${address}` : null,
    phone ? `Teléfono en listado: ${phone}` : null,
    rawAge && approximateAge === null ? `Edad original: ${rawAge}` : null,
  ]).join("\n");
  const privateNotes = compactParts([
    sourceSheet ? `Hoja: ${sourceSheet}` : null,
    rowNumber ? `Fila/Nro: ${rowNumber}` : null,
  ]).join("\n");

  if (!fullName && !documentId && approximateAge === null && !currentLocation && !publicNotes) {
    return null;
  }
  if (!currentLocation) return null;

  return {
    row_number: rowNumber,
    full_name: fullName,
    approximate_age: approximateAge,
    document_id: documentId,
    current_location: currentLocation,
    found_location: address,
    phone,
    address,
    notes_public: publicNotes || null,
    notes_private: privateNotes || null,
    source_sheet: sourceSheet,
  };
}

function fallbackHeaders(columnCount: number) {
  if (columnCount >= 8) {
    return ["nro", "hospital", "apellidos y nombres", "edad", "cedula", "telefono", "direccion", "observaciones"];
  }
  if (columnCount >= 7) {
    return ["nro", "apellidos y nombres", "edad", "cedula", "telefono", "direccion", "observaciones"];
  }
  if (columnCount >= 4) {
    return ["apellidos y nombres", "edad", "cedula", "observaciones"];
  }
  return ["apellidos y nombres", "cedula", "observaciones"];
}

function rowsFromMatrix(matrix: unknown[][], sourceSheet: string | null) {
  const nonEmptyRows = matrix.filter((row) => row.some((cell) => cleanCell(cell)));
  if (!nonEmptyRows.length) return [];

  const headerIndex = findHeaderIndex(nonEmptyRows);
  const inferredLocation = inferSheetLocation(nonEmptyRows, sourceSheet);
  const rawHeaders = headerIndex >= 0 ? nonEmptyRows[headerIndex] : fallbackHeaders(nonEmptyRows[0].length);
  const headers = rawHeaders.map((cell) => normalizeHeader(String(cell ?? "")));
  const body = headerIndex >= 0 ? nonEmptyRows.slice(headerIndex + 1) : nonEmptyRows;

  return body
    .map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (ignoredHeaders.has(header)) return;
        row[header] = cleanCell(cells[index]);
      });
      return normalizeRow(row, sourceSheet, inferredLocation);
    })
    .filter((row): row is FoundPersonRow => Boolean(row));
}

export function parseFoundCsv(text: string): FoundPersonRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  return rowsFromMatrix(lines.map(splitCsvLine), "Pegado manual");
}

export function parseFoundWorkbook(buffer: Buffer, _fileName: string): FoundPersonRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const allRows: FoundPersonRow[] = [];
  const masterRows: FoundPersonRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    const parsedRows = rowsFromMatrix(matrix, sheetName);
    const headerIndex = findHeaderIndex(matrix);
    const headers = headerIndex >= 0 ? matrix[headerIndex].map((cell) => normalizeHeader(String(cell ?? ""))) : [];
    const isMasterSheet = /buscar|maestr|consolid/i.test(sheetName) && headers.some((header) => centerHeaders.has(header));
    if (isMasterSheet) masterRows.push(...parsedRows);
    allRows.push(...parsedRows);
  }

  return masterRows.length >= 100 ? masterRows : allRows;
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
