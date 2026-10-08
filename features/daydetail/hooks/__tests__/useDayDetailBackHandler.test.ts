import { renderHook } from '@testing-library/react-native'
import { BackHandler } from 'react-native'
import { useDayDetailBackHandler } from '../useDayDetailBackHandler'

const mockRemove = jest.fn()

function pressHardwareBack(spy: jest.SpyInstance): boolean | null | undefined {
  const lastCall = spy.mock.calls[spy.mock.calls.length - 1]
  const handler = lastCall[1] as () => boolean | null | undefined
  return handler()
}

describe('useDayDetailBackHandler', () => {
  let addEventListenerSpy: jest.SpyInstance

  beforeEach(() => {
    mockRemove.mockClear()
    addEventListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(() => ({ remove: mockRemove }))
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
  })

  it('closes the detail overlay and consumes the press when it is open', async () => {
    const closeDetailOverlay = jest.fn()
    await renderHook(() => useDayDetailBackHandler(true, closeDetailOverlay))

    expect(addEventListenerSpy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))

    const consumed = pressHardwareBack(addEventListenerSpy)

    expect(closeDetailOverlay).toHaveBeenCalledTimes(1)
    expect(consumed).toBe(true)
  })

  it('lets the default back action proceed when the detail overlay is closed', async () => {
    const closeDetailOverlay = jest.fn()
    await renderHook(() => useDayDetailBackHandler(false, closeDetailOverlay))

    const consumed = pressHardwareBack(addEventListenerSpy)

    expect(closeDetailOverlay).not.toHaveBeenCalled()
    expect(consumed).toBe(false)
  })

  it('removes the listener on unmount', async () => {
    const { unmount } = await renderHook(() => useDayDetailBackHandler(false, jest.fn()))

    await unmount()

    expect(mockRemove).toHaveBeenCalledTimes(1)
  })
})
