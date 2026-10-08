import { act, renderHook } from '@testing-library/react-native'
import { DateOverlayVisibility, useDateOverlayVisibility } from '../useDateOverlayVisibility'

describe('useDateOverlayVisibility', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is visible for the newly-focused page', async () => {
    const { result } = await renderHook(() => useDateOverlayVisibility(0))
    expect(result.current.visible).toBe(true)
  })

  it('stays visible through the fade-in and hold duration', async () => {
    const { result } = await renderHook(() => useDateOverlayVisibility(0))

    await act(() => {
      jest.advanceTimersByTime(1699)
    })

    expect(result.current.visible).toBe(true)
  })

  it('auto-dismisses once the fade-in and hold duration elapse', async () => {
    const { result } = await renderHook(() => useDateOverlayVisibility(0))

    await act(() => {
      jest.advanceTimersByTime(1700)
    })

    expect(result.current.visible).toBe(false)
  })

  it('dismisses immediately when dismiss() is called before the hold elapses', async () => {
    const { result } = await renderHook(() => useDateOverlayVisibility(0))

    await act(() => {
      result.current.dismiss()
    })

    expect(result.current.visible).toBe(false)
  })

  it('becomes visible again when the focused page changes', async () => {
    const { result, rerender } = await renderHook<DateOverlayVisibility, { focusedIndex: number }>(
      ({ focusedIndex }) => useDateOverlayVisibility(focusedIndex),
      { initialProps: { focusedIndex: 0 } },
    )

    await act(() => {
      result.current.dismiss()
    })
    expect(result.current.visible).toBe(false)

    await rerender({ focusedIndex: 1 })

    expect(result.current.visible).toBe(true)
  })
})
