import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button } from '@/common/components/Button';
import { Text } from '@/common/components/Text';
import { styles } from './Dialog.styles';
import type { DialogProps } from './Dialog.types';

/**
 * A modal dialog overlay for confirmations, alerts, or custom content.
 *
 * @example
 * ```tsx
 * <Dialog
 *   visible={isOpen}
 *   onDismiss={() => setIsOpen(false)}
 *   title="Confirm"
 *   message="Are you sure?"
 *   actions={[{ label: 'OK', onPress: handleConfirm }]}
 * />
 * ```
 */
export function Dialog({
  visible,
  onDismiss,
  title,
  message,
  actions = [],
  children,
  size = 'md',
  dismissOnBackdropPress = true,
  keyboardAware = false,
  keyboardOffset = 0,
}: DialogProps) {
  styles.useVariants({ size });

  const content = (
    <>
      {title && (
        <Text variant="body" weight="bold" style={styles.title}>
          {title}
        </Text>
      )}
      {message && (
        <Text variant="body" style={styles.message}>
          {message}
        </Text>
      )}
      {children}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPressable}
          onPress={dismissOnBackdropPress ? onDismiss : undefined}
        />
        {keyboardAware ? (
          <KeyboardAvoidingView
            style={styles.keyboardWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={keyboardOffset}
          >
            <View style={[styles.card, styles.keyboardCard]}>
              <ScrollView
                style={styles.keyboardScroll}
                contentContainerStyle={styles.keyboardScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {content}
              </ScrollView>
              {actions.length > 0 && (
                <View style={styles.keyboardActions}>
                  <View style={styles.actions}>
                    {actions.map((action) => (
                      <Button
                        key={action.label}
                        title={action.label}
                        variant={action.variant ?? 'ghost'}
                        size="sm"
                        onPress={action.onPress}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.card}>
            {content}
            {actions.length > 0 && (
              <View style={styles.actions}>
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    title={action.label}
                    variant={action.variant ?? 'ghost'}
                    size="sm"
                    onPress={action.onPress}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
