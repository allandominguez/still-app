import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Colors, Spacing, Typography } from '../../../lib/design'

type Props = {
  visible: boolean
  // A past day can only be backfilled from an existing photo — a camera shot taken
  // "now" can't represent a day that's already gone, so the option is hidden entirely.
  allowCamera: boolean
  onTakePhoto: () => void
  onChooseFromGallery: () => void
  onDismiss: () => void
}

export function PhotoPickerSheet({
  visible,
  allowCamera,
  onTakePhoto,
  onChooseFromGallery,
  onDismiss,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <Pressable
          style={styles.overlay}
          onPress={onDismiss}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {allowCamera ? "Add today's photo" : 'Add photo for this day'}
          </Text>
          <View style={styles.divider} />
          {allowCamera && (
            <>
              <Pressable
                style={styles.option}
                onPress={onTakePhoto}
                accessibilityRole="button"
                accessibilityLabel="Take photo"
              >
                <Text style={styles.optionText}>Take photo</Text>
              </Pressable>
              <View style={styles.divider} />
            </>
          )}
          <Pressable
            style={styles.option}
            onPress={onChooseFromGallery}
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
          >
            <Text style={styles.optionText}>Choose from gallery</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.option}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.labelXs,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  option: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  optionText: {
    ...Typography.bodyLg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cancelText: {
    ...Typography.labelMd,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
})
