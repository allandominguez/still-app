import { act, renderHook } from '@testing-library/react-native'
import { DetailOverlayVisibility, useDetailOverlayVisibility } from '../useDetailOverlayVisibility'

describe('useDetailOverlayVisibility', () => {
  it('starts hidden', async () => {
    const { result } = await renderHook(() => useDetailOverlayVisibility(0))
    expect(result.current.visible).toBe(false)
  })

  it('shows on toggle and hides on toggling again', async () => {
    const { result } = await renderHook(() => useDetailOverlayVisibility(0))

    await act(() => {
      result.current.toggle()
    })
    expect(result.current.visible).toBe(true)

    await act(() => {
      result.current.toggle()
    })
    expect(result.current.visible).toBe(false)
  })

  it('hides immediately when close() is called', async () => {
    const { result } = await renderHook(() => useDetailOverlayVisibility(0))

    await act(() => {
      result.current.toggle()
    })
    expect(result.current.visible).toBe(true)

    await act(() => {
      result.current.close()
    })
    expect(result.current.visible).toBe(false)
  })

  it('closes when the focused page changes', async () => {
    const { result, rerender } = await renderHook<
      DetailOverlayVisibility,
      { focusedIndex: number }
    >(({ focusedIndex }) => useDetailOverlayVisibility(focusedIndex), {
      initialProps: { focusedIndex: 0 },
    })

    await act(() => {
      result.current.toggle()
    })
    expect(result.current.visible).toBe(true)

    await rerender({ focusedIndex: 1 })

    expect(result.current.visible).toBe(false)
  })

  it('does not auto-show when the focused page changes again', async () => {
    const { result, rerender } = await renderHook<
      DetailOverlayVisibility,
      { focusedIndex: number }
    >(({ focusedIndex }) => useDetailOverlayVisibility(focusedIndex), {
      initialProps: { focusedIndex: 0 },
    })

    await rerender({ focusedIndex: 1 })
    await rerender({ focusedIndex: 0 })

    expect(result.current.visible).toBe(false)
  })
})
