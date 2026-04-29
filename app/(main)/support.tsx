import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Dialog, Icon, ScreenContainer, Text } from '@/common/components';
import CoffeeStickImage from '../../assets/coffee-stick.png';
import QrCodeImage from '../../assets/qr-code.png';

export default function SupportScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccessVisible, setCopySuccessVisible] = useState(false);
  const accountNumber = t('supportScreen.accountNumber');
  const accountNumberToCopy = accountNumber.replace(/-/g, '');

  const handleCopyAccount = useCallback(async () => {
    if (isCopying) {
      return;
    }

    setIsCopying(true);

    try {
      await Clipboard.setStringAsync(accountNumberToCopy);
      setCopySuccessVisible(true);
    } finally {
      setIsCopying(false);
    }
  }, [accountNumberToCopy, isCopying]);

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
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

          <Button
            title={isCopying ? t('common.loading') : t('supportScreen.copyAction')}
            variant="outline"
            fullWidth
            leftIcon={<Icon name="copy-outline" size={18} color={theme.colors.brand.primary} />}
            style={styles.copyButton}
            labelStyle={styles.copyButtonLabel}
            onPress={() => {
              void handleCopyAccount();
            }}
            loading={isCopying}
          />

          <Text variant="bodySmall" color="secondary" align="center">
            {t('supportScreen.thanks')}
          </Text>
        </View>
      </View>

      <Dialog
        visible={copySuccessVisible}
        onDismiss={() => setCopySuccessVisible(false)}
        size="sm"
        actions={[
          {
            label: t('common.ok'),
            variant: 'primary',
            onPress: () => {
              setCopySuccessVisible(false);
            },
          },
        ]}
      >
        <View style={styles.copyDialogBody}>
          <View style={styles.copyDialogIcon}>
            <Text variant="h1" align="center">
              🎉
            </Text>
          </View>
          <Text variant="body" align="center" weight="semibold">
            {t('supportScreen.copyModalTitle')}
          </Text>
          <Text variant="bodySmall" align="center">
            {t('supportScreen.copyModalBody')}
          </Text>
        </View>
      </Dialog>
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
    gap: theme.metrics.spacing.p8,
  },
  qrWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.metrics.spacingV.p8,
  },
  qrImage: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: theme.metrics.borderRadius.lg,
    overflow: 'hidden',
  },
  copyButton: {
    borderColor: theme.colors.brand.primary,
  },
  copyButtonLabel: {
    color: theme.colors.brand.primary,
  },
  copyDialogBody: {
    gap: theme.metrics.spacingV.p12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyDialogIcon: {
    width: theme.metrics.spacing.p72,
    height: theme.metrics.spacing.p72,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
