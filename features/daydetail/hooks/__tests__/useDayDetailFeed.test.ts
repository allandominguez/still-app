import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useDayDetailFeed } from '../useDayDetailFeed'

const mockGetAllDays = jest.fn()

jest.mock('../../../../lib/repositories/day', () => ({
  getAllDays: (...args: unknown[]) => mockGetAllDays(...args),
}))

describe('useDayDetailFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('includes only days that have a photo', async () => {
    mockGetAllDays.mockResolvedValue([
      { date: '2026-06-08', photo_path: '/a.jpg' },
      { date: '2026-06-07', photo_path: null },
      { date: '2026-06-06', photo_path: '/c.jpg' },
    ])

    const { result } = renderHook(() => useDayDetailFeed('2026-06-08'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.entries.map((e) => e.date)).toEqual(['2026-06-06', '2026-06-08'])
  })

  it('orders entries chronologically, oldest first', async () => {
    mockGetAllDays.mockResolvedValue([
      { date: '2026-06-08', photo_path: '/a.jpg' },
      { date: '2026-06-06', photo_path: '/b.jpg' },
      { date: '2026-06-07', photo_path: '/c.jpg' },
    ])

    const { result } = renderHook(() => useDayDetailFeed('2026-06-06'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.entries.map((e) => e.date)).toEqual([
      '2026-06-06',
      '2026-06-07',
      '2026-06-08',
    ])
  })

  it('resolves the initial index to the tapped date', async () => {
    mockGetAllDays.mockResolvedValue([
      { date: '2026-06-06', photo_path: '/a.jpg' },
      { date: '2026-06-07', photo_path: '/b.jpg' },
      { date: '2026-06-08', photo_path: '/c.jpg' },
    ])

    const { result } = renderHook(() => useDayDetailFeed('2026-06-07'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.initialIndex).toBe(1)
  })

  it('falls back to the first entry when the tapped date is not in the feed', async () => {
    mockGetAllDays.mockResolvedValue([{ date: '2026-06-06', photo_path: '/a.jpg' }])

    const { result } = renderHook(() => useDayDetailFeed('2026-01-01'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.initialIndex).toBe(0)
  })

  it('surfaces an error instead of hanging when the fetch rejects', async () => {
    mockGetAllDays.mockRejectedValue(new Error('SQLITE_BUSY'))

    const { result } = renderHook(() => useDayDetailFeed('2026-06-08'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe(true)
    expect(result.current.entries).toEqual([])
  })

  it('clears the error and refetches when retry is called', async () => {
    mockGetAllDays.mockRejectedValueOnce(new Error('SQLITE_BUSY'))
    mockGetAllDays.mockResolvedValueOnce([{ date: '2026-06-08', photo_path: '/a.jpg' }])

    const { result } = renderHook(() => useDayDetailFeed('2026-06-08'))
    await waitFor(() => expect(result.current.error).toBe(true))

    act(() => result.current.retry())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe(false)
    expect(result.current.entries.map((e) => e.date)).toEqual(['2026-06-08'])
  })
})
