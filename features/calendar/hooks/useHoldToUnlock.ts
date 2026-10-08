import { useCallback, useEffect, useRef } from 'react'

const HOLD_DURATION_MS = 13_000

export type HoldToUnlock = {
  onPressIn: () => void
  onPressOut: () => void
  // Call from the button's onPress; returns true if that press just completed a long hold, so
  // the caller can skip its normal tap action instead of also firing it.
  consumeLongHold: () => boolean
}

// In-memory only — resets on app restart, unlike Android's own persistent Easter egg.
export function useHoldToUnlock(onUnlock: () => void): HoldToUnlock {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedRef = useRef(false)

  // Stable identity: the unmount effect below uses it as its cleanup, so a new one each render
  // would cancel an in-progress hold.
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onPressIn = () => {
    completedRef.current = false
    timerRef.current = setTimeout(() => {
      completedRef.current = true
      timerRef.current = null
      onUnlock()
    }, HOLD_DURATION_MS)
  }

  const consumeLongHold = () => {
    const was = completedRef.current
    completedRef.current = false
    return was
  }

  useEffect(() => clearTimer, [clearTimer])

  return { onPressIn, onPressOut: clearTimer, consumeLongHold }
}
