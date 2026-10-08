import { Image } from 'react-native'
import { deletePhoto, savePhoto } from '../photoStorage'

const PHOTO_DIR_URI = 'file:///documents/photos/'
const CACHED_URI = 'file:///cache/manipulated.jpg'

const mockDirCreate = jest.fn()
const mockFileMove = jest.fn()
const mockFileDelete = jest.fn()

let mockFileExists = true

jest.mock('expo-file-system', () => {
  const mockDir = {
    uri: PHOTO_DIR_URI,
    create: (...args: unknown[]) => mockDirCreate(...args),
    exists: true,
  }

  const MockDirectory = jest.fn().mockReturnValue(mockDir)

  const MockFile = jest.fn().mockImplementation((uriOrDir: unknown, name?: string) => {
    const uri = name != null ? `${(uriOrDir as { uri: string }).uri}${name}` : (uriOrDir as string)
    return {
      uri,
      get exists() {
        return mockFileExists
      },
      move: (...args: unknown[]) => mockFileMove(...args),
      delete: () => mockFileDelete(),
    }
  })

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: { uri: 'file:///documents/' } },
  }
})

const mockSaveAsync = jest.fn()
const mockRenderAsync = jest.fn()
const mockResize = jest.fn()
const mockManipulate = jest.fn()

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...args: unknown[]) => mockManipulate(...args) },
  SaveFormat: { JPEG: 'jpeg' },
}))

function mockImageSize(width: number, height: number) {
  ;(jest.spyOn(Image, 'getSize') as unknown as jest.Mock).mockImplementation(
    (_uri: string, success: (w: number, h: number) => void) => success(width, height),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFileExists = true

  mockSaveAsync.mockResolvedValue({ uri: CACHED_URI, width: 1920, height: 1440 })
  mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync })
  mockResize.mockReturnThis()
  mockManipulate.mockReturnValue({ resize: mockResize, renderAsync: mockRenderAsync })
})

describe('savePhoto', () => {
  it('resizes a landscape image by capping the width', async () => {
    mockImageSize(4000, 3000)
    await savePhoto('file:///source.jpg')
    expect(mockResize).toHaveBeenCalledWith({ width: 1920 })
  })

  it('resizes a portrait image by capping the height', async () => {
    mockImageSize(3000, 4000)
    await savePhoto('file:///source.jpg')
    expect(mockResize).toHaveBeenCalledWith({ height: 1920 })
  })

  it('does not upscale an image already smaller than the max dimension', async () => {
    mockImageSize(800, 600)
    await savePhoto('file:///source.jpg')
    expect(mockResize).toHaveBeenCalledWith({ width: 800 })
  })

  it('compresses at JPEG 85%', async () => {
    mockImageSize(4000, 3000)
    await savePhoto('file:///source.jpg')
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.85, format: 'jpeg' })
  })

  it('returns a .jpg path inside the photos directory', async () => {
    mockImageSize(4000, 3000)
    const result = await savePhoto('file:///source.jpg')
    expect(result).toMatch(/^file:\/\/\/documents\/photos\/.+\.jpg$/)
  })

  it('moves the processed file from cache to the destination', async () => {
    mockImageSize(4000, 3000)
    await savePhoto('file:///source.jpg')
    const movedTo = mockFileMove.mock.calls[0][0]
    expect(movedTo.uri).toMatch(/^file:\/\/\/documents\/photos\/.+\.jpg$/)
  })

  it('ensures the photos directory exists before writing', async () => {
    mockImageSize(4000, 3000)
    await savePhoto('file:///source.jpg')
    expect(mockDirCreate).toHaveBeenCalledWith({ idempotent: true })
  })
})

describe('deletePhoto', () => {
  it('deletes the file when it exists', () => {
    mockFileExists = true
    deletePhoto('file:///documents/photos/123.jpg')
    expect(mockFileDelete).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the file does not exist', () => {
    mockFileExists = false
    deletePhoto('file:///documents/photos/nonexistent.jpg')
    expect(mockFileDelete).not.toHaveBeenCalled()
  })
})
