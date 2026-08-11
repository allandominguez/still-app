import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { RootStackParamList } from '../../../../navigation/types'
import { DayDetailScreen } from '../DayDetailScreen'

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
)

const mockGetAllDays = jest.fn()

jest.mock('../../../../lib/repositories/day', () => ({
  getAllDays: () => mockGetAllDays(),
}))

// DayDetailPage's own rendering and delete-confirmation flow are covered in
// its own test file — here we only need to verify the onPhotoDeleted prop is
// wired to navigation, so it's stubbed down to a button that invokes it.
jest.mock('../DayDetailPage', () => {
  const { Pressable, Text } = require('react-native')
  return {
    DayDetailPage: ({ onPhotoDeleted }: { onPhotoDeleted: () => void }) => (
      <Pressable accessibilityLabel="Simulate photo deleted" onPress={onPhotoDeleted}>
        <Text>page</Text>
      </Pressable>
    ),
  }
})

type Props = NativeStackScreenProps<RootStackParamList, 'DayDetail'>

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    navigation: { goBack: jest.fn() } as unknown as Props['navigation'],
    route: { key: 'DayDetail', name: 'DayDetail', params: { date: '2026-06-08' } },
    ...overrides,
  }
}

describe('DayDetailScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockGetAllDays.mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  async function renderScreen(overrides: Partial<Props> = {}) {
    const result = render(<DayDetailScreen {...makeProps(overrides)} />)
    // Flush the getAllDays() microtask so no state update lands after the test ends.
    await act(async () => {
      await Promise.resolve()
    })
    return result
  }

  it('hides the close control while the date overlay is showing', async () => {
    await renderScreen()
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it('shows the close control once the date overlay clears', async () => {
    await renderScreen()

    act(() => {
      jest.advanceTimersByTime(1700)
    })

    expect(screen.getByLabelText('Back')).toBeTruthy()
  })

  it('exits to the calendar when the close control is tapped', async () => {
    const goBack = jest.fn()
    await renderScreen({ navigation: { goBack } as unknown as Props['navigation'] })

    act(() => {
      jest.advanceTimersByTime(1700)
    })
    fireEvent.press(screen.getByLabelText('Back'))

    expect(goBack).toHaveBeenCalledTimes(1)
  })

  it('navigates back to the calendar once a photo delete completes', async () => {
    mockGetAllDays.mockResolvedValue([{ date: '2026-06-08', photo_path: '/photos/2026-06-08.jpg' }])
    const goBack = jest.fn()
    const { getByTestId } = await renderScreen({
      navigation: { goBack } as unknown as Props['navigation'],
    })

    fireEvent(getByTestId('day-detail-container'), 'layout', {
      nativeEvent: { layout: { height: 800 } },
    })
    fireEvent.press(screen.getByLabelText('Simulate photo deleted'))

    expect(goBack).toHaveBeenCalledTimes(1)
  })

  it('shows a retry option instead of a blank screen when loading the day fails', async () => {
    mockGetAllDays.mockRejectedValue(new Error('SQLITE_BUSY'))

    await renderScreen()

    expect(screen.getByText('Something went wrong loading this day.')).toBeTruthy()
    expect(screen.getByLabelText('Retry loading day')).toBeTruthy()
  })

  it('reloads the day after tapping retry following a failed load', async () => {
    mockGetAllDays.mockRejectedValueOnce(new Error('SQLITE_BUSY'))
    mockGetAllDays.mockResolvedValueOnce([
      { date: '2026-06-08', photo_path: '/photos/2026-06-08.jpg' },
    ])

    await renderScreen()
    expect(screen.getByLabelText('Retry loading day')).toBeTruthy()

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Retry loading day'))
      await Promise.resolve()
    })

    expect(screen.queryByLabelText('Retry loading day')).toBeNull()
  })
})
