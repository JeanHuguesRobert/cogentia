/**
 * Trusted civil date/time for a WhatsApp turn.
 * Conversation history and cached prompts must not supply the calendar day.
 */

export const DEFAULT_PRINCIPAL_TIMEZONE = "Europe/Paris";

/**
 * @param {object} [options]
 * @param {string|number|Date} [options.now] - explicit clock (ISO string, epoch ms, or Date)
 * @param {string} [options.timezone]
 * @returns {{
 *   source: string,
 *   timezone: string,
 *   instant: string,
 *   civil_date: string,
 *   civil_time: string
 * }}
 */
export function resolveTurnClock(options = {}) {
  const timezone = String(options.timezone || DEFAULT_PRINCIPAL_TIMEZONE).trim() || DEFAULT_PRINCIPAL_TIMEZONE;
  const date = parseClockInstant(options.now);
  const source = options.now == null || options.now === "" ? "system_clock" : "injected_clock";
  return {
    source,
    timezone,
    instant: date.toISOString(),
    civil_date: formatInTimeZone(date, timezone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    civil_time: formatInTimeZone(date, timezone, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }),
  };
}

export function parseClockInstant(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getTime());
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function formatInTimeZone(date, timeZone, options) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, ...options }).formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  if (options.year) {
    return `${pick("year")}-${pick("month")}-${pick("day")}`;
  }
  const hour = pick("hour").padStart(2, "0");
  const minute = pick("minute").padStart(2, "0");
  return `${hour}:${minute}`;
}
