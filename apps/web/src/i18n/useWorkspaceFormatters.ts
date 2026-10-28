'use client';

import { useAuth } from '../context/AuthContext';
import { DEFAULT_TIME_ZONE, zonedDateTime } from '@peanut/utils/dist/timezone';

export function useWorkspaceFormatters() {
  const { user } = useAuth();
  const timeZone = user?.timeZone || DEFAULT_TIME_ZONE;
  const format = (value: Date | string | number | null | undefined, options: Intl.DateTimeFormatOptions, calendarOnly = false) => {
    if (value === null || value === undefined || value === '') return '--';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '--';
    const zone = calendarOnly && date.toISOString().endsWith('T00:00:00.000Z') ? 'UTC' : timeZone;
    return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: zone }).format(date);
  };
  const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return {
    timeZone,
    formatDate: (value: Date | string | number | null | undefined) => format(value, dateOptions),
    formatCalendarDate: (value: Date | string | number | null | undefined) => format(value, dateOptions, true),
    formatDateTime: (value: Date | string | number | null | undefined) => format(value, { ...dateOptions, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }),
    formatTime: (value: Date | string | number | null | undefined) => format(value, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }),
    localDateTimeToIso: (value: string) => zonedDateTime(value, timeZone).toISOString(),
  };
}
