import { Image } from 'expo-image';
import { type ComponentRef, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon, IconButton, Text } from '@/common/components';

export interface ChatComposerProps {
  value: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  /**
   * When set the field is not editable and tapping it, or "+", calls this instead (Home
   * shortcut). Otherwise "+" focuses the field, which shows the photo and barcode buttons.
   */
  onPressField?: () => void;
  imageUri?: string | null;
  onRemoveImage?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Camera / library / barcode buttons shown while the composer is expanded. */
  onCameraPress?: () => void;
  onLibraryPress?: () => void;
  onBarcodePress?: () => void;
  /** Shows a mic beside send; the Home shortcut's mic falls back to `onPressField`. */
  onMicPress?: () => void;
  /** While dictating, the mic turns into a stop button and the field says it is listening. */
  listening?: boolean;
}

/** Pill input "What did you eat today?" with photo attach and send buttons. */
export function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  onPressField,
  imageUri,
  onRemoveImage,
  disabled = false,
  autoFocus = false,
  onCameraPress,
  onLibraryPress,
  onBarcodePress,
  onMicPress,
  listening = false,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const canSend = !disabled && (value.trim().length > 0 || Boolean(imageUri));
  // The editable field grows into a taller card while typing; the Home shortcut stays a pill.
  const expanded = !onPressField && (focused || listening || value.length > 0);

  const attachButton = (
    <IconButton
      icon="add"
      variant="ghost"
      onPress={onPressField ?? (() => inputRef.current?.focus())}
      disabled={disabled}
      accessibilityLabel={t('chat.attachPhoto')}
    />
  );

  const quickActions = (
    <View style={styles.quickActions}>
      {onCameraPress ? (
        <IconButton
          icon="camera-outline"
          variant="ghost"
          onPress={onCameraPress}
          disabled={disabled}
          accessibilityLabel={t('chat.takePhoto')}
        />
      ) : null}
      {onLibraryPress ? (
        <IconButton
          icon="images-outline"
          variant="ghost"
          onPress={onLibraryPress}
          disabled={disabled}
          accessibilityLabel={t('chat.pickFromLibrary')}
        />
      ) : null}
      {onBarcodePress ? (
        <IconButton
          icon="barcode-outline"
          variant="ghost"
          onPress={onBarcodePress}
          disabled={disabled}
          accessibilityLabel={t('chat.scanBarcode')}
        />
      ) : null}
    </View>
  );

  const micButton = onMicPress ? (
    <IconButton
      icon={listening ? 'stop-circle' : 'mic-outline'}
      variant="ghost"
      color={listening ? theme.colors.state.error : undefined}
      onPress={onMicPress}
      disabled={disabled}
      accessibilityLabel={listening ? t('voice.stop') : t('chat.voiceInput')}
    />
  ) : null;

  const sendButton = (
    <Pressable
      onPress={onPressField ?? onSubmit}
      disabled={!onPressField && !canSend}
      accessibilityRole="button"
      accessibilityLabel={t('chat.send')}
      style={[styles.sendButton, !onPressField && !canSend && styles.sendDisabled]}
    >
      <Icon name="arrow-up" variant="inverse" size={20} />
    </Pressable>
  );

  return (
    <View style={styles.wrapper}>
      {imageUri ? (
        <View style={styles.preview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
          <Pressable
            onPress={onRemoveImage}
            accessibilityRole="button"
            accessibilityLabel={t('chat.removePhoto')}
            style={styles.previewRemove}
          >
            <Icon name="close" variant="inverse" size={14} />
          </Pressable>
        </View>
      ) : null}
      <Animated.View
        layout={LinearTransition.duration(180)}
        style={[styles.container, expanded && styles.containerExpanded]}
      >
        {/* Children keep fixed slots so the TextInput is not remounted (and keeps focus) on expand. */}
        <View style={styles.row}>
          {expanded ? null : attachButton}
          {onPressField ? (
            <Pressable
              onPress={onPressField}
              accessibilityRole="button"
              accessibilityLabel={t('chat.placeholder')}
              style={styles.fieldButton}
            >
              <Text variant="body" color="tertiary" numberOfLines={1} style={styles.placeholder}>
                {t('chat.placeholder')}
              </Text>
            </Pressable>
          ) : (
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              onSubmitEditing={onSubmit}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              editable={!disabled}
              autoFocus={autoFocus}
              placeholder={listening ? t('voice.listening') : t('chat.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              returnKeyType="send"
              submitBehavior="submit"
              multiline
              style={[styles.input, styles.inputFlex, expanded && styles.inputExpanded]}
            />
          )}
          {onPressField ? (
            <IconButton
              icon="mic-outline"
              variant="ghost"
              onPress={onMicPress ?? onPressField}
              accessibilityLabel={t('chat.voiceInput')}
            />
          ) : null}
          {expanded ? null : sendButton}
        </View>
        {expanded ? (
          <View style={styles.actions}>
            {quickActions}
            <View style={styles.trailingActions}>
              {micButton}
              {sendButton}
            </View>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    gap: theme.metrics.spacingV.p8,
  },
  container: {
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: theme.colors.shadow.elevationSmall,
  },
  containerExpanded: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p8,
    gap: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.xl * 1.5,
    borderColor: theme.colors.brand.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  trailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  fieldButton: {
    flex: 1,
  },
  input: {
    color: theme.colors.text.primary,
    fontSize: theme.fonts.size.md,
    paddingVertical: theme.metrics.spacingV.p8,
    maxHeight: theme.metrics.spacingV.p100,
  },
  inputFlex: {
    flex: 1,
  },
  inputExpanded: {
    minHeight: theme.metrics.spacingV.p72,
    maxHeight: theme.metrics.spacingV.p120 * 1.5,
    textAlignVertical: 'top',
  },
  placeholder: {
    paddingVertical: theme.metrics.spacingV.p8,
  },
  sendButton: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  preview: {
    alignSelf: 'flex-start',
    marginLeft: theme.metrics.spacing.p8,
  },
  previewImage: {
    width: theme.metrics.spacing.p64,
    height: theme.metrics.spacing.p64,
    borderRadius: theme.metrics.borderRadius.lg,
  },
  previewRemove: {
    position: 'absolute',
    top: -theme.metrics.spacing.p8,
    right: -theme.metrics.spacing.p8,
    width: theme.metrics.spacing.p24,
    height: theme.metrics.spacing.p24,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
}));
