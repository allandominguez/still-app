import { ComponentProps } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Alert, AlertButton } from 'react-native'
import { DayEntry } from '../../../../lib/repositories/day'
import { DayDetailPage } from '../DayDetailPage'

// PageBlur wraps expo-blur's native BlurView and Animated internals, which
// aren't meaningfully assertable here — mock it to expose the `visible` prop
// DayDetailPage passes in, so the reveal/blur wiring itself can be tested.
jest.mock('../PageBlur', () => {
  const { Text } = require('react-native')
  return {
    PageBlur: ({ visible }: { visible: boolean }) => <Text>{String(visible)}</Text>,
  }
})

const mockUpdateNoteText = jest.fn()
const mockClearPhoto = jest.fn()

jest.mock('../../../../lib/repositories/day', () => ({
  updateNoteText: (...args: unknown[]) => mockUpdateNoteText(...args),
  clearPhoto: (...args: unknown[]) => mockClearPhoto(...args),
}))

const mockDeletePhoto = jest.fn()

jest.mock('../../../../lib/storage/photoStorage', () => ({
  deletePhoto: (...args: unknown[]) => mockDeletePhoto(...args),
}))

const mockTrace = jest.fn()

jest.mock('../../../../lib/logging/trace', () => ({
  trace: (...args: unknown[]) => mockTrace(...args),
}))

function simulateAlert(choice: 'Cancel' | 'Delete') {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    const btn = (buttons as AlertButton[]).find((b) => b.text === choice)
    btn?.onPress?.()
  })
}

function makeEntry(overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    date: '2026-06-08',
    photo_path: '/photos/2026-06-08.jpg',
    note_text: null,
    latitude: null,
    longitude: null,
    location_name: null,
    location_source: null,
    created_at: '2026-06-08T00:00:00.000Z',
    updated_at: '2026-06-08T00:00:00.000Z',
    accent_color: null,
    share_color: null,
    ...overrides,
  }
}

type Props = ComponentProps<typeof DayDetailPage>

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    entry: makeEntry(),
    isFocused: true,
    height: 400,
    dateOverlayVisible: false,
    dismissDateOverlay: jest.fn(),
    detailOverlayVisible: false,
    toggleDetailOverlay: jest.fn(),
    onPhotoDeleted: jest.fn(),
    ...overrides,
  }
}

describe('DayDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows the photo for the entry', async () => {
    await render(<DayDetailPage {...makeProps()} />)
    expect(screen.getByLabelText('Photo from Monday, 8 June 2026')).toBeTruthy()
  })

  it('traces a failed image load, for diagnosing the intermittent black-screen report', async () => {
    await render(<DayDetailPage {...makeProps({ entry: makeEntry({ date: '2026-06-08' }) })} />)

    await fireEvent(screen.getByLabelText('Photo from Monday, 8 June 2026'), 'error')

    expect(mockTrace).toHaveBeenCalledWith('[DayDetailPage] image failed to load', {
      date: '2026-06-08',
    })
  })

  it('shows the date overlay when focused and the date overlay is visible', async () => {
    await render(<DayDetailPage {...makeProps({ dateOverlayVisible: true })} />)
    expect(screen.getByText('8\nMon')).toBeTruthy()
  })

  it('does not show the date overlay when not focused, even if marked visible', async () => {
    await render(<DayDetailPage {...makeProps({ isFocused: false, dateOverlayVisible: true })} />)
    expect(screen.queryByText('8\nMon')).toBeNull()
  })

  it('dismisses the date overlay when tapped while it is showing', async () => {
    const dismissDateOverlay = jest.fn()
    const toggleDetailOverlay = jest.fn()
    await render(
      <DayDetailPage
        {...makeProps({ dateOverlayVisible: true, dismissDateOverlay, toggleDetailOverlay })}
      />,
    )

    await fireEvent.press(screen.getByLabelText('Dismiss date label'))

    expect(dismissDateOverlay).toHaveBeenCalledTimes(1)
    expect(toggleDetailOverlay).not.toHaveBeenCalled()
  })

  it('toggles day details when tapped once the date overlay has cleared', async () => {
    const toggleDetailOverlay = jest.fn()
    await render(
      <DayDetailPage {...makeProps({ dateOverlayVisible: false, toggleDetailOverlay })} />,
    )

    await fireEvent.press(screen.getByLabelText('Show day details'))

    expect(toggleDetailOverlay).toHaveBeenCalledTimes(1)
  })

  it('shows day details overlay when focused and detailOverlayVisible is true', async () => {
    await render(
      <DayDetailPage
        {...makeProps({
          entry: makeEntry({ location_name: 'Mission District' }),
          detailOverlayVisible: true,
        })}
      />,
    )
    expect(screen.getByText('Mission District')).toBeTruthy()
  })

  it('does not show day details overlay when not focused, even if marked visible', async () => {
    await render(
      <DayDetailPage
        {...makeProps({
          entry: makeEntry({ location_name: 'Mission District' }),
          isFocused: false,
          detailOverlayVisible: true,
        })}
      />,
    )
    expect(screen.queryByText('Mission District')).toBeNull()
  })

  it('does not respond to taps when not focused', async () => {
    const dismissDateOverlay = jest.fn()
    const toggleDetailOverlay = jest.fn()
    await render(
      <DayDetailPage
        {...makeProps({ isFocused: false, dismissDateOverlay, toggleDetailOverlay })}
      />,
    )

    await fireEvent.press(screen.getByRole('button'))

    expect(dismissDateOverlay).not.toHaveBeenCalled()
    expect(toggleDetailOverlay).not.toHaveBeenCalled()
  })

  it('blurs the photo when not focused', async () => {
    await render(<DayDetailPage {...makeProps({ isFocused: false })} />)
    expect(screen.getByText('true')).toBeTruthy()
  })

  it('blurs the photo while the date overlay is still showing', async () => {
    await render(<DayDetailPage {...makeProps({ dateOverlayVisible: true })} />)
    expect(screen.getByText('true')).toBeTruthy()
  })

  it('reveals the photo once the date overlay has cleared', async () => {
    await render(<DayDetailPage {...makeProps({ dateOverlayVisible: false })} />)
    expect(screen.getByText('false')).toBeTruthy()
  })

  async function renderWithDetailsOpen(overrides: Partial<Props> = {}) {
    return render(<DayDetailPage {...makeProps({ detailOverlayVisible: true, ...overrides })} />)
  }

  it('saves the note after the debounce elapses while typing', async () => {
    await renderWithDetailsOpen({ entry: makeEntry({ date: '2026-06-08' }) })

    await fireEvent.changeText(screen.getByLabelText('Note for this day'), 'A great day')
    await act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(mockUpdateNoteText).toHaveBeenCalledWith('2026-06-08', 'A great day')
  })

  it('consumes the tap immediately following a note blur, without toggling day details', async () => {
    const toggleDetailOverlay = jest.fn()
    await renderWithDetailsOpen({ toggleDetailOverlay })

    await fireEvent(screen.getByLabelText('Note for this day'), 'blur')
    await fireEvent.press(screen.getByLabelText('Hide day details'))

    expect(toggleDetailOverlay).not.toHaveBeenCalled()
  })

  it('toggles day details normally once the post-blur tap has settled', async () => {
    const toggleDetailOverlay = jest.fn()
    await renderWithDetailsOpen({ toggleDetailOverlay })

    await fireEvent(screen.getByLabelText('Note for this day'), 'blur')
    await act(() => {
      jest.advanceTimersByTime(1)
    })
    await fireEvent.press(screen.getByLabelText('Hide day details'))

    expect(toggleDetailOverlay).toHaveBeenCalledTimes(1)
  })

  it('prompts for confirmation and leaves the photo untouched when deletion is cancelled', async () => {
    simulateAlert('Cancel')
    const onPhotoDeleted = jest.fn()
    await renderWithDetailsOpen({ entry: makeEntry({ date: '2026-06-08' }), onPhotoDeleted })

    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Delete photo'))
    })

    expect(mockDeletePhoto).not.toHaveBeenCalled()
    expect(mockClearPhoto).not.toHaveBeenCalled()
    expect(onPhotoDeleted).not.toHaveBeenCalled()
  })

  it('deletes the photo and notifies the caller once deletion is confirmed', async () => {
    simulateAlert('Delete')
    const onPhotoDeleted = jest.fn()
    await renderWithDetailsOpen({
      entry: makeEntry({ date: '2026-06-08', photo_path: '/photos/2026-06-08.jpg' }),
      onPhotoDeleted,
    })

    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Delete photo'))
    })

    expect(mockDeletePhoto).toHaveBeenCalledWith('/photos/2026-06-08.jpg')
    expect(mockClearPhoto).toHaveBeenCalledWith('2026-06-08')
    expect(onPhotoDeleted).toHaveBeenCalledTimes(1)
  })
})
