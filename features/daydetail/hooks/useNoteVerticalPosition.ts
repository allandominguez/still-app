import { useEffect, useRef, useState } from 'react'
import { Animated, Keyboard, KeyboardEvent } from 'react-native'

// A band, not a point, so the note can grow while staying vertically centred via plain flexbox.
export const NOTE_BAND_TOP = 0.4
export const NOTE_BAND_BOTTOM = 0.8

const BOTTOM_PADDING = 16
const TRANSITION_MS = 200

// Only shifts up by however much the keyboard actually overlaps the band's bottom edge.
export function computeKeyboardShift(pageHeight: number, keyboardHeight: number): number {
  const bandBottom = NOTE_BAND_BOTTOM * pageHeight
  const visibleBottom = pageHeight - keyboardHeight - BOTTOM_PADDING
  const overlap = Math.max(0, bandBottom - visibleBottom)
  return overlap === 0 ? 0 : -overlap
}

export function useNoteVerticalPosition(pageHeight: number): Animated.Value {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const translateY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Event wiring only; the shift logic is tested through computeKeyboardShift.
    /* istanbul ignore next */
    const showSub = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) =>
      setKeyboardHeight(event.endCoordinates.height),
    )
    /* istanbul ignore next */
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    const animation = Animated.timing(translateY, {
      toValue: computeKeyboardShift(pageHeight, keyboardHeight),
      duration: TRANSITION_MS,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [pageHeight, keyboardHeight, translateY])

  return translateY
}
