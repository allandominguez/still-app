import { act, renderHook } from '@testing-library/react-native'
import { useNoteEditor } from '../useNoteEditor'

const mockUpdateNoteText = jest.fn()

jest.mock('../../../../lib/repositories/day', () => ({
  updateNoteText: (...args: unknown[]) => mockUpdateNoteText(...args),
}))

describe('useNoteEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts with the existing note text', async () => {
    const { result } = await renderHook(() => useNoteEditor('2026-06-08', 'A great day'))
    expect(result.current.value).toBe('A great day')
  })

  it('starts empty when the day has no note yet', async () => {
    const { result } = await renderHook(() => useNoteEditor('2026-06-08', null))
    expect(result.current.value).toBe('')
  })

  it('tracks editing state via focus and blur', async () => {
    const { result } = await renderHook(() => useNoteEditor('2026-06-08', null))

    await act(() => result.current.onFocus())
    expect(result.current.isEditing).toBe(true)

    await act(() => result.current.onBlur())
    expect(result.current.isEditing).toBe(false)
  })

  it('saves automatically after the debounce elapses while typing', async () => {
    const { result } = await renderHook(() => useNoteEditor('2026-06-08', null))

    await act(() => result.current.onChangeText('A great day'))
    expect(mockUpdateNoteText).not.toHaveBeenCalled()

    await act(() => jest.advanceTimersByTime(600))
    expect(mockUpdateNoteText).toHaveBeenCalledWith('2026-06-08', 'A great day')
  })

  it('resets the debounce on each keystroke rather than saving early', async () => {
    const { result } = await renderHook(() => useNoteEditor('2026-06-08', null))

    await act(() => result.current.onChangeText('A'))
    await act(() => jest.advanceTimersByTime(400))
    await act(() => result.current.onChangeText('A great'))
    await act(() => jest.advanceTimersByTime(400))

    expect(mockUpdateNoteText).not.toHaveBeenCalled()

    await act(() => jest.advanceTimersByTime(200))
    expect(mockUpdateNoteText).toHaveBeenCalledWith('2026-06-08', 'A great')
  })

  it('saves immediately on blur without waiting for the debounce', async () => {
    const { result } = await renderHook(() => useNoteEditor('2026-06-08', null))

    await act(() => result.current.onChangeText('A great day'))
    await act(() => result.current.onBlur())

    expect(mockUpdateNoteText).toHaveBeenCalledWith('2026-06-08', 'A great day')
  })

  it('saves null rather than an empty string when the note is cleared', async () => {
    const { result } = await renderHook(() => useNoteEditor('2026-06-08', 'A great day'))

    await act(() => result.current.onChangeText('   '))
    await act(() => result.current.onBlur())

    expect(mockUpdateNoteText).toHaveBeenCalledWith('2026-06-08', null)
  })

  it('flushes a pending debounced save on unmount', async () => {
    const { result, unmount } = await renderHook(() => useNoteEditor('2026-06-08', null))

    await act(() => result.current.onChangeText('A great day'))
    await unmount()

    expect(mockUpdateNoteText).toHaveBeenCalledWith('2026-06-08', 'A great day')
  })

  it('does not save again on unmount when there is nothing pending', async () => {
    const { result, unmount } = await renderHook(() => useNoteEditor('2026-06-08', null))

    await act(() => result.current.onChangeText('A great day'))
    await act(() => jest.advanceTimersByTime(600))
    mockUpdateNoteText.mockClear()

    await unmount()

    expect(mockUpdateNoteText).not.toHaveBeenCalled()
  })
})
