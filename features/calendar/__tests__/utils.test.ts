import { DayEntry } from '../../../lib/repositories/day'
import { MonthData } from '../types'
import {
  buildMonthCells,
  getLocalDateString,
  getMonthsUpToNow,
  isHorizontalSwipe,
  monthSwipeTarget,
  yearSwipeTarget,
} from '../utils'

const noEntries: Record<string, DayEntry> = {}

function makeEntry(date: string, accentColor: string | null = null): DayEntry {
  return {
    date,
    photo_path: `/photos/${date}.jpg`,
    note_text: null,
    latitude: null,
    longitude: null,
    location_name: null,
    location_source: null,
    created_at: `${date}T12:00:00.000Z`,
    updated_at: `${date}T12:00:00.000Z`,
    accent_color: accentColor,
    share_color: null,
  }
}

describe('getLocalDateString', () => {
  it('formats a Date using its own local year/month/day, zero-padded', () => {
    const date = new Date(2026, 6, 5) // local: 5 July 2026
    expect(getLocalDateString(date)).toBe('2026-07-05')
  })

  it('uses the local calendar date even when it differs from the UTC calendar date', () => {
    // A stand-in for a real Date just after local midnight in a timezone ahead of UTC —
    // local and UTC fields deliberately disagree, mirroring the original bug: the old
    // toISOString()-based implementation read the UTC field below, a day behind the real
    // local day. Using a stand-in rather than a real Date + a real IANA timezone keeps this
    // deterministic — it doesn't depend on the host/CI machine's tzdata or DST rules.
    const divergentDate = {
      getFullYear: () => 2026,
      getMonth: () => 6, // local: July
      getDate: () => 16, // local day has already rolled over
      getUTCFullYear: () => 2026,
      getUTCMonth: () => 6,
      getUTCDate: () => 15, // UTC day hasn't rolled over yet
    } as unknown as Date

    expect(getLocalDateString(divergentDate)).toBe('2026-07-16')
  })
})

describe('buildMonthCells', () => {
  it('produces 2 leading empty cells for a month starting on Wednesday', () => {
    // July 2026: 1st is a Wednesday → 2 leading empty cells (Mon, Tue)
    const cells = buildMonthCells(2026, 7, noEntries, '2026-07-16')
    expect(cells[0].date).toBeNull()
    expect(cells[1].date).toBeNull()
    expect(cells[2].date).toBe('2026-07-01')
    expect(cells[2].dayNumber).toBe(1)
  })

  it('produces zero leading empty cells for a month starting on Monday', () => {
    // June 2026: 1st is a Monday → no leading empties
    const cells = buildMonthCells(2026, 6, noEntries, '2026-06-01')
    expect(cells[0].date).toBe('2026-06-01')
    expect(cells[0].dayNumber).toBe(1)
  })

  it('generates one cell per day in the month', () => {
    // July has 31 days
    const cells = buildMonthCells(2026, 7, noEntries, '2026-07-16')
    const dayCells = cells.filter((c) => c.date !== null)
    expect(dayCells).toHaveLength(31)
  })

  it('marks only today as isToday', () => {
    const cells = buildMonthCells(2026, 7, noEntries, '2026-07-16')
    const today = cells.find((c) => c.date === '2026-07-16')
    const other = cells.find((c) => c.date === '2026-07-15')
    expect(today?.isToday).toBe(true)
    expect(other?.isToday).toBe(false)
  })

  it('sets hasPhoto and accentColor from the entries map', () => {
    const entries: Record<string, DayEntry> = {
      '2026-07-10': makeEntry('2026-07-10', '#4A90E2'),
    }
    const cells = buildMonthCells(2026, 7, entries, '2026-07-16')
    const day10 = cells.find((c) => c.date === '2026-07-10')
    expect(day10?.hasPhoto).toBe(true)
    expect(day10?.accentColor).toBe('#4A90E2')
  })

  it('marks days after today as future and days on or before today as not future', () => {
    const cells = buildMonthCells(2026, 7, noEntries, '2026-07-16')
    expect(cells.find((c) => c.date === '2026-07-17')?.isFuture).toBe(true)
    expect(cells.find((c) => c.date === '2026-07-16')?.isFuture).toBe(false)
    expect(cells.find((c) => c.date === '2026-07-15')?.isFuture).toBe(false)
  })

  it('marks days without entries as having no photo', () => {
    const cells = buildMonthCells(2026, 7, noEntries, '2026-07-16')
    const day11 = cells.find((c) => c.date === '2026-07-11')
    expect(day11?.hasPhoto).toBe(false)
    expect(day11?.accentColor).toBeNull()
  })

  it('falls back to textTertiary colour for a photo day with no accent_color', () => {
    const entry = makeEntry('2026-07-10')
    entry.accent_color = null
    const cells = buildMonthCells(2026, 7, { '2026-07-10': entry }, '2026-07-16')
    const day10 = cells.find((c) => c.date === '2026-07-10')
    // hasPhoto is still true; accentColor is null — DayCell handles the fallback colour
    expect(day10?.hasPhoto).toBe(true)
    expect(day10?.accentColor).toBeNull()
  })
})

describe('isHorizontalSwipe', () => {
  it('treats a swipe further right than up or down as horizontal', () => {
    expect(isHorizontalSwipe(50, 5)).toBe(true)
  })

  it('treats a swipe with more vertical than horizontal movement as not horizontal', () => {
    expect(isHorizontalSwipe(20, 30)).toBe(false)
  })

  it('ignores a small movement that does not clear the horizontal-distance floor', () => {
    expect(isHorizontalSwipe(5, 0)).toBe(false)
  })
})

describe('monthSwipeTarget', () => {
  it('advances to the next month index when swiping right past the threshold', () => {
    expect(monthSwipeTarget(50, 3, 6)).toBe(4)
  })

  it('goes back to the previous month index when swiping left past the threshold', () => {
    expect(monthSwipeTarget(-50, 3, 6)).toBe(2)
  })

  it('does nothing when the swipe does not clear the threshold', () => {
    expect(monthSwipeTarget(10, 3, 6)).toBeNull()
  })

  it('does nothing when swiping toward the future on the newest month', () => {
    expect(monthSwipeTarget(50, 5, 6)).toBeNull()
  })

  it('does nothing when swiping toward the past on the oldest month', () => {
    expect(monthSwipeTarget(-50, 0, 6)).toBeNull()
  })
})

describe('yearSwipeTarget', () => {
  const months: MonthData[] = [
    { year: 2025, month: 7 },
    { year: 2026, month: 6 },
    { year: 2026, month: 7 },
  ]

  it('jumps to the same month one year ahead when swiping right past the threshold', () => {
    expect(yearSwipeTarget(50, { year: 2025, month: 7 }, months)).toBe(2)
  })

  it('jumps to the same month one year behind when swiping left past the threshold', () => {
    expect(yearSwipeTarget(-50, { year: 2026, month: 7 }, months)).toBe(0)
  })

  it('does nothing when the target year does not have that month displayed', () => {
    expect(yearSwipeTarget(-50, { year: 2026, month: 6 }, months)).toBeNull()
  })

  it('does nothing when the swipe does not clear the threshold', () => {
    expect(yearSwipeTarget(10, { year: 2026, month: 7 }, months)).toBeNull()
  })
})

describe('getMonthsUpToNow', () => {
  it('returns months from start to the given date inclusive', () => {
    const months = getMonthsUpToNow(2026, 6, new Date(2026, 6, 16)) // July 2026
    expect(months).toHaveLength(2)
    expect(months[0]).toEqual({ year: 2026, month: 6 })
    expect(months[1]).toEqual({ year: 2026, month: 7 })
  })

  it('returns a single entry when start equals now', () => {
    const months = getMonthsUpToNow(2026, 7, new Date(2026, 6, 16))
    expect(months).toHaveLength(1)
    expect(months[0]).toEqual({ year: 2026, month: 7 })
  })

  it('crosses year boundaries correctly', () => {
    const months = getMonthsUpToNow(2025, 11, new Date(2026, 6, 16))
    expect(months).toHaveLength(9) // Nov, Dec 2025 + Jan–Jul 2026
    expect(months[0]).toEqual({ year: 2025, month: 11 })
    expect(months[8]).toEqual({ year: 2026, month: 7 })
  })
})
