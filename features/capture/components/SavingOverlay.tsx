import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Colors } from '../../../lib/design'

type Props = {
  visible: boolean
}

export function SavingOverlay({ visible }: Props) {
  if (!visible) return null

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Saving photo"
    >
      <ActivityIndicator size="large" color={Colors.surface} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
