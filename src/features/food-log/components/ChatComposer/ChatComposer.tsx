import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon, IconButton, Text } from '@/common/components';

export interface ChatComposerProps {
  value: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  onAttachPress: () => void;
  /** When set the field is not editable and tapping it calls this instead (Home shortcut). */
  onPressField?: () => void;
  imageUri?: string | null;
  onRemoveImage?: () => void;
  disabled?: boolean;
}

/** Pill input "What did you eat today?" with photo attach and send buttons. */
export function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  onAttachPress,
  onPressField,
  imageUri,
  onRemoveImage,
  disabled = false,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const canSend = !disabled && (value.trim().length > 0 || Boolean(imageUri));

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
      <View style={styles.container}>
        <IconButton
          icon="add"
          variant="ghost"
          onPress={onAttachPress}
          disabled={disabled}
          accessibilityLabel={t('chat.attachPhoto')}
        />
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
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            editable={!disabled}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={theme.colors.text.tertiary}
            returnKeyType="send"
            submitBehavior="submit"
            multiline
            style={[styles.input, styles.inputFlex]}
          />
        )}
        {onPressField ? (
          <IconButton
            icon="mic-outline"
            variant="ghost"
            onPress={onPressField}
            accessibilityLabel={t('chat.voiceInput')}
          />
        ) : null}
        <Pressable
          onPress={onPressField ?? onSubmit}
          disabled={!onPressField && !canSend}
          accessibilityRole="button"
          accessibilityLabel={t('chat.send')}
          style={[styles.sendButton, !onPressField && !canSend && styles.sendDisabled]}
        >
          <Icon name="arrow-up" variant="inverse" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    gap: theme.metrics.spacingV.p8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
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
