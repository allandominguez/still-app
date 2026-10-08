import { act, renderHook, waitFor } from '@testing-library/react-native'
import { DayEntry } from '../../../../lib/repositories/day'
import { getLocalDateString } from '../../utils'
import { useCalendarData } from '../useCalendarData'

jest.mock('../../../../lib/repositories/day', () => ({
  getAllDays: jest.fn(),
}))

const { getAllDays } = require('../../../../lib/repositories/day') as {
  getAllDays: jest.Mock
}

// The hook no longer fetches on mount by itself — the consumer's useFocusEffect drives
// that — so tests trigger it explicitly, standing in for that external caller.
async function renderAndLoad() {
  const rendered = await renderHook(() => useCalendarData())
  await act(() => {
    rendered.result.current.refresh()
  })
  return rendered
}

function makeEntry(date: string, photoPath: string | null = `/photos/${date}.jpg`): DayEntry {
  return {
    date,
    photo_path: photoPath,
    note_text: null,
    latitude: null,
    longitude: null,
    location_name: null,
    location_source: null,
    created_at: `${date}T12:00:00.000Z`,
    updated_at: `${date}T12:00:00.000Z`,
    accent_color: null,
    share_color: null,
  }
}

describe('useCalendarData', () => {
  beforeEach(() => {
    getAllDays.mockReset()
  })

  it('starts in loading state until refresh is called', async () => {
    getAllDays.mockResolvedValue([])
    const { result } = await renderHook(() => useCalendarData())
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('groups entries by date', async () => {
    getAllDays.mockResolvedValue([makeEntry('2026-07-16'), makeEntry('2026-07-15')])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.entriesByDate['2026-07-16']).toBeDefined()
    expect(result.current.entriesByDate['2026-07-15']).toBeDefined()
  })

  it('exposes today as a YYYY-MM-DD string', async () => {
    getAllDays.mockResolvedValue([])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('extends the month list back to the oldest entry when it predates the 6-month window', async () => {
    // getAllDays returns DESC; oldest is last. 2025-12 is more than 6 months before July 2026.
    getAllDays.mockResolvedValue([makeEntry('2026-07-16'), makeEntry('2025-12-01')])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.months[0]).toEqual({ year: 2025, month: 12 })
  })

  it('shows at least 6 months when there are no entries', async () => {
    getAllDays.mockResolvedValue([])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.months.length).toBeGreaterThanOrEqual(6)
  })

  it('exposes streak counts derived from entries with photos', async () => {
    const today = getLocalDateString()
    getAllDays.mockResolvedValue([makeEntry(today)])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.currentStreak).toBe(1)
    expect(result.current.longestStreak).toBe(1)
  })

  it('returns zero streaks when no entries have photos', async () => {
    getAllDays.mockResolvedValue([makeEntry('2026-07-16', null)])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.currentStreak).toBe(0)
    expect(result.current.longestStreak).toBe(0)
  })

  it('does not call getAllDays until refresh is invoked', async () => {
    getAllDays.mockResolvedValue([])
    await renderHook(() => useCalendarData())
    expect(getAllDays).not.toHaveBeenCalled()
  })

  it('refreshes when the app returns to the foreground after being backgrounded', async () => {
    getAllDays.mockResolvedValue([])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    getAllDays.mockClear()

    const { AppState } = require('react-native')
    const [, onAppStateChange] = AppState.addEventListener.mock.calls.at(-1)

    await act(async () => {
      onAppStateChange('active')
    })

    await waitFor(() => expect(getAllDays).toHaveBeenCalledTimes(1))
  })

  it('does not refresh on background/inactive transitions', async () => {
    getAllDays.mockResolvedValue([])
    const { result } = await renderAndLoad()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    getAllDays.mockClear()

    const { AppState } = require('react-native')
    const [, onAppStateChange] = AppState.addEventListener.mock.calls.at(-1)

    await act(async () => {
      onAppStateChange('background')
    })

    expect(getAllDays).not.toHaveBeenCalled()
  })
})
