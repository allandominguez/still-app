import { act, renderHook } from '@testing-library/react-native'
import { ViewToken } from 'react-native'
import { MonthData } from '../../types'
import { useMonthPager } from '../useMonthPager'

const MONTHS: MonthData[] = [
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
  { year: 2026, month: 3 },
]

function viewableItem(index: number): ViewToken {
  return {
    item: MONTHS[index],
    key: `${MONTHS[index].year}-${MONTHS[index].month}`,
    index,
    isViewable: true,
  }
}

describe('useMonthPager', () => {
  it('starts viewing the current month, the last item in the ascending list', async () => {
    const { result } = await renderHook(() => useMonthPager(MONTHS))

    expect(result.current.currentIndex).toBe(MONTHS.length - 1)
  })

  it('tracks the current index as a different month becomes the viewable page', async () => {
    const { result } = await renderHook(() => useMonthPager(MONTHS))

    await act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [viewableItem(0)] })
    })

    expect(result.current.currentIndex).toBe(0)
  })

  it('returns to the current month index after viewing a past month and swiping back', async () => {
    const { result } = await renderHook(() => useMonthPager(MONTHS))

    await act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [viewableItem(0)] })
    })
    await act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [viewableItem(MONTHS.length - 1)] })
    })

    expect(result.current.currentIndex).toBe(MONTHS.length - 1)
  })

  it('reports the page height once the container reports its layout', async () => {
    const { result } = await renderHook(() => useMonthPager(MONTHS))

    await act(() => {
      result.current.setPageHeight(812)
    })

    expect(result.current.pageHeight).toBe(812)
  })
})
