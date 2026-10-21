import { useEffect, useRef, useState } from 'react'
import { FlatList, GestureResponderHandlers, PanResponder, ViewToken } from 'react-native'
import { MonthData } from '../types'
import { isHorizontalSwipe, monthSwipeTarget, yearSwipeTarget } from '../utils'

type MonthPager = {
  displayMonths: MonthData[]
  currentIndex: number
  pageHeight: number
  setPageHeight: (h: number) => void
  flatListRef: React.RefObject<FlatList<MonthData> | null>
  monthPanHandlers: GestureResponderHandlers
  yearPanHandlers: GestureResponderHandlers
  onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void
  viewabilityConfig: { viewAreaCoveragePercentThreshold: number }
}

export function useMonthPager(months: MonthData[]): MonthPager {
  // Ascending order: oldest at index 0, current month at the end.
  // FlatList starts at the last item; scrolling up reveals older months.
  const displayMonths = months

  const [visibleIndex, setVisibleIndex] = useState<number | null>(null)
  const currentIndex = visibleIndex ?? displayMonths.length - 1
  const [pageHeight, setPageHeight] = useState(0)
  const flatListRef = useRef<FlatList<MonthData>>(null)

  // Refs keep PanResponder callbacks reading current values without recreating the responders
  const displayMonthsRef = useRef(displayMonths)
  useEffect(() => {
    displayMonthsRef.current = displayMonths
  }, [displayMonths])
  const currentIndexRef = useRef(currentIndex)
  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])

  // Thin FlatList call, only reached via the swipe handlers
  /* istanbul ignore next */
  const scrollToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true })
  }

  // Swipe right = newer month (higher index), swipe left = older month (lower index)
  // Needs real touch events
  /* istanbul ignore next */
  const monthPanHandlers = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => isHorizontalSwipe(g.dx, g.dy),
      onPanResponderRelease: (_, g) => {
        const target = monthSwipeTarget(
          g.dx,
          currentIndexRef.current,
          displayMonthsRef.current.length,
        )
        if (target !== null) scrollToIndex(target)
      },
    }),
  ).current.panHandlers

  // Swipe right = newer year (year + 1), swipe left = older year (year - 1)
  // Needs real touch events
  /* istanbul ignore next */
  const yearPanHandlers = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => isHorizontalSwipe(g.dx, g.dy),
      onPanResponderRelease: (_, g) => {
        const curr = displayMonthsRef.current[currentIndexRef.current]
        if (!curr) return
        const target = yearSwipeTarget(g.dx, curr, displayMonthsRef.current)
        if (target !== null) scrollToIndex(target)
      },
    }),
  ).current.panHandlers

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setVisibleIndex(viewableItems[0].index)
    }
  }).current

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  return {
    displayMonths,
    currentIndex,
    pageHeight,
    setPageHeight,
    flatListRef,
    monthPanHandlers,
    yearPanHandlers,
    onViewableItemsChanged,
    viewabilityConfig,
  }
}
