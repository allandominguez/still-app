import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { trace } from '../../../lib/logging/trace'
import { DayEntry, getAllDays } from '../../../lib/repositories/day'
import { computeStreaks } from '../streaks'
import { MonthData } from '../types'
import { getLocalDateString, getMonthsUpToNow } from '../utils'

type CalendarData = {
  entriesByDate: Record<string, DayEntry>
  months: MonthData[]
  today: string
  currentStreak: number
  longestStreak: number
  isLoading: boolean
  refresh: () => void
}

export function useCalendarData(): CalendarData {
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [today, setToday] = useState(() => getLocalDateString())
  const [isLoading, setIsLoading] = useState(true)

  // No mount-effect here — the consumer's useFocusEffect already fires on mount; a second
  // concurrent fetch here previously caused a confirmed native NullPointerException on Android.
  const load = useCallback(async () => {
    setToday(getLocalDateString())
    const all = await getAllDays()
    trace('[useCalendarData] load() done', { count: all.length })
    setEntries(all)
    setIsLoading(false)
  }, [])

  // useFocusEffect doesn't fire on background/foreground alone; without this, "today" stays stale overnight.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') load()
    })
    return () => subscription.remove()
  }, [load])

  // Stable identity matters more than the cost: it's the FlatList's extraData, so a new object
  // every render would re-render every mounted cell.
  const entriesByDate = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.date, e])),
    [entries],
  )

  // The one derived value with a real cost (~1 ms per 1,000 entries on a desktop engine), so cache it.
  const { currentStreak, longestStreak } = useMemo(
    () =>
      computeStreaks(
        entries.filter((e) => e.photo_path).map((e) => e.date),
        today,
      ),
    [entries, today],
  )

  const months = useMemo(() => {
    // Show at least 6 months of history; extend further back if the earliest entry predates that.
    const floor = new Date(today + 'T00:00:00.000Z')
    floor.setUTCMonth(floor.getUTCMonth() - 6)
    let startYear = floor.getUTCFullYear()
    let startMonth = floor.getUTCMonth() + 1

    if (entries.length > 0) {
      const earliest = entries[entries.length - 1].date
      const ey = parseInt(earliest.slice(0, 4), 10)
      const em = parseInt(earliest.slice(5, 7), 10)
      if (ey < startYear || (ey === startYear && em < startMonth)) {
        startYear = ey
        startMonth = em
      }
    }

    return getMonthsUpToNow(startYear, startMonth)
  }, [entries, today])

  return { entriesByDate, months, today, currentStreak, longestStreak, isLoading, refresh: load }
}
