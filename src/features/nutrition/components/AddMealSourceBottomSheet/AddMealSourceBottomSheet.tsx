import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, Icon, Text } from '@/common/components';
import { styles } from './AddMealSourceBottomSheet.styles';
import type { AddMealSourceBottomSheetProps } from './AddMealSourceBottomSheet.types';

export function AddMealSourceBottomSheet({
  bottomSheetRef,
  topInset,
  onManualPress,
  onPhotoPress,
  onBarcodePress,
}: AddMealSourceBottomSheetProps) {
  const { t } = useTranslation();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSelect = useCallback(
    (action: () => void) => {
      bottomSheetRef.current?.dismiss();
      action();
    },
    [bottomSheetRef]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['48%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      topInset={topInset}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      <BottomSheetView style={styles.sheetContent}>
        <View style={styles.header}>
          <Text variant="h3" weight="semibold" align="center">
            {t('addScreen.modalTitle')}
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.subtitle}>
            {t('addScreen.modalSubtitle')}
          </Text>
        </View>

        <View style={styles.optionRow}>
          <Card
            pressable
            variant="outlined"
            accessibilityLabel={t('addScreen.captureModes.manual')}
            onPress={() => handleSelect(onManualPress)}
            style={styles.optionCard}
          >
            <View style={styles.optionIconWrap}>
              <Icon name="create-outline" variant="primary" size={28} />
            </View>
            <View style={styles.optionCopy}>
              <Text variant="body" weight="semibold" align="center">
                {t('addScreen.captureModes.manual')}
              </Text>
              <Text
                variant="caption"
                color="secondary"
                align="center"
                style={styles.optionDescription}
              >
                {t('addScreen.modeContent.manual.body')}
              </Text>
            </View>
          </Card>

          <Card
            pressable
            variant="outlined"
            accessibilityLabel={t('addScreen.captureModes.scanFood')}
            onPress={() => handleSelect(onPhotoPress)}
            style={styles.optionCard}
          >
            <View style={styles.optionIconWrap}>
              <Icon name="camera-outline" variant="primary" size={28} />
            </View>
            <View style={styles.optionCopy}>
              <Text variant="body" weight="semibold" align="center">
                {t('addScreen.captureModes.scanFood')}
              </Text>
              <Text
                variant="caption"
                color="secondary"
                align="center"
                style={styles.optionDescription}
              >
                {t('addScreen.modeContent.scanFood.body')}
              </Text>
            </View>
          </Card>

          <Card
            pressable
            variant="outlined"
            accessibilityLabel={t('addScreen.captureModes.barcode')}
            onPress={() => handleSelect(onBarcodePress)}
            style={styles.optionCard}
          >
            <View style={styles.optionIconWrap}>
              <Icon name="barcode-outline" variant="primary" size={28} />
            </View>
            <View style={styles.optionCopy}>
              <Text variant="body" weight="semibold" align="center">
                {t('addScreen.captureModes.barcode')}
              </Text>
              <Text
                variant="caption"
                color="secondary"
                align="center"
                style={styles.optionDescription}
              >
                {t('addScreen.modeContent.barcode.body')}
              </Text>
            </View>
          </Card>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
