/**
 * Date, time and date-time handling for date fields
 */

import { DateFormat } from './types';

export const toDateFormat = (format: string | undefined): DateFormat | undefined => {
  if (format === 'date' || format === 'time' || format === 'date-time') {
    return format;
  }
  return undefined;
};

const padTwoDigits = (value: number) => String(value).padStart(2, '0');

export const coerceDate = (value: unknown, dateFormat: DateFormat | undefined): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  if (dateFormat === 'time') {
    const match = value.match(/(\d{1,2}):(\d{2})/);
    return match ? `${padTwoDigits(Number(match[1]))}:${match[2]}` : undefined;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;

  const date = new Date(timestamp);
  if (dateFormat === 'date') {
    return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;
  }
  return date.toISOString();
};
