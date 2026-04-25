import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Card, Icon, ScreenContainer, SupportPromptCard, Text } from '@/common/components';
import {
  enqueueFoodEntryImageSync,
  processPendingFoodEntryImageSyncQueue,
} from '@/features/nutrition/services/foodEntrySyncQueue';
import { listManualMeals } from '@/features/nutrition/services/manualMealsDatabase';
import {
  createFoodEntry,
  getFavoriteFoodById,
  getFoodEntryById,
} from '@/features/nutrition/services/nutritionDatabase';
import { formatMealWeight } from '@/features/nutrition/utils/quantity';
import { toast } from '@/utils/toast';

type FoodDetailSource = 'ai' | 'barcode' | 'entry' | 'favorite' | 'manual';

interface FoodDetailSearchParams {
  source?: FoodDetailSource;
  entryId?: string;
  favoriteId?: string;
  mealLocalId?: string;
  itemLocalId?: string;
  foodName?: string;
  quantityLabel?: string;
  quantityGrams?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  notes?: string;
  imageUri?: string;
  thumbnailUri?: string;
  consumedAt?: string;
}

interface FoodDetailData {
  source: FoodDetailSource;
  title: string;
  quantityLabel: string;
  quantityGrams: number | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
  imageUri: string | null;
  thumbnailUri: string | null;
  consumedAt: string | null;
}

const NOTE_CHAR_LIMIT = 200;

function parseNumber(value: string | undefined) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 0;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseQuantityGrams(value: string | undefined) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function toDisplayDate(value: string | null, locale: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function resolveSource(params: FoodDetailSearchParams): FoodDetailSource {
  if (params.source) {
    return params.source;
  }

  if (typeof params.entryId === 'string' && params.entryId.length > 0) {
    return 'entry';
  }

  if (typeof params.favoriteId === 'string' && params.favoriteId.length > 0) {
    return 'favorite';
  }

  if (
    typeof params.mealLocalId === 'string' &&
    params.mealLocalId.length > 0 &&
    typeof params.itemLocalId === 'string' &&
    params.itemLocalId.length > 0
  ) {
    return 'manual';
  }

  return 'barcode';
}

function toFoodDetailDataFromParams(
  params: FoodDetailSearchParams,
  source: FoodDetailSource,
  t: TFunction
): FoodDetailData {
  const quantityGrams = parseQuantityGrams(params.quantityGrams);

  return {
    source,
    title: params.foodName?.trim() || t('foodDetail.unknownFoodName'),
    quantityLabel:
      quantityGrams !== null
        ? String(Math.round(quantityGrams))
        : params.quantityLabel?.trim() || t('foodDetail.defaultQuantity'),
    quantityGrams,
    calories: Math.max(0, Math.round(parseNumber(params.calories))),
    proteinGrams: Math.max(0, Math.round(parseNumber(params.protein))),
    carbsGrams: Math.max(0, Math.round(parseNumber(params.carbs))),
    fatGrams: Math.max(0, Math.round(parseNumber(params.fat))),
    notes: params.notes?.trim() || null,
    imageUri: params.imageUri?.trim() || null,
    thumbnailUri: params.thumbnailUri?.trim() || null,
    consumedAt: params.consumedAt?.trim() || null,
  };
}

function getSourceLabel(source: FoodDetailSource, t: TFunction) {
  switch (source) {
    case 'ai':
      return t('foodDetail.sourceLabels.ai');
    case 'barcode':
      return t('foodDetail.sourceLabels.barcode');
    case 'entry':
      return t('foodDetail.sourceLabels.entry');
    case 'favorite':
      return t('foodDetail.sourceLabels.favorite');
    case 'manual':
      return t('foodDetail.sourceLabels.manual');
  }
}

function getQuantityDisplay(detail: FoodDetailData, gramUnit: string) {
  if (detail.quantityGrams !== null) {
    return formatMealWeight(detail.quantityGrams, detail.quantityLabel, gramUnit);
  }

  const trimmedLabel = detail.quantityLabel.trim();
  if (/^\d+(\.\d+)?$/.test(trimmedLabel)) {
    return `${trimmedLabel} ${gramUnit}`;
  }

  return detail.quantityLabel;
}

function getSourcePillStyle(source: FoodDetailSource) {
  switch (source) {
    case 'ai':
      return styles.sourcePillAi;
    case 'barcode':
      return styles.sourcePillBarcode;
    default:
      return styles.sourcePillSaved;
  }
}

export default function FoodDetailScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<FoodDetailData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const typedParams = params as Record<string, string | undefined>;
  const source = resolveSource({
    source:
      typedParams.source === 'ai' ||
      typedParams.source === 'barcode' ||
      typedParams.source === 'entry' ||
      typedParams.source === 'favorite' ||
      typedParams.source === 'manual'
        ? typedParams.source
        : undefined,
    entryId: typedParams.entryId,
    favoriteId: typedParams.favoriteId,
    mealLocalId: typedParams.mealLocalId,
    itemLocalId: typedParams.itemLocalId,
  });
  const entryId = typedParams.entryId ?? '';
  const favoriteId = typedParams.favoriteId ?? '';
  const mealLocalId = typedParams.mealLocalId ?? '';
  const itemLocalId = typedParams.itemLocalId ?? '';

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);

      try {
        if (entryId) {
          const entry = await getFoodEntryById(entryId);

          if (entry && active) {
            setDetail({
              source: 'entry',
              title: entry.mealName,
              quantityLabel: formatMealWeight(
                entry.quantityGrams,
                entry.quantityLabel,
                t('common.units.gram')
              ),
              quantityGrams: entry.quantityGrams ?? null,
              calories: Math.round(entry.totalCalories),
              proteinGrams: Math.round(entry.proteinGrams),
              carbsGrams: Math.round(entry.carbsGrams),
              fatGrams: Math.round(entry.fatGrams),
              notes: entry.notes,
              imageUri: entry.imageUri ?? null,
              thumbnailUri: entry.thumbnailUri ?? null,
              consumedAt: entry.consumedAt,
            });
            return;
          }
        } else if (favoriteId) {
          const favorite = await getFavoriteFoodById(favoriteId);

          if (favorite && active) {
            setDetail({
              source: 'favorite',
              title: favorite.name,
              quantityLabel: formatMealWeight(
                favorite.quantityGrams,
                favorite.quantityLabel,
                t('common.units.gram')
              ),
              quantityGrams: favorite.quantityGrams ?? null,
              calories: Math.round(favorite.totalCalories),
              proteinGrams: Math.round(favorite.proteinGrams),
              carbsGrams: Math.round(favorite.carbsGrams),
              fatGrams: Math.round(favorite.fatGrams),
              notes: favorite.notes,
              imageUri: favorite.imageUri ?? null,
              thumbnailUri: favorite.thumbnailUri ?? null,
              consumedAt: null,
            });
            return;
          }
        } else if (mealLocalId && itemLocalId) {
          const meals = await listManualMeals();
          const meal = meals.find((mealItem) => mealItem.localId === mealLocalId);
          const item = meal?.items.find((mealItem) => mealItem.localId === itemLocalId);

          if (meal && item && active) {
            const quantityGrams =
              item.quantityGrams !== null && item.quantityGrams !== undefined
                ? item.quantityGrams * item.servings
                : null;

            setDetail({
              source: 'manual',
              title: item.title,
              quantityLabel: formatMealWeight(
                quantityGrams,
                item.quantityLabel,
                t('common.units.gram')
              ),
              quantityGrams,
              calories: Math.round(item.totalCalories * item.servings),
              proteinGrams: Math.round(item.proteinGrams * item.servings),
              carbsGrams: Math.round(item.carbsGrams * item.servings),
              fatGrams: Math.round(item.fatGrams * item.servings),
              notes: item.notes ?? meal.note,
              imageUri: item.imageUri ?? null,
              thumbnailUri: item.thumbnailUri ?? null,
              consumedAt: meal.eatenAt,
            });
            return;
          }
        }

        if (active) {
          setDetail(
            toFoodDetailDataFromParams(
              {
                source: source === 'barcode' ? 'barcode' : source,
                foodName: typedParams.foodName,
                quantityLabel: typedParams.quantityLabel,
                quantityGrams: typedParams.quantityGrams,
                calories: typedParams.calories,
                protein: typedParams.protein,
                carbs: typedParams.carbs,
                fat: typedParams.fat,
                notes: typedParams.notes,
                imageUri: typedParams.imageUri,
                thumbnailUri: typedParams.thumbnailUri,
                consumedAt: typedParams.consumedAt,
              },
              source,
              t
            )
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [
    entryId,
    favoriteId,
    itemLocalId,
    mealLocalId,
    typedParams.calories,
    typedParams.carbs,
    typedParams.consumedAt,
    typedParams.fat,
    typedParams.foodName,
    typedParams.imageUri,
    typedParams.notes,
    typedParams.protein,
    typedParams.quantityGrams,
    typedParams.quantityLabel,
    typedParams.thumbnailUri,
    source,
    t,
  ]);

  const macroValues = useMemo(() => {
    if (!detail) {
      return [];
    }

    const maxValue = Math.max(detail.proteinGrams, detail.carbsGrams, detail.fatGrams, 1);

    return [
      {
        key: 'protein',
        label: t('statsScreen.macros.protein'),
        value: detail.proteinGrams,
        tone: 'success' as const,
        fill: Math.max(18, Math.round((detail.proteinGrams / maxValue) * 100)),
      },
      {
        key: 'carbs',
        label: t('statsScreen.macros.carbs'),
        value: detail.carbsGrams,
        tone: 'warning' as const,
        fill: Math.max(18, Math.round((detail.carbsGrams / maxValue) * 100)),
      },
      {
        key: 'fat',
        label: t('statsScreen.macros.fat'),
        value: detail.fatGrams,
        tone: 'error' as const,
        fill: Math.max(18, Math.round((detail.fatGrams / maxValue) * 100)),
      },
    ];
  }, [detail, t]);

  const sourceLabel = detail ? getSourceLabel(detail.source, t) : '';
  const showSaveAction = detail ? detail.source === 'ai' || detail.source === 'barcode' : false;
  const quantityDisplay = detail ? getQuantityDisplay(detail, t('common.units.gram')) : '';

  const handleSavePress = useCallback(async () => {
    if (!detail || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const entry = await createFoodEntry({
        mealName: detail.title,
        quantityLabel: formatMealWeight(
          detail.quantityGrams,
          detail.quantityLabel,
          t('common.units.gram')
        ),
        quantityGrams: detail.quantityGrams,
        totalCalories: detail.calories,
        proteinGrams: detail.proteinGrams,
        carbsGrams: detail.carbsGrams,
        fatGrams: detail.fatGrams,
        notes: detail.notes,
        imageUri: detail.imageUri,
        thumbnailUri: detail.thumbnailUri,
        consumedAt: detail.consumedAt ?? new Date().toISOString(),
      });

      if (entry.imageUri?.startsWith('file://')) {
        await enqueueFoodEntryImageSync(entry.id);
        void processPendingFoodEntryImageSyncQueue();
      }

      toast.success(t('foodDetail.saveSuccess'));
      router.replace('/');
    } finally {
      setIsSaving(false);
    }
  }, [detail, isSaving, t]);

  const handleSupportPress = useCallback(() => {
    toast.success(t('foodDetail.supportThanks'));
  }, [t]);

  if (isLoading || !detail) {
    return (
      <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
        <View style={styles.loadingState}>
          <Text variant="body" color="secondary">
            {t('common.loading')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.content}>
        <Card variant="elevated" style={styles.imageCard}>
          {detail.imageUri ? (
            <Image
              source={{ uri: detail.thumbnailUri ?? detail.imageUri }}
              style={styles.image}
              contentFit="cover"
              accessibilityLabel={t('foodDetail.foodImageAlt')}
            />
          ) : (
            <View style={styles.placeholder}>
              <Icon name="restaurant-outline" size={42} variant="secondary" />
            </View>
          )}
        </Card>

        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text variant="h2" weight="semibold" style={styles.title} numberOfLines={2}>
              {detail.title}
            </Text>
            <View style={[styles.sourcePill, getSourcePillStyle(detail.source)]}>
              <Text variant="caption" weight="semibold" color="onBrand">
                {sourceLabel}
              </Text>
            </View>
          </View>

          <Text variant="bodySmall" color="secondary">
            {quantityDisplay}
          </Text>

          {detail.consumedAt ? (
            <Text variant="caption" color="secondary">
              {toDisplayDate(detail.consumedAt, i18n.language)}
            </Text>
          ) : null}
        </View>

        <Card variant="filled" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text variant="body" weight="semibold">
              {t('foodDetail.summaryTitle')}
            </Text>
            {detail.source === 'ai' ? (
              <View style={styles.accuracyPill}>
                <Text variant="caption" weight="semibold" color="secondary">
                  {t('foodDetail.accuracyLabel')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.calorieRow}>
            <Text variant="h1" weight="bold" align="center">
              {detail.calories}
              <Text variant="bodySmall" weight="regular" color="secondary">
                {` ${t('common.units.kcal')}`}
              </Text>
            </Text>
          </View>

          <View style={styles.macroGrid}>
            {macroValues.map((macro) => (
              <View key={macro.key} style={styles.macroItem}>
                <Text variant="bodySmall" color="secondary" align="center" numberOfLines={1}>
                  {macro.label}
                </Text>
                <View style={styles.macroValueRow}>
                  <Text variant="body" weight="semibold" align="center">
                    {macro.value}
                  </Text>
                  <Text variant="bodySmall" color="secondary" align="center">
                    {t('common.units.gram')}
                  </Text>
                </View>
                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroFill,
                      macro.tone === 'success' && styles.macroFillSuccess,
                      macro.tone === 'warning' && styles.macroFillWarning,
                      macro.tone === 'error' && styles.macroFillError,
                      { width: `${macro.fill}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>

        {detail.notes ? (
          <Card variant="outlined" style={styles.notesCard}>
            <Text variant="bodySmall" color="secondary" style={styles.notesLabel}>
              {t('foodDetail.notesLabel')}
            </Text>
            <View style={styles.notesBody}>
              <Text variant="bodySmall" style={styles.notesText}>
                {detail.notes}
              </Text>
              <Text variant="caption" color="secondary" style={styles.notesCounter}>
                {`${Math.min(detail.notes.length, NOTE_CHAR_LIMIT)}/${NOTE_CHAR_LIMIT}`}
              </Text>
            </View>
          </Card>
        ) : null}

        {detail.source === 'ai' ? (
          <Text variant="bodySmall" color="secondary" style={styles.disclaimer}>
            {t('foodDetail.estimatedDisclaimer')}
          </Text>
        ) : null}

        {showSaveAction ? (
          <Button
            title={t('foodDetail.saveAction')}
            leftIcon={<Icon name="add" size={16} variant="onBrand" />}
            onPress={() => {
              void handleSavePress();
            }}
            loading={isSaving}
            style={styles.saveButton}
          />
        ) : null}

        <SupportPromptCard
          message={t('foodDetail.supportMessage')}
          actionLabel={t('foodDetail.supportAction')}
          onActionPress={handleSupportPress}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: theme.metrics.borderRadius.xl,
  },
  image: {
    width: '100%',
    height: 220,
  },
  placeholder: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  titleBlock: {
    gap: theme.metrics.spacingV.p4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  title: {
    flex: 1,
  },
  sourcePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
  },
  sourcePillAi: {
    backgroundColor: theme.colors.state.info,
  },
  sourcePillBarcode: {
    backgroundColor: theme.colors.state.warning,
  },
  sourcePillSaved: {
    backgroundColor: theme.colors.state.success,
  },
  summaryCard: {
    gap: theme.metrics.spacingV.p12,
    alignItems: 'center',
  },
  summaryHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  accuracyPill: {
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.state.warningBg,
  },
  calorieRow: {
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  macroGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: theme.metrics.spacing.p8,
  },
  macroItem: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    alignItems: 'center',
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.metrics.spacing.p4,
    justifyContent: 'center',
  },
  macroTrack: {
    height: 7,
    width: '100%',
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
  },
  macroFillSuccess: {
    backgroundColor: theme.colors.state.success,
  },
  macroFillWarning: {
    backgroundColor: theme.colors.state.warning,
  },
  macroFillError: {
    backgroundColor: theme.colors.state.error,
  },
  notesCard: {
    gap: theme.metrics.spacingV.p8,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  notesLabel: {
    marginLeft: theme.metrics.spacing.p4,
  },
  notesBody: {
    minHeight: 80,
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.input,
  },
  notesText: {
    lineHeight: 22,
  },
  notesCounter: {
    alignSelf: 'flex-end',
  },
  disclaimer: {
    paddingHorizontal: theme.metrics.spacing.p4,
  },
  saveButton: {
    backgroundColor: theme.colors.brand.tertiary,
  },
}));
