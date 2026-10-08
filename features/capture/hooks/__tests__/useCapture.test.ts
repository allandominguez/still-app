import { act, renderHook } from '@testing-library/react-native'
import { Alert, AlertButton } from 'react-native'
import { CaptureResult } from '../../types'
import { useCapture } from '../useCapture'

let capturedOnComplete: ((result: CaptureResult) => void | Promise<void>) | null = null
const mockOpenSheet = jest.fn()
const mockGetDay = jest.fn()
const mockUpsertDayPhoto = jest.fn()
const mockDeletePhoto = jest.fn()
const mockUnderlyingDismiss = jest.fn()

jest.mock('../usePhotoPicker', () => ({
  usePhotoPicker: (onCaptureComplete: (result: CaptureResult) => void | Promise<void>) => {
    capturedOnComplete = onCaptureComplete
    return {
      openSheet: mockOpenSheet,
      sheetVisible: false,
      permissionBlocked: false,
      isSaving: false,
      pendingUri: null,
      onConfirmPhoto: jest.fn(),
      onCancelPreview: jest.fn(),
      sheetProps: {
        visible: false,
        onTakePhoto: jest.fn(),
        onChooseFromGallery: jest.fn(),
        onDismiss: mockUnderlyingDismiss,
      },
    }
  },
}))

jest.mock('../../../../lib/repositories/day', () => ({
  getDay: (...args: unknown[]) => mockGetDay(...args),
  upsertDayPhoto: (...args: unknown[]) => mockUpsertDayPhoto(...args),
}))

jest.mock('../../../../lib/storage/photoStorage', () => ({
  deletePhoto: (...args: unknown[]) => mockDeletePhoto(...args),
}))

const GPS = { latitude: 37.7749, longitude: -122.4194 }

const RESULT: CaptureResult = {
  localPath: 'file://documents/photos/new.jpg',
  exifGps: GPS,
  deviceGps: null,
  locationName: 'Mission District',
  locationSource: 'exif',
}

function simulateAlert(choice: 'Cancel' | 'Replace') {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    const btn = (buttons as AlertButton[]).find((b) => b.text === choice)
    btn?.onPress?.()
  })
}

describe('useCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnComplete = null
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-15'))
    mockGetDay.mockResolvedValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('opening the sheet', () => {
    it('opens the sheet directly when the target date has no photo', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })

      expect(alertSpy).not.toHaveBeenCalled()
      expect(mockOpenSheet).toHaveBeenCalled()
    })

    it('prompts for confirmation before opening when the target date already has a photo', async () => {
      mockGetDay.mockResolvedValue({ photo_path: 'file://documents/photos/old.jpg' })
      const alertSpy = simulateAlert('Replace')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })

      expect(alertSpy).toHaveBeenCalledWith(
        "Replace this day's photo?",
        'Your current photo will be permanently deleted.',
        expect.any(Array),
      )
      expect(mockOpenSheet).toHaveBeenCalled()
    })

    it('does not open the sheet when the user cancels the replacement prompt', async () => {
      mockGetDay.mockResolvedValue({ photo_path: 'file://documents/photos/old.jpg' })
      simulateAlert('Cancel')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })

      expect(mockOpenSheet).not.toHaveBeenCalled()
    })

    it('opens the sheet without re-prompting when called again for the same date after confirmation', async () => {
      mockGetDay.mockResolvedValue({ photo_path: 'file://documents/photos/old.jpg' })
      const alertSpy = simulateAlert('Replace')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })
      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })

      expect(alertSpy).toHaveBeenCalledTimes(1)
      expect(mockOpenSheet).toHaveBeenCalledTimes(2)
    })

    it('prompts again after the sheet is dismissed without completing a replacement', async () => {
      mockGetDay.mockResolvedValue({ photo_path: 'file://documents/photos/old.jpg' })
      const alertSpy = jest.spyOn(Alert, 'alert')
      simulateAlert('Replace')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })
      await act(() => {
        result.current.sheetProps.onDismiss()
      })

      simulateAlert('Replace')
      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })

      expect(mockUnderlyingDismiss).toHaveBeenCalled()
      expect(alertSpy).toHaveBeenCalledTimes(2)
    })

    it('prompts again when switching to a different date that also has a photo', async () => {
      mockGetDay.mockResolvedValue({ photo_path: 'file://documents/photos/old.jpg' })
      const alertSpy = jest.spyOn(Alert, 'alert')
      simulateAlert('Replace')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })

      simulateAlert('Replace')
      await act(async () => {
        await result.current.openSheet('2026-06-10')
      })

      expect(alertSpy).toHaveBeenCalledTimes(2)
      expect(mockGetDay).toHaveBeenCalledWith('2026-06-10')
    })
  })

  describe('completing a capture', () => {
    it('does not delete the old photo until the capture is complete', async () => {
      mockGetDay.mockResolvedValue({ photo_path: 'file://documents/photos/old.jpg' })
      simulateAlert('Replace')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })

      expect(mockDeletePhoto).not.toHaveBeenCalled()
    })

    it('deletes the old photo and persists the new one when capture completes', async () => {
      mockGetDay.mockResolvedValue({ photo_path: 'file://documents/photos/old.jpg' })
      simulateAlert('Replace')
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })
      await act(async () => {
        await capturedOnComplete!(RESULT)
      })

      expect(mockDeletePhoto).toHaveBeenCalledWith('file://documents/photos/old.jpg')
      expect(mockUpsertDayPhoto).toHaveBeenCalledWith(
        expect.objectContaining({ photo_path: 'file://documents/photos/new.jpg' }),
      )
    })

    it('persists with EXIF coordinates and location name', async () => {
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })
      await act(async () => {
        await capturedOnComplete!(RESULT)
      })

      expect(mockUpsertDayPhoto).toHaveBeenCalledWith({
        date: '2026-06-15',
        photo_path: 'file://documents/photos/new.jpg',
        latitude: 37.7749,
        longitude: -122.4194,
        location_name: 'Mission District',
        location_source: 'exif',
        accent_color: null,
        share_color: null,
      })
    })

    it('persists with device coordinates when EXIF GPS is absent', async () => {
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })
      await act(async () => {
        await capturedOnComplete!({
          localPath: 'file://documents/photos/new.jpg',
          exifGps: null,
          deviceGps: GPS,
          locationName: 'San Francisco',
          locationSource: 'device',
        })
      })

      expect(mockUpsertDayPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194,
          location_source: 'device',
        }),
      )
    })

    it('persists with null coordinates when no GPS is available', async () => {
      const { result } = await renderHook(() => useCapture())

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })
      await act(async () => {
        await capturedOnComplete!({
          localPath: 'file://documents/photos/new.jpg',
          exifGps: null,
          deviceGps: null,
          locationName: null,
          locationSource: null,
        })
      })

      expect(mockUpsertDayPhoto).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: null, longitude: null, location_source: null }),
      )
    })

    it('calls onSaved with the target date once the entry is persisted', async () => {
      const onSaved = jest.fn()
      const { result } = await renderHook(() => useCapture(onSaved))

      await act(async () => {
        await result.current.openSheet('2026-06-15')
      })
      await act(async () => {
        await capturedOnComplete!(RESULT)
      })

      expect(onSaved).toHaveBeenCalledWith('2026-06-15')
    })
  })
})
