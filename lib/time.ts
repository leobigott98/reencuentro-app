export function relativeTime(date: string | null): string {
  if (!date) return "fecha no indicada";
  const value = new Date(date).getTime();
  if (!Number.isFinite(value)) return "fecha no indicada";

  const diffSeconds = Math.round((value - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const formatter = new Intl.RelativeTimeFormat("es-VE", { numeric: "auto" });

  for (const [unit, seconds] of units) {
    if (absSeconds >= seconds || unit === "second") {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return "fecha no indicada";
}