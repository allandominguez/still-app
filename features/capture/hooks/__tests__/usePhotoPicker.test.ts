import { act, renderHook } from '@testing-library/react-native'
import { usePhotoPicker } from '../usePhotoPicker'

const mockRequestCameraPermission = jest.fn()
const mockRequestMediaLibraryPermission = jest.fn()
const mockLaunchCameraAsync = jest.fn()
const mockLaunchImageLibraryAsync = jest.fn()
const mockSavePhoto = jest.fn()
const mockExtractGpsFromExif = jest.fn()
const mockGetDeviceLocation = jest.fn()
const mockReverseGeocode = jest.fn()

jest.mock('../useCapturePermissions', () => ({
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
}))

jest.mock('../../../../lib/location/exifGps', () => ({
  extractGpsFromExif: (...args: unknown[]) => mockExtractGpsFromExif(...args),
}))

jest.mock('../../../../lib/location/deviceLocation', () => ({
  getDeviceLocation: () => mockGetDeviceLocation(),
}))

jest.mock('../../../../lib/location/reverseGeocode', () => ({
  reverseGeocode: (...args: unknown[]) => mockReverseGeocode(...args),
}))

const GPS = { latitude: 37.7749, longitude: -122.4194 }

describe('usePhotoPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReverseGeocode.mockResolvedValue(null)
  })

  it('sheet is hidden and no pending photo initially', () => {
    const { result } = renderHook(() => usePhotoPicker(jest.fn()))
    expect(result.current.sheetVisible).toBe(false)
    expect(result.current.pendingUri).toBeNull()
  })

  it('openSheet makes the sheet visible', () => {
    const { result } = renderHook(() => usePhotoPicker(jest.fn()))

    act(() => result.current.openSheet())

    expect(result.current.sheetVisible).toBe(true)
  })

  it('onDismiss hides the sheet', () => {
    const { result } = renderHook(() => usePhotoPicker(jest.fn()))

    act(() => result.current.openSheet())
    act(() => result.current.sheetProps.onDismiss())

    expect(result.current.sheetVisible).toBe(false)
  })

  describe('Take photo', () => {
    it('uses exifGps and skips device location when EXIF has GPS', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://camera-temp.jpg', exif: { '{GPS}': GPS } }],
      })
      mockExtractGpsFromExif.mockReturnValue(GPS)
      mockSavePhoto.mockResolvedValue('file://documents/photos/123.jpg')
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(onCaptureComplete).toHaveBeenCalledWith({
        localPath: 'file://documents/photos/123.jpg',
        exifGps: GPS,
        deviceGps: null,
        locationName: null,
        locationSource: 'exif',
      })
      expect(mockGetDeviceLocation).not.toHaveBeenCalled()
    })

    it('reverse geocodes the available coordinates and includes the location name in the result', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://camera-temp.jpg', exif: { '{GPS}': GPS } }],
      })
      mockExtractGpsFromExif.mockReturnValue(GPS)
      mockSavePhoto.mockResolvedValue('file://documents/photos/123.jpg')
      mockReverseGeocode.mockResolvedValue('Mission District')
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(mockReverseGeocode).toHaveBeenCalledWith(GPS)
      expect(onCaptureComplete).toHaveBeenCalledWith(
        expect.objectContaining({ locationName: 'Mission District', locationSource: 'exif' }),
      )
    })

    it('falls back to device location when the photo has no EXIF GPS', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://camera-temp.jpg', exif: undefined }],
      })
      mockSavePhoto.mockResolvedValue('file://documents/photos/123.jpg')
      mockGetDeviceLocation.mockResolvedValue(GPS)
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(onCaptureComplete).toHaveBeenCalledWith({
        localPath: 'file://documents/photos/123.jpg',
        exifGps: null,
        deviceGps: GPS,
        locationName: null,
        locationSource: 'device',
      })
    })

    it('passes null deviceGps when device location is unavailable and there is no EXIF GPS', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://camera-temp.jpg', exif: undefined }],
      })
      mockSavePhoto.mockResolvedValue('file://documents/photos/123.jpg')
      mockGetDeviceLocation.mockResolvedValue(null)
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(onCaptureComplete).toHaveBeenCalledWith({
        localPath: 'file://documents/photos/123.jpg',
        exifGps: null,
        deviceGps: null,
        locationName: null,
        locationSource: null,
      })
    })

    it('does not save or call onCaptureComplete when the user cancels the camera', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({ canceled: true, assets: null })
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(mockSavePhoto).not.toHaveBeenCalled()
      expect(onCaptureComplete).not.toHaveBeenCalled()
    })

    it('does not launch the camera when permission is denied', async () => {
      mockRequestCameraPermission.mockResolvedValue('denied')
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(mockLaunchCameraAsync).not.toHaveBeenCalled()
    })

    it('sets permissionBlocked when camera permission is permanently denied', async () => {
      mockRequestCameraPermission.mockResolvedValue('blocked')
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(result.current.permissionBlocked).toBe(true)
    })

    it('closes the sheet before launching the camera then re-opens it if the user cancels', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({ canceled: true, assets: null })
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      act(() => result.current.openSheet())
      await act(async () => {
        await result.current.sheetProps.onTakePhoto()
      })

      expect(result.current.sheetVisible).toBe(true)
    })

    it('reflects isSaving while the photo is being saved', async () => {
      mockRequestCameraPermission.mockResolvedValue('granted')
      mockLaunchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://camera-temp.jpg', exif: undefined }],
      })
      let resolveSave!: (path: string) => void
      mockSavePhoto.mockReturnValue(new Promise<string>((res) => (resolveSave = res)))
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      act(() => {
        result.current.sheetProps.onTakePhoto()
      })
      await act(async () => {})

      expect(result.current.isSaving).toBe(true)

      await act(async () => resolveSave('file://documents/photos/123.jpg'))

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('Choose from gallery', () => {
    it('sets pendingUri after a photo is selected so the user can preview before saving', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/photo.jpg', exif: undefined }],
      })
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })

      expect(result.current.pendingUri).toBe('content://gallery/photo.jpg')
      expect(mockSavePhoto).not.toHaveBeenCalled()
    })

    it('saves with exifGps and calls onCaptureComplete when the user confirms the preview', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/photo.jpg', exif: { '{GPS}': GPS } }],
      })
      mockExtractGpsFromExif.mockReturnValue(GPS)
      mockSavePhoto.mockResolvedValue('file://documents/photos/456.jpg')
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })
      await act(async () => {
        await result.current.onConfirmPhoto()
      })

      expect(mockSavePhoto).toHaveBeenCalledWith('content://gallery/photo.jpg')
      expect(onCaptureComplete).toHaveBeenCalledWith({
        localPath: 'file://documents/photos/456.jpg',
        exifGps: GPS,
        deviceGps: null,
        locationName: null,
        locationSource: 'exif',
      })
      expect(result.current.pendingUri).toBeNull()
    })

    it('keeps the preview open with pendingUri set while the confirmed photo is being saved', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/photo.jpg', exif: undefined }],
      })
      let resolveSave!: (path: string) => void
      mockSavePhoto.mockReturnValue(new Promise<string>((res) => (resolveSave = res)))
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })
      act(() => {
        result.current.onConfirmPhoto()
      })
      await act(async () => {})

      expect(result.current.isSaving).toBe(true)
      expect(result.current.pendingUri).toBe('content://gallery/photo.jpg')

      await act(async () => resolveSave('file://documents/photos/456.jpg'))

      expect(result.current.pendingUri).toBeNull()
    })

    it('re-opens the gallery when the user taps Back on the preview', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync
        .mockResolvedValueOnce({
          canceled: false,
          assets: [{ uri: 'content://gallery/first.jpg', exif: undefined }],
        })
        .mockResolvedValueOnce({
          canceled: false,
          assets: [{ uri: 'content://gallery/second.jpg', exif: undefined }],
        })
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })
      await act(async () => {
        await result.current.onCancelPreview()
      })

      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(2)
      expect(result.current.pendingUri).toBe('content://gallery/second.jpg')
    })

    it('re-opens the sheet when the user closes the gallery without selecting a photo', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null })
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })

      expect(result.current.pendingUri).toBeNull()
      expect(result.current.sheetVisible).toBe(true)
    })

    it('re-opens the sheet when the user closes the re-opened gallery without selecting a photo', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync
        .mockResolvedValueOnce({
          canceled: false,
          assets: [{ uri: 'content://gallery/photo.jpg', exif: undefined }],
        })
        .mockResolvedValueOnce({ canceled: true, assets: null })
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })
      await act(async () => {
        await result.current.onCancelPreview()
      })

      expect(result.current.pendingUri).toBeNull()
      expect(result.current.sheetVisible).toBe(true)
      expect(mockSavePhoto).not.toHaveBeenCalled()
      expect(onCaptureComplete).not.toHaveBeenCalled()
    })

    it('stores null location without calling device GPS when the gallery photo has no EXIF GPS', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('granted')
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'content://gallery/photo.jpg', exif: undefined }],
      })
      mockSavePhoto.mockResolvedValue('file://documents/photos/456.jpg')
      const onCaptureComplete = jest.fn()
      const { result } = renderHook(() => usePhotoPicker(onCaptureComplete))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })
      await act(async () => {
        await result.current.onConfirmPhoto()
      })

      expect(mockGetDeviceLocation).not.toHaveBeenCalled()
      expect(onCaptureComplete).toHaveBeenCalledWith(
        expect.objectContaining({ deviceGps: null, locationName: null, locationSource: null }),
      )
    })

    it('does not launch the gallery when permission is denied', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('denied')
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })

      expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled()
    })

    it('sets permissionBlocked when media library permission is permanently denied', async () => {
      mockRequestMediaLibraryPermission.mockResolvedValue('blocked')
      const { result } = renderHook(() => usePhotoPicker(jest.fn()))

      await act(async () => {
        await result.current.sheetProps.onChooseFromGallery()
      })

      expect(result.current.permissionBlocked).toBe(true)
    })
  })
})
