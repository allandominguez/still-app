import { useCallback, useEffect, useState } from 'react'
import { trace } from '../../../lib/logging/trace'
import { DayEntry, getAllDays } from '../../../lib/repositories/day'

export type DayDetailFeed = {
  entries: DayEntry[]
  initialIndex: number
  isLoading: boolean
  error: boolean
  retry: () => void
}

export function useDayDetailFeed(initialDate: string): DayDetailFeed {
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(false)

    trace('[useDayDetailFeed] fetching all days', { initialDate })
    getAllDays()
      .then((all) => {
        if (cancelled) return
        const withPhotos = all
          .filter((entry) => entry.photo_path)
          .sort((a, b) => a.date.localeCompare(b.date))
        trace('[useDayDetailFeed] fetched', {
          initialDate,
          count: withPhotos.length,
        })
        setEntries(withPhotos)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        trace('[useDayDetailFeed] fetch failed', { initialDate, error: String(err) })
        setError(true)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const resolvedIndex = entries.findIndex((entry) => entry.date === initialDate)
  const initialIndex = resolvedIndex === -1 ? 0 : resolvedIndex

  return { entries, initialIndex, isLoading, error, retry }
}
