import * as Clipboard from 'expo-clipboard';
import type { ComponentProps } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Icon, Input, ScreenContainer, Text, TextArea } from '@/common/components';
import { toast } from '@/utils/toast';

interface ContactDetailRowProps {
  iconName: ComponentProps<typeof Icon>['name'];
  label: string;
  value: string;
  helper?: string;
  copyable?: boolean;
  onPress?: () => void;
}

function ContactDetailRow({
  iconName,
  label,
  value,
  helper,
  copyable = false,
  onPress,
}: ContactDetailRowProps) {
  const { theme } = useUnistyles();

  if (copyable) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.detailRow}>
        <View style={styles.detailIconWrap}>
          <Icon name={iconName} size={20} variant="primary" color={theme.colors.icon.primary} />
        </View>
        <View style={styles.detailCopy}>
          <Text variant="bodySmall" weight="semibold">
            {label}
          </Text>
          <Text variant="caption" color="secondary">
            {value}
          </Text>
          {helper ? (
            <Text variant="caption" color="secondary" style={styles.detailHelper}>
              {helper}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Icon name={iconName} size={20} variant="primary" color={theme.colors.icon.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Text variant="bodySmall" weight="semibold">
          {label}
        </Text>
        <Text variant="caption" color="secondary">
          {value}
        </Text>
        {helper ? (
          <Text variant="caption" color="secondary" style={styles.detailHelper}>
            {helper}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ContactScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyValue = useCallback(
    async (value: string) => {
      await Clipboard.setStringAsync(value);
      toast.success(t('contactScreen.copySuccess'));
    },
    [t]
  );

  const handleSubmit = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    toast.success(t('contactScreen.submitSuccess'));
    setIsSubmitting(false);
  }, [isSubmitting, t]);

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={styles.detailsBlock}>
            <ContactDetailRow
              iconName="mail-outline"
              label={t('contactScreen.emailLabel')}
              value={t('contactScreen.emailValue')}
              helper={t('contactScreen.copyHint')}
              copyable
              onPress={() => {
                void copyValue(t('contactScreen.emailValue'));
              }}
            />
            <ContactDetailRow
              iconName="call-outline"
              label={t('contactScreen.phoneLabel')}
              value={t('contactScreen.phoneValue')}
              helper={t('contactScreen.copyHint')}
              copyable
              onPress={() => {
                void copyValue(t('contactScreen.phoneValue'));
              }}
            />
          </View>

          <Card variant="elevated" style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text variant="body" weight="bold">
                {t('contactScreen.formTitle')}
              </Text>
              <Text variant="caption" color="secondary">
                {t('contactScreen.formSubtitle')}
              </Text>
            </View>

            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={t('contactScreen.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextArea
              value={problem}
              onChangeText={setProblem}
              placeholder={t('contactScreen.problemPlaceholder')}
              numberOfLines={6}
            />

            <Button
              title={isSubmitting ? t('common.loading') : t('contactScreen.submitAction')}
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              loading={isSubmitting}
              style={styles.submitButton}
              labelStyle={styles.submitButtonLabel}
            />
          </Card>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p16,
    paddingBottom: theme.metrics.spacingV.p24,
    backgroundColor: theme.colors.background.app,
  },
  content: {
    gap: theme.metrics.spacingV.p16,
  },
  detailsBlock: {
    gap: theme.metrics.spacingV.p8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  detailIconWrap: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  detailHelper: {
    lineHeight: theme.fonts.size.md,
  },
  formCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
  },
  formHeader: {
    gap: theme.metrics.spacingV.p4,
  },
  submitButton: {
    marginTop: theme.metrics.spacingV.p4,
  },
  submitButtonLabel: {
    color: theme.colors.brand.onBrand,
  },
}));
