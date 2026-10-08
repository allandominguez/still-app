import { IconTrash } from '@tabler/icons-react-native'
import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Colors, Spacing, Typography } from '../../../lib/design'
import {
  NOTE_BAND_BOTTOM,
  NOTE_BAND_TOP,
  useNoteVerticalPosition,
} from '../hooks/useNoteVerticalPosition'

const APPEAR_MS = 200
const DISMISS_MS = 250

// Photos aren't themed by light/dark mode, so both need to stay legible over
// a dimmed photo regardless of theme — they can't reuse themeable tokens.
const TEXT_COLOR = Colors.surface
const PLACEHOLDER_COLOR = 'rgba(255, 255, 255, 0.6)'

// Not UX-driven (the note scrolls) — just a backstop against a pathological paste bloating the input.
const NOTE_MAX_LENGTH = 8000

type Props = {
  visible: boolean
  locationName: string | null
  noteValue: string
  notePlaceholder: string
  onNoteChangeText: (text: string) => void
  onNoteFocus: () => void
  onNoteBlur: () => void
  onDeletePhoto: () => void
  pageHeight: number
}

export function DetailOverlay({
  visible,
  locationName,
  noteValue,
  notePlaceholder,
  onNoteChangeText,
  onNoteFocus,
  onNoteBlur,
  onDeletePhoto,
  pageHeight,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current
  const noteTranslateY = useNoteVerticalPosition(pageHeight)

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? APPEAR_MS : DISMISS_MS,
      easing: visible ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [visible, opacity])

  return (
    <Animated.View
      testID="detail-overlay"
      style={[styles.container, { opacity }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View testID="detail-overlay-dim" style={styles.dim} />
      {locationName && (
        <View style={styles.locationWrap}>
          <Text style={styles.location}>{locationName}</Text>
        </View>
      )}
      <Animated.View style={[styles.noteWrap, { transform: [{ translateY: noteTranslateY }] }]}>
        <TextInput
          style={[styles.note, { maxHeight: (NOTE_BAND_BOTTOM - NOTE_BAND_TOP) * pageHeight }]}
          value={noteValue}
          onChangeText={onNoteChangeText}
          onFocus={onNoteFocus}
          onBlur={onNoteBlur}
          placeholder={notePlaceholder}
          placeholderTextColor={PLACEHOLDER_COLOR}
          multiline
          maxLength={NOTE_MAX_LENGTH}
          accessibilityLabel="Note for this day"
        />
      </Animated.View>
      <Pressable
        style={styles.deleteButton}
        onPress={onDeletePhoto}
        accessibilityRole="button"
        accessibilityLabel="Delete photo"
      >
        <IconTrash size={22} color={TEXT_COLOR} style={styles.deleteIcon} />
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'black',
    opacity: 0.5,
  },
  locationWrap: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  location: {
    ...Typography.bodyLg,
    color: TEXT_COLOR,
    textAlign: 'center',
  },
  noteWrap: {
    position: 'absolute',
    top: `${NOTE_BAND_TOP * 100}%`,
    bottom: `${(1 - NOTE_BAND_BOTTOM) * 100}%`,
    left: Spacing.lg,
    right: Spacing.lg,
    justifyContent: 'center',
  },
  note: {
    ...Typography.labelMd,
    color: TEXT_COLOR,
    padding: 0,
    textAlignVertical: 'top',
  },
  deleteButton: {
    position: 'absolute',
    bottom: '6%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  deleteIcon: {
    opacity: 0.7,
  },
})
