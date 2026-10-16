import { DayEntry } from '../../lib/repositories/day'
import { CalendarDayData, MonthData } from './types'

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

// Uses local getters, not toISOString() (UTC) — otherwise "today" lagged behind local midnight.
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildMonthCells(
  year: number,
  month: number,
  entriesByDate: Record<string, DayEntry>,
  today: string,
): CalendarDayData[] {
  const firstDayOfMonth = new Date(year, month - 1, 1)
  // JS getDay() is Sun=0..Sat=6; convert to Mon=0..Sun=6 for Monday-first weeks
  const leadingEmpties = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: CalendarDayData[] = []

  for (let i = 0; i < leadingEmpties; i++) {
    cells.push({
      date: null,
      dayNumber: 0,
      accentColor: null,
      hasPhoto: false,
      isToday: false,
      isFuture: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const entry = entriesByDate[date]
    cells.push({
      date,
      dayNumber: day,
      accentColor: entry?.accent_color ?? null,
      hasPhoto: !!entry?.photo_path,
      isToday: date === today,
      isFuture: date > today,
    })
  }

  return cells
}

const SWIPE_THRESHOLD = 40

// Distinguishes an intentional horizontal swipe from a vertical scroll or an incidental touch.
export function isHorizontalSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5
}

// Swipe right = newer month (higher index), swipe left = older month (lower index).
export function monthSwipeTarget(
  dx: number,
  currentIndex: number,
  monthCount: number,
): number | null {
  const target =
    dx > SWIPE_THRESHOLD ? currentIndex + 1 : dx < -SWIPE_THRESHOLD ? currentIndex - 1 : null
  if (target === null || target < 0 || target >= monthCount) return null
  return target
}

// Swipe right = newer year (year + 1), swipe left = older year (year - 1), same month.
export function yearSwipeTarget(
  dx: number,
  currentMonth: MonthData,
  displayMonths: MonthData[],
): number | null {
  const targetYear =
    dx > SWIPE_THRESHOLD
      ? currentMonth.year + 1
      : dx < -SWIPE_THRESHOLD
        ? currentMonth.year - 1
        : null
  if (targetYear === null) return null
  const idx = displayMonths.findIndex(
    (m) => m.year === targetYear && m.month === currentMonth.month,
  )
  return idx >= 0 ? idx : null
}

export function getMonthsUpToNow(
  startYear: number,
  startMonth: number,
  now: Date = new Date(),
): MonthData[] {
  const endYear = now.getFullYear()
  const endMonth = now.getMonth() + 1 // 1–12

  const months: MonthData[] = []
  let year = startYear
  let month = startMonth

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month })
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  return months
}
