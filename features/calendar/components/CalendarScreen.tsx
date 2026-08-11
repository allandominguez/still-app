import { useFocusEffect } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { IconArrowDown, IconArrowForwardUp, IconPlus } from '@tabler/icons-react-native'
import * as Sharing from 'expo-sharing'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Animated, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PhotoPickerSheet } from '../../capture/components/PhotoPickerSheet'
import { PhotoPreview } from '../../capture/components/PhotoPreview'
import { SavingOverlay } from '../../capture/components/SavingOverlay'
import { useCapture } from '../../capture/hooks/useCapture'
import { Colors, Radii, Spacing, Typography } from '../../../lib/design'
import { getTraceLogUri, trace } from '../../../lib/logging/trace'
import { RootStackParamList } from '../../../navigation/types'
import { useCalendarData } from '../hooks/useCalendarData'
import { useDayActionMenu } from '../hooks/useDayActionMenu'
import { useHoldToUnlock } from '../hooks/useHoldToUnlock'
import { useMonthPager } from '../hooks/useMonthPager'
import { MONTH_NAMES } from '../utils'
import { CalendarGrid } from './CalendarGrid'
import { DayActionMenu } from './DayActionMenu'

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>

function alertPermissionBlocked() {
  Alert.alert(
    'Permission needed',
    'still needs access to your camera or photos to add a picture. You can enable this in Settings.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  )
}

export function CalendarScreen({ navigation }: Props) {
  const { entriesByDate, months, today, currentStreak, longestStreak, isLoading, refresh } =
    useCalendarData()
  const { target, open: openDayActionMenu, close: closeDayActionMenu } = useDayActionMenu()

  const {
    displayMonths,
    currentIndex,
    pageHeight,
    setPageHeight,
    flatListRef,
    monthPanHandlers,
    yearPanHandlers,
    onViewableItemsChanged,
    viewabilityConfig,
  } = useMonthPager(months)

  // displayMonths is ascending (oldest first), so the current month is always last.
  const isViewingCurrentMonth = currentIndex === displayMonths.length - 1

  const handleShareLogs = async () => {
    const uri = getTraceLogUri()
    if (!uri) return
    await Sharing.shareAsync(uri)
  }
  const holdToUnlock = useHoldToUnlock(() => {
    Alert.alert('Share diagnostic logs?', 'Exports the local diagnostic log for this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: handleShareLogs },
    ])
  })

  // 0 = streak counter, 1 = jump-back control; both stay mounted and crossfade via this value.
  const footerTransition = useRef(new Animated.Value(isViewingCurrentMonth ? 0 : 1)).current
  useEffect(() => {
    const animation = Animated.timing(footerTransition, {
      toValue: isViewingCurrentMonth ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [isViewingCurrentMonth, footerTransition])

  const todayHasPhoto = Boolean(entriesByDate[today]?.photo_path)

  // Kept separate from useCapture's target so allowCamera can be derived here, where "today" is known.
  const [captureDate, setCaptureDate] = useState<string | null>(null)
  // Navigates straight to the entry after capture; the calendar catches up via its existing focus-refetch.
  const capture = useCapture((date) => navigation.navigate('DayDetail', { date }))

  useEffect(() => {
    if (capture.permissionBlocked) alertPermissionBlocked()
  }, [capture.permissionBlocked])

  useFocusEffect(
    useCallback(() => {
      trace('[CalendarScreen] focus -> refresh()')
      refresh()
    }, [refresh]),
  )

  const handleDayPress = (date: string) => {
    if (entriesByDate[date]?.photo_path) {
      navigation.navigate('DayDetail', { date })
      return
    }
    setCaptureDate(date)
    capture.openSheet(date)
  }

  // Always targets today; openSheet's existing replace-confirmation flow handles an existing photo.
  const handleCaptureTodayPress = () => {
    setCaptureDate(today)
    capture.openSheet(today)
  }

  const handleJumpToCurrentMonth = () => {
    flatListRef.current?.scrollToIndex({ index: displayMonths.length - 1, animated: true })
  }

  if (isLoading || displayMonths.length === 0) {
    return <SafeAreaView style={styles.root} />
  }

  return (
    <SafeAreaView style={styles.root}>
      <View
        testID="calendar-list-container"
        style={styles.listContainer}
        onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
      >
        {pageHeight > 0 && (
          <FlatList
            ref={flatListRef}
            style={styles.list}
            data={displayMonths}
            // Forces FlatList to re-render mounted cells when an entry changes in place (e.g. a delete).
            extraData={entriesByDate}
            initialScrollIndex={displayMonths.length - 1}
            keyExtractor={(item) => `${item.year}-${item.month}`}
            // Capture button lives in the last page's own content so it scrolls with it, not the list container.
            renderItem={({ item, index }) => (
              <View style={[styles.page, { height: pageHeight }]}>
                <View style={styles.pageHeader}>
                  <View {...monthPanHandlers} accessibilityRole="header">
                    <Text style={styles.monthLabel}>{MONTH_NAMES[item.month - 1]}</Text>
                  </View>
                  <View {...yearPanHandlers} accessibilityRole="header">
                    <Text style={styles.yearLabel}>{item.year}</Text>
                  </View>
                </View>
                <CalendarGrid
                  year={item.year}
                  month={item.month}
                  entriesByDate={entriesByDate}
                  today={today}
                  onDayPress={handleDayPress}
                  onDayLongPress={(date) => {
                    const photoPath = entriesByDate[date]?.photo_path
                    if (photoPath) openDayActionMenu(date, photoPath)
                  }}
                />
                {index === displayMonths.length - 1 && (
                  <Pressable
                    style={styles.captureTodayButton}
                    onPressIn={holdToUnlock.onPressIn}
                    onPressOut={holdToUnlock.onPressOut}
                    onPress={() => {
                      if (holdToUnlock.consumeLongHold()) return
                      handleCaptureTodayPress()
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      todayHasPhoto ? "Replace today's photo" : "Add today's photo"
                    }
                  >
                    {todayHasPhoto ? (
                      <IconArrowForwardUp size={22} color={Colors.textPrimary} />
                    ) : (
                      <IconPlus size={22} color={Colors.textPrimary} />
                    )}
                  </Pressable>
                )}
              </View>
            )}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              flatListRef.current?.scrollToOffset({
                offset: averageItemLength * index,
                animated: true,
              })
            }}
          />
        )}
      </View>
      {/* Fixed-height footer; only its content crossfades between streak and jump-back, so it never reflows the list. */}
      <View style={styles.footerRow}>
        <Animated.View
          style={[
            styles.footerLayer,
            { opacity: footerTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}
          pointerEvents={isViewingCurrentMonth ? 'auto' : 'none'}
        >
          {longestStreak > 0 && (
            <>
              {currentStreak > 0 && (
                <>
                  <Text style={styles.streakText}>
                    {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                  </Text>
                  <Text style={styles.streakSeparator}>·</Text>
                </>
              )}
              <Text style={styles.streakText}>Best {longestStreak}</Text>
            </>
          )}
        </Animated.View>
        <Animated.View
          style={[styles.footerLayer, { opacity: footerTransition }]}
          pointerEvents={isViewingCurrentMonth ? 'none' : 'auto'}
        >
          <Pressable
            onPress={handleJumpToCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Jump to current month"
            hitSlop={12}
          >
            <IconArrowDown size={18} color={Colors.textTertiary} />
          </Pressable>
        </Animated.View>
      </View>
      {target && (
        <DayActionMenu
          date={target.date}
          photoPath={target.photoPath}
          onClose={closeDayActionMenu}
          onDeleted={refresh}
        />
      )}
      <PhotoPickerSheet {...capture.sheetProps} allowCamera={captureDate === today} />
      <PhotoPreview
        uri={capture.pendingUri}
        isSaving={capture.isSaving}
        onConfirm={capture.onConfirmPhoto}
        onCancel={capture.onCancelPreview}
      />
      <SavingOverlay visible={capture.isSaving && !capture.pendingUri} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  captureTodayButton: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.lg,
  },
  monthLabel: {
    ...Typography.displayMd,
    color: Colors.textPrimary,
  },
  yearLabel: {
    ...Typography.displayMd,
    color: Colors.textSecondary,
  },
  footerRow: {
    paddingVertical: Spacing.md,
    // Fixed height so the row never resizes as its content swaps between streak text and icon.
    minHeight: 18 + Spacing.md * 2,
  },
  footerLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  streakText: {
    ...Typography.labelXs,
    color: Colors.textTertiary,
  },
  streakSeparator: {
    ...Typography.labelXs,
    color: Colors.textTertiary,
  },
})
