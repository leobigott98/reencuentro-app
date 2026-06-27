import { sendEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

const NOTIFICATION_PREFIX =
  "Hay una posible coincidencia. Esto no confirma identidad.";

type MissingCase = {
  id: string;
  public_code: string;
  full_name: string | null;
  document_id: string | null;
  document_last4: string | null;
  last_seen_location: string | null;
  current_location: string | null;
  owner_email: string | null;
};

type FoundRecord = {
  id: string;
  public_code: string;
  full_name: string | null;
  document_id: string | null;
  document_last4: string | null;
  found_location: string | null;
  current_location: string | null;
  source_name: string | null;
  status: string | null;
  sensitivity_level: string | null;
};

type MatchInput = {
  missing: MissingCase;
  found: FoundRecord;
  matchType: "document_id" | "document_last4_name" | "name_location";
  score: number;
  notify: boolean;
};

export function normalizeName(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocation(value: string | null | undefined) {
  return normalizeName(value);
}

function tokenSet(value: string) {
  return new Set(value.split(" ").filter((token) => token.length >= 2));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function bigrams(value: string) {
  const compact = value.replace(/\s+/g, "");
  const grams = new Set<string>();
  for (let index = 0; index < compact.length - 1; index += 1) {
    grams.add(compact.slice(index, index + 2));
  }
  return grams;
}

function dice(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const gram of a) if (b.has(gram)) intersection += 1;
  return (2 * intersection) / (a.size + b.size);
}

function nameSimilarity(a: string | null, b: string | null) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  return Math.max(
    jaccard(tokenSet(left), tokenSet(right)),
    dice(bigrams(left), bigrams(right)),
  );
}

function locationSimilarity(missing: MissingCase, found: FoundRecord) {
  const missingLocation = normalizeLocation(
    missing.current_location || missing.last_seen_location,
  );
  const foundLocation = normalizeLocation(
    found.current_location || found.found_location,
  );
  if (!missingLocation || !foundLocation) return 0;
  if (
    missingLocation.includes(foundLocation) ||
    foundLocation.includes(missingLocation)
  ) {
    return 1;
  }
  return jaccard(tokenSet(missingLocation), tokenSet(foundLocation));
}

function locationBoost(missing: MissingCase, found: FoundRecord) {
  const similarity = locationSimilarity(missing, found);
  if (similarity >= 0.6) return 0.12;
  if (similarity >= 0.35) return 0.06;
  return 0;
}

function clampScore(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(2))));
}

function documentLast4(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function publicBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function getMissingCase(missingCaseId: string) {
  const { data } = await supabaseAdmin()
    .from("person_cases")
    .select(
      "id, public_code, full_name, document_id, document_last4, last_seen_location, current_location, owner_email",
    )
    .eq("id", missingCaseId)
    .maybeSingle();
  return (data || null) as MissingCase | null;
}

async function getFoundRecord(foundRecordId: string) {
  const { data } = await supabaseAdmin()
    .from("found_records")
    .select(
      "id, public_code, full_name, document_id, document_last4, found_location, current_location, source_name, status, sensitivity_level",
    )
    .eq("id", foundRecordId)
    .neq("status", "discarded")
    .maybeSingle();
  return (data || null) as FoundRecord | null;
}

async function insertPossibleMatch(input: MatchInput) {
  const db = supabaseAdmin();
  const isHighRiskFound =
    input.found.status?.includes("deceased") ||
    input.found.sensitivity_level === "high_risk";
  const shouldNotify = input.notify && !isHighRiskFound;
  const { data: existing } = await db
    .from("possible_matches")
    .select("id")
    .eq("missing_case_id", input.missing.id)
    .eq("found_record_id", input.found.id)
    .eq("match_type", input.matchType)
    .maybeSingle();

  if (existing) return false;

  const { error } = await db.from("possible_matches").insert({
    missing_case_id: input.missing.id,
    found_record_id: input.found.id,
    match_type: input.matchType,
    score: input.score,
    status: isHighRiskFound ? "reviewing" : "pending",
    notified_at: shouldNotify ? new Date().toISOString() : null,
  });

  if (error) return false;
  if (shouldNotify) await notifyPossibleMatch(input.missing, input.found);
  return true;
}

function scoreCandidate(missing: MissingCase, found: FoundRecord) {
  const missingDoc = missing.document_id;
  const foundDoc = found.document_id;
  if (missingDoc && foundDoc && missingDoc === foundDoc) {
    return {
      matchType: "document_id" as const,
      score: 1,
      notify: true,
    };
  }

  const missingLast4 = missing.document_last4 || documentLast4(missingDoc);
  const foundLast4 = found.document_last4 || documentLast4(foundDoc);
  const nameScore = nameSimilarity(missing.full_name, found.full_name);

  if (missingLast4 && foundLast4 && missingLast4 === foundLast4 && nameScore >= 0.55) {
    return {
      matchType: "document_last4_name" as const,
      score: 0.75,
      notify: true,
    };
  }

  if (nameScore >= 0.58) {
    return {
      matchType: "name_location" as const,
      score: clampScore(0.5 + nameScore * 0.18 + locationBoost(missing, found), 0.5, 0.8),
      notify: false,
    };
  }

  return null;
}

async function findFoundCandidates(missing: MissingCase) {
  const db = supabaseAdmin();
  const queries = [];
  if (missing.document_id) {
    queries.push(
      db
        .from("found_records")
        .select(
          "id, public_code, full_name, document_id, document_last4, found_location, current_location, source_name, status, sensitivity_level",
        )
        .eq("document_id", missing.document_id)
        .neq("status", "discarded")
        .limit(25),
    );
  }
  const last4 = missing.document_last4 || documentLast4(missing.document_id);
  if (last4) {
    queries.push(
      db
        .from("found_records")
        .select(
          "id, public_code, full_name, document_id, document_last4, found_location, current_location, source_name, status, sensitivity_level",
        )
        .eq("document_last4", last4)
        .neq("status", "discarded")
        .limit(50),
    );
  }
  queries.push(
    db
      .from("found_records")
      .select(
        "id, public_code, full_name, document_id, document_last4, found_location, current_location, source_name, status, sensitivity_level",
      )
      .neq("status", "discarded")
      .order("updated_at", { ascending: false })
      .limit(250),
  );

  const results = await Promise.all(queries);
  const candidates = new Map<string, FoundRecord>();
  for (const result of results) {
    for (const row of result.data || []) candidates.set(row.id, row as FoundRecord);
  }
  return [...candidates.values()];
}

async function findMissingCandidates(found: FoundRecord) {
  const db = supabaseAdmin();
  const queries = [];
  if (found.document_id) {
    queries.push(
      db
        .from("person_cases")
        .select(
          "id, public_code, full_name, document_id, document_last4, last_seen_location, current_location, owner_email",
        )
        .eq("document_id", found.document_id)
        .neq("status", "discarded")
        .neq("status", "duplicate")
        .limit(25),
    );
  }
  const last4 = found.document_last4 || documentLast4(found.document_id);
  if (last4) {
    queries.push(
      db
        .from("person_cases")
        .select(
          "id, public_code, full_name, document_id, document_last4, last_seen_location, current_location, owner_email",
        )
        .eq("document_last4", last4)
        .neq("status", "discarded")
        .neq("status", "duplicate")
        .limit(50),
    );
  }
  queries.push(
    db
      .from("person_cases")
      .select(
        "id, public_code, full_name, document_id, document_last4, last_seen_location, current_location, owner_email",
      )
      .neq("status", "discarded")
      .neq("status", "duplicate")
      .order("updated_at", { ascending: false })
      .limit(250),
  );

  const results = await Promise.all(queries);
  const candidates = new Map<string, MissingCase>();
  for (const result of results) {
    for (const row of result.data || []) candidates.set(row.id, row as MissingCase);
  }
  return [...candidates.values()];
}

export async function maybeCreatePossibleMatchesForMissingCase(missingCaseId: string) {
  const missing = await getMissingCase(missingCaseId);
  if (!missing) return { created: 0, notified: 0 };

  let created = 0;
  let notified = 0;
  for (const found of await findFoundCandidates(missing)) {
    const scored = scoreCandidate(missing, found);
    if (!scored) continue;
    const didCreate = await insertPossibleMatch({ missing, found, ...scored });
    if (didCreate) {
      created += 1;
      if (scored.notify) notified += 1;
    }
  }
  return { created, notified };
}

export async function maybeCreatePossibleMatchesForFoundRecord(foundRecordId: string) {
  const found = await getFoundRecord(foundRecordId);
  if (!found) return { created: 0, notified: 0 };

  let created = 0;
  let notified = 0;
  for (const missing of await findMissingCandidates(found)) {
    const scored = scoreCandidate(missing, found);
    if (!scored) continue;
    const didCreate = await insertPossibleMatch({ missing, found, ...scored });
    if (didCreate) {
      created += 1;
      if (scored.notify) notified += 1;
    }
  }
  return { created, notified };
}

export async function notifyPossibleMatch(missing: MissingCase, found: FoundRecord) {
  const subject = `Posible coincidencia para ${missing.full_name || "tu reporte"}`;
  const html = `<p><strong>${NOTIFICATION_PREFIX}</strong></p><p>Detectamos datos compatibles entre un reporte de desaparición y una ficha de persona encontrada.</p><p><strong>Reporte:</strong> ${missing.full_name || "Persona reportada"}</p><p><strong>Ficha encontrada:</strong> ${found.full_name || "Persona por identificar"}</p><p><strong>Ubicación reportada:</strong> ${found.current_location || found.found_location || "No indicada"}</p><p><a href="${publicBaseUrl()}/casos/${missing.public_code}">Ver reporte de desaparición</a></p><p><a href="${publicBaseUrl()}/encontrados/${found.public_code}">Ver ficha encontrada</a></p>`;

  if (missing.owner_email) {
    await sendEmail({
      to: [missing.owner_email],
      subject,
      html: `${html}<p style="font-size:12px;color:#64748b">Recibes este correo porque creaste el reporte original.</p>`,
    });
  }

  const db = supabaseAdmin();
  const { data: subs } = await db
    .from("generic_subscriptions")
    .select("email, unsubscribe_token")
    .eq("subject_type", "missing_case")
    .eq("subject_id", missing.id)
    .eq("status", "confirmed");

  for (const sub of subs || []) {
    const token = sub.unsubscribe_token
      ? `<p style="font-size:12px;color:#64748b"><a href="${publicBaseUrl()}/desuscribir?token=${encodeURIComponent(sub.unsubscribe_token)}">Cancelar suscripción</a></p>`
      : "";
    await sendEmail({
      to: [sub.email],
      subject,
      html: `${html}${token}`,
    });
  }
}
