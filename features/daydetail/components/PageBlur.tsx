import { BlurView } from 'expo-blur'
import { useEffect, useRef } from 'react'
import { Animated, StyleSheet } from 'react-native'

const TRANSITION_MS = 300

type Props = {
  visible: boolean
}

// Always mounted, only opacity toggles — keeps the native blur warmed up instead of cold-starting on reveal.
export function PageBlur({ visible }: Props) {
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
        experimentalBlurMethod="dimezisBlurView"
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
