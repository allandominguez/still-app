import { fireEvent, render, screen } from '@testing-library/react-native'
import { Alert, AlertButton } from 'react-native'
import { DayActionMenu } from '../DayActionMenu'

const mockClearPhoto = jest.fn()
const mockDeletePhoto = jest.fn()

jest.mock('../../../../lib/repositories/day', () => ({
  clearPhoto: (...args: unknown[]) => mockClearPhoto(...args),
}))

jest.mock('../../../../lib/storage/photoStorage', () => ({
  deletePhoto: (...args: unknown[]) => mockDeletePhoto(...args),
}))

function simulateAlert(choice: 'Cancel' | 'Delete') {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    const btn = (buttons as AlertButton[]).find((b) => b.text === choice)
    btn?.onPress?.()
  })
}

describe('DayActionMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('names the day being acted on', async () => {
    await render(
      <DayActionMenu
        date="2026-07-14"
        photoPath="/photos/2026-07-14.jpg"
        onClose={jest.fn()}
        onDeleted={jest.fn()}
      />,
    )

    expect(screen.getByText('Tuesday, 14 July 2026')).toBeTruthy()
  })

  it('dismisses when the backdrop is pressed', async () => {
    const onClose = jest.fn()
    await render(
      <DayActionMenu
        date="2026-07-14"
        photoPath="/photos/2026-07-14.jpg"
        onClose={onClose}
        onDeleted={jest.fn()}
      />,
    )

    await fireEvent.press(screen.getByLabelText('Dismiss'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves the photo untouched when deletion is cancelled', async () => {
    simulateAlert('Cancel')
    const onClose = jest.fn()
    const onDeleted = jest.fn()
    await render(
      <DayActionMenu
        date="2026-07-14"
        photoPath="/photos/2026-07-14.jpg"
        onClose={onClose}
        onDeleted={onDeleted}
      />,
    )

    await fireEvent.press(screen.getByLabelText('Delete photo'))

    expect(mockDeletePhoto).not.toHaveBeenCalled()
    expect(mockClearPhoto).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('deletes the photo and notifies the caller once deletion is confirmed', async () => {
    simulateAlert('Delete')
    const onClose = jest.fn()
    const onDeleted = jest.fn()
    await render(
      <DayActionMenu
        date="2026-07-14"
        photoPath="/photos/2026-07-14.jpg"
        onClose={onClose}
        onDeleted={onDeleted}
      />,
    )

    await fireEvent.press(screen.getByLabelText('Delete photo'))

    expect(mockDeletePhoto).toHaveBeenCalledWith('/photos/2026-07-14.jpg')
    expect(mockClearPhoto).toHaveBeenCalledWith('2026-07-14')
    expect(onDeleted).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
