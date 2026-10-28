// Keep this module browser-safe: import it directly in the web app.
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function dateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Calendar fields historically submitted as YYYY-MM-DD became midnight UTC.
 * Preserve those dates; real timestamps must be displayed in the workspace zone.
 */
export function calendarDateKey(date: Date, timeZone: string): string {
  return date.toISOString().endsWith('T00:00:00.000Z')
    ? date.toISOString().slice(0, 10)
    : dateKey(date, timeZone);
}

/** Convert a wall-clock value from the selected IANA zone into an instant.
 * Reject DST gaps instead of silently scheduling a different local time.
 */
export function zonedDateTime(value: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (!match) throw new Error('Data local inválida.');
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const wall = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const checked = new Date(wall);
  if (checked.getUTCFullYear() !== Number(year) || checked.getUTCMonth() !== Number(month) - 1 ||
      checked.getUTCDate() !== Number(day) || checked.getUTCHours() !== Number(hour) ||
      checked.getUTCMinutes() !== Number(minute) || checked.getUTCSeconds() !== Number(second)) {
    throw new Error('Data local inválida.');
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  let result = wall;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = formatter.formatToParts(new Date(result));
    const part = (name: string) => Number(parts.find(p => p.type === name)!.value);
    const displayed = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
    if (displayed === wall) return new Date(result);
    result += wall - displayed;
  }
  throw new Error('Horário inexistente no fuso selecionado.');
}
