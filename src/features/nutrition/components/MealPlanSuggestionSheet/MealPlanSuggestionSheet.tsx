import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Button, Chip, Icon, Switch, Text, TextArea } from '@/common/components';
import { useMealPlanSuggestionSheetStore } from '@/features/nutrition/stores/useMealPlanSuggestionSheetStore';
import { toast } from '@/utils/toast';
import { styles } from './MealPlanSuggestionSheet.styles';

type MealPlanCriterion = 'quick' | 'cheap' | 'satiating' | 'protein';

interface MealPlanSuggestionSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModalType | null>;
  topInset?: number;
  onSheetChange?: (index: number) => void;
}

const DEFAULT_CRITERIA: MealPlanCriterion[] = [];

export function MealPlanSuggestionSheet({
  bottomSheetRef,
  topInset,
  onSheetChange,
}: MealPlanSuggestionSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const sheetState = useMealPlanSuggestionSheetStore((state) => state.sheetState);
  const setSheetState = useMealPlanSuggestionSheetStore((state) => state.setSheetState);
  const [preferRecentFoods, setPreferRecentFoods] = useState(true);
  const [availableIngredients, setAvailableIngredients] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [criteria, setCriteria] = useState<MealPlanCriterion[]>(DEFAULT_CRITERIA);

  useEffect(() => {
    if (sheetState === 'opening') {
      setPreferRecentFoods(true);
      setAvailableIngredients('');
      setContraindications('');
      setCriteria(DEFAULT_CRITERIA);
    }
  }, [sheetState]);

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

  const handleDismiss = useCallback(() => {
    setSheetState('closed');
  }, [setSheetState]);

  const toggleCriterion = useCallback((criterion: MealPlanCriterion) => {
    setCriteria((current) =>
      current.includes(criterion)
        ? current.filter((item) => item !== criterion)
        : [...current, criterion]
    );
  }, []);

  const criterionOptions = useMemo(
    () => [
      {
        value: 'quick' as const,
        label: t('menuScreen.aiForm.criteria.quick'),
        iconName: 'flash-outline' as const,
      },
      {
        value: 'cheap' as const,
        label: t('menuScreen.aiForm.criteria.cheap'),
        iconName: 'wallet-outline' as const,
      },
      {
        value: 'satiating' as const,
        label: t('menuScreen.aiForm.criteria.satiating'),
        iconName: 'restaurant-outline' as const,
      },
      {
        value: 'protein' as const,
        label: t('menuScreen.aiForm.criteria.protein'),
        iconName: 'fitness-outline' as const,
      },
    ],
    [t]
  );

  const handleGenerate = useCallback(() => {
    toast.success(t('menuScreen.aiForm.submitted'));
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef, t]);

  const handleViewMoreRecentFoods = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    router.push('/recently-food');
  }, [bottomSheetRef, router]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['90%', '100%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      topInset={topInset}
      onChange={onSheetChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + theme.metrics.spacingV.p48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheetContent}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text variant="h3">{t('menuScreen.aiForm.title')}</Text>
              <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
                {t('menuScreen.aiForm.subtitle')}
              </Text>
            </View>
            <View style={styles.sparkleGroup} pointerEvents="none">
              <Icon name="sparkles-outline" size={24} color={theme.colors.brand.primaryVariant} />
            </View>
          </View>

          <View style={styles.switchCard}>
            <View style={styles.switchCopy}>
              <Text variant="body" weight="semibold">
                {t('menuScreen.aiForm.recentLabel')}
              </Text>
              <Text variant="caption" color="secondary">
                {t('menuScreen.aiForm.recentHint')}
              </Text>
            </View>
            <View style={styles.switchActions}>
              <Switch value={preferRecentFoods} onValueChange={setPreferRecentFoods} />
              <Button
                title={t('menuScreen.aiForm.recentViewMore')}
                variant="ghost"
                size="sm"
                rightIcon={<Icon name="chevron-forward" size={16} variant="primary" />}
                onPress={handleViewMoreRecentFoods}
                style={styles.recentViewMoreButton}
              />
            </View>
          </View>

          <TextArea
            label={t('menuScreen.aiForm.ingredientsLabel')}
            value={availableIngredients}
            onChangeText={setAvailableIngredients}
            placeholder={t('menuScreen.aiForm.ingredientsPlaceholder')}
            numberOfLines={4}
          />

          <TextArea
            label={t('menuScreen.aiForm.contraindicationsLabel')}
            value={contraindications}
            onChangeText={setContraindications}
            placeholder={t('menuScreen.aiForm.contraindicationsPlaceholder')}
            numberOfLines={4}
          />

          <View style={styles.sectionBlock}>
            <Text variant="body" weight="bold">
              {t('menuScreen.aiForm.criteriaLabel')}
            </Text>
            <Text variant="caption" color="secondary">
              {t('menuScreen.aiForm.criteriaHint')}
            </Text>
            <View style={styles.chipWrap}>
              {criterionOptions.map((criterion) => (
                <Chip
                  key={criterion.value}
                  text={criterion.label}
                  icon={
                    <Icon
                      name={criterion.iconName}
                      size={14}
                      variant={criteria.includes(criterion.value) ? 'inverse' : 'secondary'}
                    />
                  }
                  selected={criteria.includes(criterion.value)}
                  onPress={() => {
                    toggleCriterion(criterion.value);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <View style={styles.actionsSpacer} />
            <Button
              title={t('common.cancel')}
              variant="outline"
              onPress={() => {
                bottomSheetRef.current?.dismiss();
              }}
            />
            <Button
              title={t('menuScreen.aiForm.generateAction')}
              variant="primary"
              onPress={handleGenerate}
            />
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
