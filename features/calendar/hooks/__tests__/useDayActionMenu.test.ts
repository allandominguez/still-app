import { act, renderHook } from '@testing-library/react-native'
import { useDayActionMenu } from '../useDayActionMenu'

describe('useDayActionMenu', () => {
  it('starts with no target, menu closed', async () => {
    const { result } = await renderHook(() => useDayActionMenu())
    expect(result.current.target).toBeNull()
  })

  it('opens with the pressed day and its photo path', async () => {
    const { result } = await renderHook(() => useDayActionMenu())

    await act(() => result.current.open('2026-07-14', '/photos/2026-07-14.jpg'))

    expect(result.current.target).toEqual({
      date: '2026-07-14',
      photoPath: '/photos/2026-07-14.jpg',
    })
  })

  it('closes back to no target', async () => {
    const { result } = await renderHook(() => useDayActionMenu())

    await act(() => result.current.open('2026-07-14', '/photos/2026-07-14.jpg'))
    await act(() => result.current.close())

    expect(result.current.target).toBeNull()
  })

  it('switches target when a different day is opened', async () => {
    const { result } = await renderHook(() => useDayActionMenu())

    await act(() => result.current.open('2026-07-14', '/photos/2026-07-14.jpg'))
    await act(() => result.current.open('2026-07-20', '/photos/2026-07-20.jpg'))

    expect(result.current.target).toEqual({
      date: '2026-07-20',
      photoPath: '/photos/2026-07-20.jpg',
    })
  })
})
