import { BlurView } from 'expo-blur'
import { RefObject, useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

const TRANSITION_MS = 300

type Props = {
  visible: boolean
  // Android blurs only the BlurTargetView it points at; without one the blur falls back to a flat dim.
  blurTarget: RefObject<View | null>
}

// Always mounted, only opacity toggles — keeps the native blur warmed up instead of cold-starting on reveal.
export function PageBlur({ visible, blurTarget }: Props) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: TRANSITION_MS,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [visible, opacity])

  return (
    <Animated.View testID="page-blur" style={[styles.container, { opacity }]} pointerEvents="none">
      <BlurView
        intensity={100}
        tint="dark"
        blurMethod="dimezisBlurView"
        blurTarget={blurTarget}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
})
