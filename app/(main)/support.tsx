import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, IconButton, ScreenContainer, Text } from '@/common/components';
import { hs } from '@/theme/metrics';
import { toast } from '@/utils/toast';
import CoffeeStickImage from '../../assets/coffee-stick.webp';
import QrCodeImage from '../../assets/qr-code.webp';

export default function SupportScreen() {
  const { t } = useTranslation();
  const copyFields = [
    {
      key: 'account-number',
      label: t('supportScreen.accountNumberLabel'),
      value: t('supportScreen.accountNumber'),
      actionLabel: t('supportScreen.copyAccountNumberAction'),
    },
    {
      key: 'account-holder',
      label: t('supportScreen.accountHolderLabel'),
      value: t('supportScreen.accountHolder'),
      actionLabel: t('supportScreen.copyAccountHolderAction'),
    },
    {
      key: 'bank-name',
      label: t('supportScreen.bankLabel'),
      value: t('supportScreen.bankName'),
      actionLabel: t('supportScreen.copyBankAction'),
    },
  ] as const;

  const handleCopyValue = useCallback(
    async (value: string) => {
      await Clipboard.setStringAsync(value);
      toast.success(t('supportScreen.copySuccess'));
    },
    [t]
  );

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} title={t('supportScreen.title')}>
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <Image source={CoffeeStickImage} style={styles.heroImage} contentFit="contain" />
          </View>

          <View style={styles.introBlock}>
            <Text variant="body" weight="semibold" align="center">
              {t('supportScreen.introTitle')}
            </Text>
            <Text variant="bodySmall" color="secondary" align="center" style={styles.introText}>
              {t('supportScreen.introBody')}
            </Text>
          </View>

          <View style={styles.subtitleQrGroup}>
            <Text variant="bodySmall" weight="semibold" align="center" color="accent">
              {t('supportScreen.subtitle')}
            </Text>
            <View style={styles.qrWrap}>
              <Image source={QrCodeImage} style={styles.qrImage} contentFit="contain" />
            </View>
          </View>

          <Card variant="outlined" style={styles.copyCard}>
            <View style={styles.copyActions}>
              {copyFields.map((field) => (
                <View key={field.key} style={styles.accountRow}>
                  <View style={styles.accountText}>
                    <Text variant="caption" color="secondary">
                      {field.label}
                    </Text>
                    <Text variant="body" weight="semibold" selectable>
                      {field.value}
                    </Text>
                  </View>
                  <IconButton
                    icon="copy-outline"
                    accessibilityLabel={field.actionLabel}
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      void handleCopyValue(field.value);
                    }}
                  />
                </View>
              ))}
            </View>
          </Card>

          <Text variant="bodySmall" color="secondary" align="center">
            {t('supportScreen.thanks')}
          </Text>
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
    paddingBottom: theme.metrics.spacingV.p20,
  },
  content: {
    gap: theme.metrics.spacingV.p12,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.metrics.spacingV.p8,
  },
  heroImage: {
    width: theme.metrics.spacing.p96,
    height: theme.metrics.spacing.p96,
  },
  introBlock: {
    gap: theme.metrics.spacingV.p4,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingBottom: theme.metrics.spacingV.p4,
  },
  introText: {
    lineHeight: 20,
  },
  subtitleQrGroup: {
    gap: theme.metrics.spacing.p4,
  },
  copyCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: theme.metrics.spacing.p12 },
  accountText: { flex: 1, minWidth: 0, gap: theme.metrics.spacingV.p4 },
  copyActions: {
    gap: theme.metrics.spacingV.p8,
  },
  qrWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: hs(280),
    alignSelf: 'center',
  },
}));
