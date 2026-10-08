import { renderHook, act } from '@testing-library/react-native'
import { useCapturePermissions } from '../useCapturePermissions'

const mockRequestCamera = jest.fn()
const mockRequestMedia = jest.fn()

jest.mock('expo-image-picker', () => ({
  useCameraPermissions: () => [null, mockRequestCamera],
  useMediaLibraryPermissions: () => [null, mockRequestMedia],
}))

describe('useCapturePermissions', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('requestCameraPermission', () => {
    it('returns granted when permission is granted', async () => {
      mockRequestCamera.mockResolvedValue({ granted: true, canAskAgain: true })
      const { result } = await renderHook(() => useCapturePermissions())

      let status
      await act(async () => {
        status = await result.current.requestCameraPermission()
      })

      expect(status).toBe('granted')
    })

    it('returns denied when permission is refused but can be asked again', async () => {
      mockRequestCamera.mockResolvedValue({ granted: false, canAskAgain: true })
      const { result } = await renderHook(() => useCapturePermissions())

      let status
      await act(async () => {
        status = await result.current.requestCameraPermission()
      })

      expect(status).toBe('denied')
    })

    it('returns blocked when permission is permanently denied', async () => {
      mockRequestCamera.mockResolvedValue({ granted: false, canAskAgain: false })
      const { result } = await renderHook(() => useCapturePermissions())

      let status
      await act(async () => {
        status = await result.current.requestCameraPermission()
      })

      expect(status).toBe('blocked')
    })
  })

  describe('requestMediaLibraryPermission', () => {
    it('returns granted when permission is granted', async () => {
      mockRequestMedia.mockResolvedValue({ granted: true, canAskAgain: true })
      const { result } = await renderHook(() => useCapturePermissions())

      let status
      await act(async () => {
        status = await result.current.requestMediaLibraryPermission()
      })

      expect(status).toBe('granted')
    })

    it('returns denied when permission is refused but can be asked again', async () => {
      mockRequestMedia.mockResolvedValue({ granted: false, canAskAgain: true })
      const { result } = await renderHook(() => useCapturePermissions())

      let status
      await act(async () => {
        status = await result.current.requestMediaLibraryPermission()
      })

      expect(status).toBe('denied')
    })

    it('returns blocked when permission is permanently denied', async () => {
      mockRequestMedia.mockResolvedValue({ granted: false, canAskAgain: false })
      const { result } = await renderHook(() => useCapturePermissions())

      let status
      await act(async () => {
        status = await result.current.requestMediaLibraryPermission()
      })

      expect(status).toBe('blocked')
    })
  })
})
