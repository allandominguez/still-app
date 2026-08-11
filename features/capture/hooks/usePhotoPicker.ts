import { launchCameraAsync, launchImageLibraryAsync } from 'expo-image-picker'
import { useState } from 'react'
import { getDeviceLocation } from '../../../lib/location/deviceLocation'
import { extractGpsFromExif, GpsCoordinates } from '../../../lib/location/exifGps'
import { reverseGeocode } from '../../../lib/location/reverseGeocode'
import { savePhoto } from '../../../lib/storage/photoStorage'
import { CaptureResult } from '../types'
import { useCapturePermissions } from './useCapturePermissions'

type UsePhotoPickerResult = {
  openSheet: () => void
  sheetVisible: boolean
  permissionBlocked: boolean
  isSaving: boolean
  pendingUri: string | null
  onConfirmPhoto: () => Promise<void>
  onCancelPreview: () => Promise<void>
  sheetProps: {
    visible: boolean
    onTakePhoto: () => Promise<void>
    onChooseFromGallery: () => Promise<void>
    onDismiss: () => void
  }
}

export function usePhotoPicker(
  onCaptureComplete: (result: CaptureResult) => void | Promise<void>,
): UsePhotoPickerResult {
  const [sheetVisible, setSheetVisible] = useState(false)
  const [permissionBlocked, setPermissionBlocked] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingUri, setPendingUri] = useState<string | null>(null)
  const [pendingExifGps, setPendingExifGps] = useState<GpsCoordinates | null>(null)
  const { requestCameraPermission, requestMediaLibraryPermission } = useCapturePermissions()

  // Diagnostic trail paired with useCapture's — narrows a stuck-modal report to JS state vs. native Modal.
  const openSheet = () => {
    if (__DEV__) console.log('[usePhotoPicker] sheetVisible -> true')
    setSheetVisible(true)
  }
  const closeSheet = () => {
    if (__DEV__) console.log('[usePhotoPicker] sheetVisible -> false')
    setSheetVisible(false)
  }

  const saveAndNotify = async (
    uri: string,
    exifGps: GpsCoordinates | null,
    source: 'camera' | 'gallery',
  ) => {
    setIsSaving(true)
    try {
      const localPath = await savePhoto(uri)
      // Android MediaStore strips gallery GPS — device fallback would record current position, not the photo's
      const deviceGps = source === 'camera' && !exifGps ? await getDeviceLocation() : null
      const coords = exifGps ?? deviceGps
      const locationName = coords ? await reverseGeocode(coords) : null
      const locationSource = exifGps ? 'exif' : deviceGps ? 'device' : null
      await onCaptureComplete({ localPath, exifGps, deviceGps, locationName, locationSource })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTakePhoto = async () => {
    closeSheet()
    const status = await requestCameraPermission()
    if (status === 'blocked') {
      setPermissionBlocked(true)
      return
    }
    if (status === 'denied') return

    const result = await launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: true })
    if (result.canceled) {
      openSheet()
    } else {
      const asset = result.assets[0]
      const exifGps = asset.exif ? extractGpsFromExif(asset.exif) : null
      await saveAndNotify(asset.uri, exifGps, 'camera')
    }
  }

  const openGallery = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
      exif: true,
    })
    if (result.canceled) {
      openSheet()
    } else {
      const asset = result.assets[0]
      setPendingUri(asset.uri)
      setPendingExifGps(asset.exif ? extractGpsFromExif(asset.exif) : null)
    }
  }

  const handleChooseFromGallery = async () => {
    closeSheet()
    const status = await requestMediaLibraryPermission()
    if (status === 'blocked') {
      setPermissionBlocked(true)
      return
    }
    if (status === 'denied') return

    await openGallery()
  }

  const onConfirmPhoto = async () => {
    if (!pendingUri) return
    await saveAndNotify(pendingUri, pendingExifGps, 'gallery')
    setPendingUri(null)
    setPendingExifGps(null)
  }

  const onCancelPreview = async () => {
    setPendingUri(null)
    setPendingExifGps(null)
    await openGallery()
  }

  return {
    openSheet,
    sheetVisible,
    permissionBlocked,
    isSaving,
    pendingUri,
    onConfirmPhoto,
    onCancelPreview,
    sheetProps: {
      visible: sheetVisible,
      onTakePhoto: handleTakePhoto,
      onChooseFromGallery: handleChooseFromGallery,
      onDismiss: closeSheet,
    },
  }
}
