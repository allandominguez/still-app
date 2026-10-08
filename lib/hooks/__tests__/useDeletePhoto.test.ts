import { act, renderHook } from '@testing-library/react-native'
import { Alert, AlertButton } from 'react-native'
import { useDeletePhoto } from '../useDeletePhoto'

const mockClearPhoto = jest.fn()
const mockDeletePhoto = jest.fn()

jest.mock('../../repositories/day', () => ({
  clearPhoto: (...args: unknown[]) => mockClearPhoto(...args),
}))

jest.mock('../../storage/photoStorage', () => ({
  deletePhoto: (...args: unknown[]) => mockDeletePhoto(...args),
}))

function simulateAlert(choice: 'Cancel' | 'Delete') {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    const btn = (buttons as AlertButton[]).find((b) => b.text === choice)
    btn?.onPress?.()
  })
}

describe('useDeletePhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('prompts for confirmation before deleting anything', async () => {
    const alertSpy = simulateAlert('Cancel')
    const onDeleted = jest.fn()
    const { result } = await renderHook(() =>
      useDeletePhoto('2026-06-08', 'file://documents/photos/2026-06-08.jpg', onDeleted),
    )

    await act(async () => {
      await result.current.confirmAndDelete()
    })

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete this photo?',
      'This cannot be undone.',
      expect.any(Array),
    )
  })

  it('deletes nothing and does not notify when the user cancels', async () => {
    simulateAlert('Cancel')
    const onDeleted = jest.fn()
    const { result } = await renderHook(() =>
      useDeletePhoto('2026-06-08', 'file://documents/photos/2026-06-08.jpg', onDeleted),
    )

    await act(async () => {
      await result.current.confirmAndDelete()
    })

    expect(mockDeletePhoto).not.toHaveBeenCalled()
    expect(mockClearPhoto).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('deletes the photo file and clears the day entry when confirmed', async () => {
    simulateAlert('Delete')
    const onDeleted = jest.fn()
    const { result } = await renderHook(() =>
      useDeletePhoto('2026-06-08', 'file://documents/photos/2026-06-08.jpg', onDeleted),
    )

    await act(async () => {
      await result.current.confirmAndDelete()
    })

    expect(mockDeletePhoto).toHaveBeenCalledWith('file://documents/photos/2026-06-08.jpg')
    expect(mockClearPhoto).toHaveBeenCalledWith('2026-06-08')
  })

  it('notifies via onDeleted once the delete completes', async () => {
    simulateAlert('Delete')
    const onDeleted = jest.fn()
    const { result } = await renderHook(() =>
      useDeletePhoto('2026-06-08', 'file://documents/photos/2026-06-08.jpg', onDeleted),
    )

    await act(async () => {
      await result.current.confirmAndDelete()
    })

    expect(onDeleted).toHaveBeenCalledTimes(1)
  })
})
