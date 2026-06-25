export type CaseStatus =
  | "missing"
  | "possibly_found"
  | "verifying_location"
  | "found_alive"
  | "reunified"
  | "duplicate"
  | "discarded";

export const statusLabels: Record<CaseStatus, string> = {
  missing: "Aún sin contacto",
  possibly_found: "Posiblemente localizado/a",
  verifying_location: "Localización en verificación",
  found_alive: "Localizado/a con vida",
  reunified: "Reunificado/a con familia",
  duplicate: "Duplicado",
  discarded: "Descartado"
};

export type PersonCase = {
  id: string;
  public_code: string;
  full_name: string;
  approximate_age: number | null;
  photo_url: string | null;
  status: CaseStatus;
  last_seen_location: string;
  last_seen_at: string | null;
  current_location: string | null;
  description: string | null;
  view_count?: number | null;
  share_count?: number | null;
  created_at: string;
  updated_at: string;
};

export type AidResource = {
  id: string;
  kind: "collection_center" | "specific_request" | "news" | "emergency_contact" | "tip";
  title: string;
  location: string | null;
  description: string;
  contact_name: string | null;
  contact_phone: string | null;
  source_url: string | null;
  priority: "normal" | "high" | "critical";
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export const aidKindLabels: Record<AidResource["kind"], string> = {
  collection_center: "Centro de acopio",
  specific_request: "Solicitud específica",
  news: "Información general",
  emergency_contact: "Contacto de emergencia",
  tip: "Tip útil"
};
