import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Dialog, Icon, ScreenContainer, Text } from '@/common/components';
import { toast } from '@/utils/toast';
import CoffeeStickImage from '../../assets/coffee-stick.png';
import QrCodeImage from '../../assets/qr-code.png';

export default function SupportScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);

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

  const handleSaveImage = useCallback(async () => {
    if (isSavingImage) {
      return;
    }

    setIsSavingImage(true);

    try {
      const permission = await MediaLibrary.getPermissionsAsync();
      let hasPermission = permission.status === 'granted';

      if (!hasPermission) {
        const nextPermission = await MediaLibrary.requestPermissionsAsync();
        hasPermission = nextPermission.status === 'granted';
      }

      if (!hasPermission) {
        toast.error(t('supportScreen.saveImagePermissionDenied'));
        return;
      }

      const asset = Asset.fromModule(QrCodeImage);
      await asset.downloadAsync();

      const imageUri = asset.localUri ?? asset.uri;

      if (!imageUri) {
        toast.error(t('supportScreen.saveImageFailed'));
        return;
      }

      await MediaLibrary.saveToLibraryAsync(imageUri);
      setSaveSuccessVisible(true);
    } catch {
      toast.error(t('supportScreen.saveImageFailed'));
    } finally {
      setIsSavingImage(false);
    }
  }, [isSavingImage, t]);

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

          <Card variant="outlined" style={styles.copyCard}>
            <View style={styles.copyCardHeader}>
              <Text variant="bodySmall" weight="semibold" align="center">
                {t('supportScreen.copySectionTitle')}
              </Text>
            </View>
            <View style={styles.copyActions}>
              {copyFields.map((field) => (
                <Button
                  key={field.key}
                  title={field.actionLabel}
                  variant="outline"
                  fullWidth
                  leftIcon={
                    <Icon name="copy-outline" size={18} color={theme.colors.brand.primary} />
                  }
                  style={styles.copyButton}
                  labelStyle={styles.copyButtonLabel}
                  onPress={() => {
                    void handleCopyValue(field.value);
                  }}
                />
              ))}
            </View>
          </Card>

          <Button
            title={isSavingImage ? t('common.loading') : t('supportScreen.saveImageAction')}
            variant="outline"
            fullWidth
            leftIcon={<Icon name="download-outline" size={18} color={theme.colors.brand.primary} />}
            style={styles.copyButton}
            labelStyle={styles.copyButtonLabel}
            onPress={() => {
              void handleSaveImage();
            }}
            loading={isSavingImage}
          />

          <Text variant="bodySmall" color="secondary" align="center">
            {t('supportScreen.thanks')}
          </Text>
        </View>
      </View>

      <Dialog
        visible={saveSuccessVisible}
        onDismiss={() => setSaveSuccessVisible(false)}
        size="sm"
        actions={[
          {
            label: t('common.ok'),
            variant: 'primary',
            onPress: () => {
              setSaveSuccessVisible(false);
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
            {t('supportScreen.saveImageModalTitle')}
          </Text>
          <Text variant="bodySmall" align="center">
            {t('supportScreen.saveImageModalBody')}
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
  copyCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
  },
  copyCardHeader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyActions: {
    gap: theme.metrics.spacingV.p8,
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
