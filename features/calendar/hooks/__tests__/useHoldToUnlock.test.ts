import { act, renderHook } from '@testing-library/react-native'
import { useHoldToUnlock } from '../useHoldToUnlock'

describe('useHoldToUnlock', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not unlock before 13 seconds have elapsed', async () => {
    const onUnlock = jest.fn()
    const { result } = await renderHook(() => useHoldToUnlock(onUnlock))

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(12_999))

    expect(onUnlock).not.toHaveBeenCalled()
  })

  it('unlocks after holding for 13 seconds', async () => {
    const onUnlock = jest.fn()
    const { result } = await renderHook(() => useHoldToUnlock(onUnlock))

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(13_000))

    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it('cancels the hold when released before 13 seconds', async () => {
    const onUnlock = jest.fn()
    const { result } = await renderHook(() => useHoldToUnlock(onUnlock))

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(6_000))
    await act(() => result.current.onPressOut())
    await act(() => jest.advanceTimersByTime(10_000))

    expect(onUnlock).not.toHaveBeenCalled()
  })

  it('starts a fresh hold after a cancelled one, rather than resuming', async () => {
    const onUnlock = jest.fn()
    const { result } = await renderHook(() => useHoldToUnlock(onUnlock))

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(10_000))
    await act(() => result.current.onPressOut())

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(10_000))
    expect(onUnlock).not.toHaveBeenCalled()

    await act(() => jest.advanceTimersByTime(3_000))
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })

  it('reports a completed long hold exactly once via consumeLongHold', async () => {
    const onUnlock = jest.fn()
    const { result } = await renderHook(() => useHoldToUnlock(onUnlock))

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(13_000))

    expect(result.current.consumeLongHold()).toBe(true)
    expect(result.current.consumeLongHold()).toBe(false)
  })

  it('reports no completed long hold for a normal short press', async () => {
    const onUnlock = jest.fn()
    const { result } = await renderHook(() => useHoldToUnlock(onUnlock))

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(500))
    await act(() => result.current.onPressOut())

    expect(result.current.consumeLongHold()).toBe(false)
  })

  it('does not fire onUnlock again after the timer is cleared on unmount', async () => {
    const onUnlock = jest.fn()
    const { result, unmount } = await renderHook(() => useHoldToUnlock(onUnlock))

    await act(() => result.current.onPressIn())
    await act(() => jest.advanceTimersByTime(6_000))
    await unmount()
    await act(() => jest.advanceTimersByTime(10_000))

    expect(onUnlock).not.toHaveBeenCalled()
  })
})
