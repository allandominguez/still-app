import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Alert, AlertButton } from 'react-native'
import { DayEntry } from '../../../../lib/repositories/day'
import { RootStackParamList } from '../../../../navigation/types'
import { CalendarScreen } from '../CalendarScreen'

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
)

// useFocusEffect needs a real Navigator/Screen context to resolve navigation —
// unnecessary infrastructure here. It's now the sole trigger for the initial load
// (useCalendarData no longer fetches on mount by itself, to avoid racing this same
// fetch against itself), so the mock runs the callback via a real effect rather than
// a no-op, standing in for React Navigation's own focus-triggered invocation.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}))

let mockStore: DayEntry[] = []
const mockGetAllDays = jest.fn(() => Promise.resolve(mockStore))
const mockGetDay = jest.fn()
const mockUpsertDayPhoto = jest.fn()
const mockClearPhoto = jest.fn(async (date: string) => {
  mockStore = mockStore.map((e) =>
    e.date === date
      ? {
          ...e,
          photo_path: null,
          latitude: null,
          longitude: null,
          location_name: null,
          location_source: null,
          accent_color: null,
          share_color: null,
        }
      : e,
  )
})
const mockRequestCameraPermission = jest.fn()
const mockRequestMediaLibraryPermission = jest.fn()
const mockLaunchCameraAsync = jest.fn()
const mockLaunchImageLibraryAsync = jest.fn()
const mockSavePhoto = jest.fn()
const mockDeletePhoto = jest.fn()

jest.mock('../../../../lib/repositories/day', () => ({
  getAllDays: () => mockGetAllDays(),
  getDay: (...args: unknown[]) => mockGetDay(...args),
  upsertDayPhoto: (...args: unknown[]) => mockUpsertDayPhoto(...args),
  clearPhoto: (...args: [string]) => mockClearPhoto(...args),
}))

jest.mock('../../../capture/hooks/useCapturePermissions', () => ({
  useCapturePermissions: () => ({
    requestCameraPermission: mockRequestCameraPermission,
    requestMediaLibraryPermission: mockRequestMediaLibraryPermission,
  }),
}))

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  useCameraPermissions: () => [null, jest.fn()],
  useMediaLibraryPermissions: () => [null, jest.fn()],
}))

jest.mock('../../../../lib/storage/photoStorage', () => ({
  savePhoto: (...args: unknown[]) => mockSavePhoto(...args),
  deletePhoto: (...args: unknown[]) => mockDeletePhoto(...args),
}))

jest.mock('../../../../lib/location/exifGps', () => ({
  extractGpsFromExif: jest.fn(),
}))

jest.mock('../../../../lib/location/deviceLocation', () => ({
  getDeviceLocation: jest.fn(),
}))

jest.mock('../../../../lib/location/reverseGeocode', () => ({
  reverseGeocode: jest.fn(),
}))

function simulateAlert(choice: 'Cancel' | 'Delete' | 'Replace') {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    const btn = (buttons as AlertButton[]).find((b) => b.text === choice)
    btn?.onPress?.()
  })
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

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>

function makeProps(overrides: Partial<Props> = {}): Props {
  return {
    navigation: { navigate: jest.fn() } as unknown as Props['navigation'],
    route: { key: 'Calendar', name: 'Calendar', params: undefined },
    ...overrides,
  } as Props
}

async function renderScreen(overrides: Partial<Props> = {}) {
  const props = makeProps(overrides)
  const result = render(<CalendarScreen {...props} />)
  // Flush the getAllDays() load and let useFocusEffect settle.
  await act(async () => {
    await Promise.resolve()
  })
  // The FlatList only renders once the container reports a real layout height.
  fireEvent(screen.getByTestId('calendar-list-container'), 'layout', {
    nativeEvent: { layout: { height: 800, width: 400 } },
  })
  return { ...result, navigation: props.navigation }
}

// Pressing an empty cell calls the async useCapture.openSheet, which awaits
// getDay before showing the sheet — flush that microtask before asserting.
async function pressCell(label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label))
    await Promise.resolve()
  })
}

// Chains nesting several awaits deep (gallery/save/geocode, confirm/clear-photo)
// flush repeatedly rather than track the exact microtask count, which would be brittle.
async function press(label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label))
    for (let i = 0; i < 10; i++) {
      await Promise.resolve()
    }
  })
}

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-07-22T12:00:00.000Z'))
    mockStore = []
    mockGetDay.mockResolvedValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('capture flow', () => {
    it('navigates to day detail when a day with a photo is pressed', async () => {
      mockStore = [makeEntry('2026-07-20')]
      const { navigation } = await renderScreen()

      fireEvent.press(screen.getByLabelText('20, has photo'))

      expect(navigation.navigate).toHaveBeenCalledWith('DayDetail', { date: '2026-07-20' })
    })

    it("opens the capture sheet with the camera option for today's empty cell", async () => {
      await renderScreen()

      await pressCell('22, add photo')

      expect(screen.getByText("Add today's photo")).toBeTruthy()
      expect(screen.getByLabelText('Take photo')).toBeTruthy()
    })

    it('opens the capture sheet without the camera option for a past empty day', async () => {
      await renderScreen()

      await pressCell('21, add photo')

      expect(screen.getByText('Add photo for this day')).toBeTruthy()
      expect(screen.queryByLabelText('Take photo')).toBeNull()
    })

    it('saves a photo picked for a past day to that date, not today', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/photo.jpg', exif: undefined }],
      })
      mockSavePhoto.mockResolvedValue('file://documents/photos/backfill.jpg')
      await renderScreen()

      await pressCell('21, add photo')
      await press('Choose from gallery')
      await press('Use photo')

      expect(mockUpsertDayPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2026-07-21',
          photo_path: 'file://documents/photos/backfill.jpg',
        }),
      )
    })

    it('lands on the day detail view for the date just captured', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/photo.jpg', exif: undefined }],
      })
      mockSavePhoto.mockResolvedValue('file://documents/photos/backfill.jpg')
      const { navigation } = await renderScreen()

      await pressCell('21, add photo')
      await press('Choose from gallery')
      await press('Use photo')

      expect(navigation.navigate).toHaveBeenCalledWith('DayDetail', { date: '2026-07-21' })
    })

    it('shows a saving indicator while a camera-captured photo is being saved', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://camera-temp.jpg', exif: undefined }],
      })
      let resolveSave!: (path: string) => void
      mockSavePhoto.mockReturnValue(new Promise<string>((res) => (resolveSave = res)))
      await renderScreen()

      await pressCell('22, add photo')
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Take photo'))
        for (let i = 0; i < 5; i++) await Promise.resolve()
      })

      expect(screen.getByLabelText('Saving photo')).toBeTruthy()

      await act(async () => resolveSave('file://documents/photos/999.jpg'))

      expect(screen.queryByLabelText('Saving photo')).toBeNull()
    })

    it('keeps the photo preview open instead of the saving overlay while a gallery pick is being saved', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/photo.jpg', exif: undefined }],
      })
      let resolveSave!: (path: string) => void
      mockSavePhoto.mockReturnValue(new Promise<string>((res) => (resolveSave = res)))
      await renderScreen()

      await pressCell('21, add photo')
      await press('Choose from gallery')
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Use photo'))
        for (let i = 0; i < 5; i++) await Promise.resolve()
      })

      expect(screen.getByText('Saving…')).toBeTruthy()
      expect(screen.queryByLabelText('Saving photo')).toBeNull()

      await act(async () => resolveSave('file://documents/photos/456.jpg'))
    })

    it('shows a permission alert when photo access is blocked', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('blocked')
      const alertSpy = jest.spyOn(Alert, 'alert')
      await renderScreen()

      await pressCell('21, add photo')
      await press('Choose from gallery')

      expect(alertSpy).toHaveBeenCalledWith(
        'Permission needed',
        expect.stringContaining('Settings'),
        expect.any(Array),
      )
    })
  })

  describe('capture today button', () => {
    it('opens the capture sheet with the camera option when today has no photo', async () => {
      await renderScreen()

      await pressCell("Add today's photo")

      expect(screen.getByText("Add today's photo")).toBeTruthy()
      expect(screen.getByLabelText('Take photo')).toBeTruthy()
    })

    it('prompts for confirmation before replacing when today already has a photo', async () => {
      mockStore = [makeEntry('2026-07-22', '/photos/today.jpg')]
      mockGetDay.mockResolvedValue({ photo_path: '/photos/today.jpg' })
      const alertSpy = simulateAlert('Cancel')
      await renderScreen()

      await pressCell("Replace today's photo")

      expect(alertSpy).toHaveBeenCalledWith(
        "Replace this day's photo?",
        'Your current photo will be permanently deleted.',
        expect.any(Array),
      )
    })

    it('deletes the old photo only after the new one is confirmed', async () => {
      mockStore = [makeEntry('2026-07-22', '/photos/old.jpg')]
      mockGetDay.mockResolvedValue({ photo_path: '/photos/old.jpg' })
      simulateAlert('Replace')
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/new.jpg', exif: undefined }],
      })
      mockSavePhoto.mockResolvedValue('file://documents/photos/new.jpg')
      await renderScreen()

      await pressCell("Replace today's photo")
      await press('Choose from gallery')

      expect(mockDeletePhoto).not.toHaveBeenCalled()

      await press('Use photo')

      expect(mockDeletePhoto).toHaveBeenCalledWith('/photos/old.jpg')
      expect(mockUpsertDayPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2026-07-22',
          photo_path: 'file://documents/photos/new.jpg',
        }),
      )
    })
  })

  describe('month footer', () => {
    // FlatList's virtualization only mounts the page around initialScrollIndex in this
    // test environment (no real scroll/momentum to widen the render window), so swiping
    // to a past month isn't reachable here — that swap is covered by the work item's
    // manual testing steps instead. This test sticks to what mounts on the current month:
    // the streak counter should be showing, and the jump-back control — always mounted
    // underneath it so the two can crossfade — should be non-interactive.
    it('shows the streak counter on the current month, with the jump-back control non-interactive', async () => {
      mockStore = [makeEntry('2026-07-22')]
      await renderScreen()

      expect(screen.getByText('Best 1')).toBeTruthy()
      const jumpBackButton = screen.getByLabelText('Jump to current month')
      // Three levels up from the Pressable's own host view is the crossfading
      // Animated.View layer that carries pointerEvents.
      expect(jumpBackButton.parent?.parent?.parent?.props.pointerEvents).toBe('none')
    })
  })

  describe('delete flow', () => {
    // Note: react-test-renderer's FlatList doesn't reproduce the native cell-recycling
    // behavior that motivated adding `extraData` to the real component, so this test
    // passes regardless of that prop — it verifies the React-level state flow (delete
    // -> refresh -> re-render) is correct, not the native FlatList staleness fix itself.
    it('removes the accent dot immediately after deleting a photo via the long-press menu', async () => {
      mockStore = [makeEntry('2026-07-22', '/photos/today.jpg')]
      simulateAlert('Delete')
      await renderScreen()

      const label = '22, has photo'
      fireEvent(screen.getByLabelText(label), 'longPress')
      await press('Delete photo')

      expect(mockClearPhoto).toHaveBeenCalledWith('2026-07-22')
      expect(screen.queryByLabelText(label)).toBeNull()
    })

    it('closes the action menu after a confirmed delete', async () => {
      mockStore = [makeEntry('2026-07-22', '/photos/today.jpg')]
      simulateAlert('Delete')
      await renderScreen()

      fireEvent(screen.getByLabelText('22, has photo'), 'longPress')
      await press('Delete photo')

      expect(screen.queryByLabelText('Delete photo')).toBeNull()
    })

    it('does not open the action menu when long-pressing a day with no photo', async () => {
      mockStore = []
      await renderScreen()

      expect(screen.queryByLabelText('Delete photo')).toBeNull()
    })
  })
})
