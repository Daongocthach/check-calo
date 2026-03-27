import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Icon, ScreenContainer, Text } from '@/common/components';
import { deleteFoodEntry, getFoodEntryById } from '@/features/nutrition/services/nutritionDatabase';
import { useAppAlert } from '@/providers/app-alert';
import { hs, vs } from '@/theme/metrics';

type ResultMode = 'scanFood' | 'barcode' | 'manual';

interface ResultPreset {
  mealLabel: string;
  title: string;
  subtitle: string;
  healthScore: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  quantity: number;
  barcodeValue: string;
}

const FALLBACK_IMAGE_URI =
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80';

function parseMetricValue(value: string | string[] | undefined, fallback: number) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const matchedValue = value.match(/\d+/);

  if (!matchedValue) {
    return fallback;
  }

  const parsedValue = Number(matchedValue[0]);

  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function toResultMode(value: string | string[] | undefined): ResultMode {
  if (value === 'barcode' || value === 'manual') {
    return value;
  }

  return 'scanFood';
}

function getModePreset(
  mode: ResultMode,
  barcodeValue: string | string[] | undefined,
  params: {
    title?: string;
    subtitle?: string;
    calories?: string;
    carbs?: string;
    protein?: string;
    fat?: string;
  },
  t: ReturnType<typeof useTranslation>['t']
): ResultPreset {
  if (typeof params.title === 'string' && params.title.length > 0) {
    return {
      mealLabel: t('addScreen.result.mealTypes.lunch'),
      title: params.title,
      subtitle:
        typeof params.subtitle === 'string' && params.subtitle.length > 0
          ? params.subtitle
          : t('addScreen.result.presets.manual.subtitle'),
      healthScore: 76,
      calories: parseMetricValue(params.calories, 420),
      carbs: parseMetricValue(params.carbs, 42),
      protein: parseMetricValue(params.protein, 24),
      fat: parseMetricValue(params.fat, 14),
      quantity: 1,
      barcodeValue: '',
    };
  }

  if (mode === 'barcode') {
    return {
      mealLabel: t('addScreen.result.mealTypes.snack'),
      title: t('addScreen.result.presets.barcode.title'),
      subtitle: t('addScreen.result.presets.barcode.subtitle'),
      healthScore: 81,
      calories: 235,
      carbs: 29,
      protein: 12,
      fat: 9,
      quantity: 1,
      barcodeValue:
        typeof barcodeValue === 'string' && barcodeValue.length > 0
          ? barcodeValue
          : '8938501434012',
    };
  }

  if (mode === 'manual') {
    return {
      mealLabel: t('addScreen.result.mealTypes.lunch'),
      title: t('addScreen.result.presets.manual.title'),
      subtitle: t('addScreen.result.presets.manual.subtitle'),
      healthScore: 74,
      calories: 420,
      carbs: 42,
      protein: 24,
      fat: 14,
      quantity: 1,
      barcodeValue: '',
    };
  }

  return {
    mealLabel: t('addScreen.result.mealTypes.breakfast'),
    title: t('addScreen.result.presets.scanFood.title'),
    subtitle: t('addScreen.result.presets.scanFood.subtitle'),
    healthScore: 70,
    calories: 615,
    carbs: 93,
    protein: 18,
    fat: 22,
    quantity: 1,
    barcodeValue: '',
  };
}

export default function FoodResultScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const appAlert = useAppAlert();
  const params = useLocalSearchParams<{
    mode?: string;
    imageUri?: string;
    barcodeValue?: string;
    entryId?: string;
    title?: string;
    subtitle?: string;
    calories?: string;
    carbs?: string;
    protein?: string;
    fat?: string;
  }>();
  const [entryData, setEntryData] = useState<{
    id: string;
    title: string;
    subtitle: string;
    calories: string;
    carbs: string;
    protein: string;
    fat: string;
    notes: string;
  } | null>(null);
  const mode = toResultMode(params.mode);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (typeof params.entryId !== 'string' || !params.entryId) {
        setEntryData(null);
        return undefined;
      }

      void getFoodEntryById(params.entryId).then((entry) => {
        if (!active || !entry) {
          return;
        }

        const consumedAt = new Date(entry.consumedAt);
        const hours = consumedAt.getHours().toString().padStart(2, '0');
        const minutes = consumedAt.getMinutes().toString().padStart(2, '0');

        setEntryData({
          id: entry.id,
          title: entry.mealName,
          subtitle: `${hours}:${minutes} • ${entry.quantityLabel}`,
          calories: `${Math.round(entry.totalCalories)} kcal`,
          carbs: `${Math.round(entry.carbsGrams)} g`,
          protein: `${Math.round(entry.proteinGrams)} g`,
          fat: `${Math.round(entry.fatGrams)} g`,
          notes: entry.notes ?? '',
        });
      });

      return () => {
        active = false;
      };
    }, [params.entryId])
  );

  const preset = useMemo(
    () =>
      getModePreset(
        mode,
        params.barcodeValue,
        {
          title: entryData?.title ?? params.title,
          subtitle: entryData?.subtitle ?? params.subtitle,
          calories: entryData?.calories ?? params.calories,
          carbs: entryData?.carbs ?? params.carbs,
          protein: entryData?.protein ?? params.protein,
          fat: entryData?.fat ?? params.fat,
        },
        t
      ),
    [
      entryData?.calories,
      entryData?.carbs,
      entryData?.fat,
      entryData?.protein,
      entryData?.subtitle,
      entryData?.title,
      mode,
      params.barcodeValue,
      params.calories,
      params.carbs,
      params.fat,
      params.protein,
      params.subtitle,
      params.title,
      t,
    ]
  );
  const [quantity, setQuantity] = useState(preset.quantity);
  const nutritionScoreWidth = `${preset.healthScore}%` as const;
  const imageUri =
    typeof params.imageUri === 'string' && params.imageUri.length > 0
      ? params.imageUri
      : FALLBACK_IMAGE_URI;

  const handleDeleteEntry = () => {
    if (!entryData) {
      return;
    }

    appAlert.alert(
      t('foodDetail.deleteTitle'),
      t('foodDetail.deleteMessage', { mealName: entryData.title }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void deleteFoodEntry(entryData.id).then(() => {
              router.back();
            });
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <Image source={{ uri: imageUri }} style={styles.heroImage} contentFit="cover" />
            <LinearGradient
              colors={[theme.colors.overlay.focus, theme.colors.overlay.modal]}
              style={styles.heroOverlay}
            >
              <View style={styles.heroLabel}>
                <Text variant="bodySmall" weight="medium" style={styles.heroLabelText}>
                  {t('addScreen.result.photoLabel')}
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text variant="caption" color="secondary">
                {preset.mealLabel}
              </Text>
              <Text variant="h2" weight="bold">
                {preset.title}
              </Text>
              <Text variant="bodySmall" color="secondary">
                {preset.subtitle}
              </Text>
            </View>

            {entryData?.notes ? (
              <View style={styles.notesCard}>
                <Text variant="caption" color="secondary">
                  {t('manualFoodEntry.fields.notes')}
                </Text>
                <Text variant="bodySmall">{entryData.notes}</Text>
              </View>
            ) : null}

            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <View style={styles.scoreTitleRow}>
                  <Icon name="sparkles-outline" variant="primary" size={18} />
                  <Text variant="body" weight="semibold" style={styles.scoreTitle}>
                    {t('addScreen.result.healthScore')}
                  </Text>
                </View>
                <Text variant="body" weight="bold">
                  {preset.healthScore}%
                </Text>
              </View>
              <View style={styles.scoreBarTrack}>
                <LinearGradient
                  colors={theme.colors.gradient.primary}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.scoreBarFill, { width: nutritionScoreWidth }]}
                />
              </View>
            </View>

            <View style={styles.quantityRow}>
              <Text variant="bodySmall" color="secondary">
                {t('addScreen.result.quantity')}
              </Text>
              <View style={styles.quantityControl}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('addScreen.result.decreaseQuantity')}
                  style={styles.quantityButton}
                  onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Icon name="remove" variant="primary" size={16} />
                </Pressable>
                <Text variant="body" weight="semibold">
                  {quantity}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('addScreen.result.increaseQuantity')}
                  style={styles.quantityButton}
                  onPress={() => setQuantity((current) => current + 1)}
                >
                  <Icon name="add" variant="primary" size={16} />
                </Pressable>
              </View>
            </View>

            {mode === 'barcode' ? (
              <View style={styles.barcodeCard}>
                <Text variant="caption" color="secondary">
                  {t('addScreen.result.barcodeLabel')}
                </Text>
                <Text variant="body" weight="semibold">
                  {preset.barcodeValue}
                </Text>
              </View>
            ) : null}

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, styles.metricCardPrimary]}>
                <Text variant="bodySmall" color="secondary">
                  {t('addScreen.result.metrics.calories')}
                </Text>
                <Text variant="h2" weight="bold">
                  {preset.calories * quantity}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('addScreen.result.metrics.gramsUnit')}
                </Text>
              </View>

              <View style={[styles.metricCard, styles.metricCardAccent]}>
                <Text variant="bodySmall" color="secondary">
                  {t('addScreen.result.metrics.carbs')}
                </Text>
                <Text variant="h2" weight="bold">
                  {preset.carbs * quantity}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('addScreen.result.metrics.gramsUnit')}
                </Text>
              </View>
            </View>

            <View style={styles.proteinCard}>
              <View style={styles.macroSummaryRow}>
                <View style={styles.macroSummaryItem}>
                  <Text variant="bodySmall" color="secondary">
                    {t('addScreen.result.metrics.protein')}
                  </Text>
                  <Text variant="h3" weight="bold">
                    {preset.protein * quantity} {t('addScreen.result.metrics.gramsShort')}
                  </Text>
                </View>

                <View style={styles.macroSummaryItem}>
                  <Text variant="bodySmall" color="secondary">
                    {t('addScreen.result.metrics.fat')}
                  </Text>
                  <Text variant="h3" weight="bold">
                    {preset.fat * quantity} {t('addScreen.result.metrics.gramsShort')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomActionBar}>
          <View style={styles.actionRow}>
            <Button
              title={t('addScreen.result.fixResults')}
              variant="secondary"
              style={styles.secondaryButton}
              onPress={() => {
                if (entryData) {
                  router.push({
                    pathname: '/manual-food-entry',
                    params: {
                      entryId: entryData.id,
                    },
                  });
                  return;
                }

                router.push('/manual-food-entry');
              }}
            />
            <Button
              title={t('common.done')}
              style={styles.primaryButton}
              onPress={() => router.back()}
            />
          </View>

          {entryData ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('foodDetail.deleteAction')}
              style={styles.deleteAction}
              onPress={handleDeleteEntry}
            >
              <Text variant="bodySmall" weight="semibold" style={styles.deleteActionText}>
                {t('foodDetail.deleteAction')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacing.p120,
    gap: theme.metrics.spacingV.p16,
  },
  heroCard: {
    minHeight: vs(310),
    borderRadius: theme.metrics.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.surface,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    flex: 1,
    padding: theme.metrics.spacing.p16,
    justifyContent: 'flex-end',
  },
  heroLabel: {
    alignSelf: 'center',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.overlay.modal,
  },
  heroLabelText: {
    color: theme.colors.text.inverse,
  },
  detailSheet: {
    marginTop: -vs(44),
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    padding: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p16,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  detailHeader: {
    gap: theme.metrics.spacingV.p8,
  },
  notesCard: {
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  scoreCard: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.section,
    padding: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p12,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  scoreTitle: {
    flexShrink: 1,
  },
  scoreBarTrack: {
    height: vs(12),
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  quantityButton: {
    width: theme.metrics.spacing.p28,
    height: theme.metrics.spacing.p28,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  barcodeCard: {
    borderRadius: theme.metrics.borderRadius.xl,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.section,
    gap: theme.metrics.spacingV.p8,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  metricCard: {
    flex: 1,
    minHeight: vs(126),
    borderRadius: theme.metrics.borderRadius.xl,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p16,
    justifyContent: 'space-between',
  },
  metricCardPrimary: {
    backgroundColor: theme.colors.state.infoBg,
  },
  metricCardAccent: {
    backgroundColor: theme.colors.state.warningBg,
  },
  proteinCard: {
    borderRadius: theme.metrics.borderRadius.xl,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.section,
    gap: theme.metrics.spacingV.p8,
  },
  macroSummaryRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  macroSummaryItem: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  bottomActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p24,
    backgroundColor: theme.colors.background.app,
  },
  deleteAction: {
    alignSelf: 'center',
    paddingVertical: theme.metrics.spacingV.p8,
  },
  deleteActionText: {
    color: theme.colors.state.error,
  },
  secondaryButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 1,
    minWidth: hs(128),
  },
}));
