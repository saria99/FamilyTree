import type { PartialDate } from '../data/model'

// Dates are handled as day numbers (days since 1970-01-01, UTC) so rules can compare ranges.
export type Day = number

export const NEG_INF = Number.NEGATIVE_INFINITY
export const POS_INF = Number.POSITIVE_INFINITY

const MS_PER_DAY = 86_400_000

function dayOf(y: number, m: number, d: number): Day {
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY)
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export interface Bounds {
  earliest: Day
  latest: Day
}

/** Earliest and latest day the date could be; null when the date is unknown. */
export function bounds(date: PartialDate | undefined): Bounds | null {
  if (!date || date.y === undefined || date.y === null || Number.isNaN(date.y)) return null
  const spread = date.approx ? 5 : 0
  if (date.m && date.d) {
    if (spread) return { earliest: dayOf(date.y - spread, 1, 1), latest: dayOf(date.y + spread, 12, 31) }
    const day = dayOf(date.y, date.m, date.d)
    return { earliest: day, latest: day }
  }
  if (date.m) {
    if (spread) return { earliest: dayOf(date.y - spread, 1, 1), latest: dayOf(date.y + spread, 12, 31) }
    return { earliest: dayOf(date.y, date.m, 1), latest: dayOf(date.y, date.m, lastDayOfMonth(date.y, date.m)) }
  }
  return { earliest: dayOf(date.y - spread, 1, 1), latest: dayOf(date.y + spread, 12, 31) }
}

export const daysFromYears = (years: number): number => Math.round(years * 365.25)

export function formatDate(date: PartialDate | undefined, lang: 'ar' | 'en'): string {
  if (!date || !date.y) return ''
  const prefix = date.approx ? (lang === 'ar' ? 'حوالي ' : 'c. ') : ''
  if (date.m && date.d) {
    const d = new Date(Date.UTC(date.y, date.m - 1, date.d))
    return prefix + d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
  }
  if (date.m) {
    const d = new Date(Date.UTC(date.y, date.m - 1, 1))
    return prefix + d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { timeZone: 'UTC', year: 'numeric', month: 'short' })
  }
  return prefix + (lang === 'ar' ? date.y.toLocaleString('ar', { useGrouping: false }) : String(date.y))
}

/** Hijri rendering of the earliest possible day (Umm al-Qura), for display only. */
export function formatHijri(date: PartialDate | undefined, lang: 'ar' | 'en'): string {
  const b = bounds(date)
  if (!b || !date) return ''
  const d = new Date(b.earliest * MS_PER_DAY)
  const opts: Intl.DateTimeFormatOptions = date.m
    ? { timeZone: 'UTC', year: 'numeric', month: 'long', ...(date.d ? { day: 'numeric' } : {}) }
    : { timeZone: 'UTC', year: 'numeric' }
  try {
    return new Intl.DateTimeFormat(`${lang === 'ar' ? 'ar' : 'en'}-u-ca-islamic-umalqura`, opts).format(d)
  } catch {
    return ''
  }
}

export function yearOf(date: PartialDate | undefined): number | undefined {
  return date?.y || undefined
}
