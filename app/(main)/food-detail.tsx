import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Button,
  Card,
  Dialog,
  Icon,
  DateTimeField,
  Input,
  QuantityStepper,
  ScreenContainer,
  SupportPromptCard,
  Text,
} from '@/common/components';
import type { DateTimeFieldHandle } from '@/common/components';
import {
  enqueueFoodEntryImageSync,
  processPendingFoodEntryImageSyncQueue,
} from '@/features/nutrition/services/foodEntrySyncQueue';
import {
  createManualMealItem,
  getManualMealByItemIds,
} from '@/features/nutrition/services/manualMealsDatabase';
import {
  createFoodEntry,
  getFavoriteFoodById,
  getFoodEntryById,
  upsertFavoriteFoodFromInput,
  updateFavoriteFood,
  updateFoodEntry,
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

interface FoodDetailEditState {
  visible: boolean;
  title: string;
  quantityLabel: string;
  quantityGrams: string;
  consumedAt: string;
  calories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
  notes: string;
  error: string | null;
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

function parseRequiredNumericInput(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsedValue = Number(trimmed);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function parseOptionalNumericInput(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsedValue = Number(trimmed);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function formatDateTimeInputValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDateTimeInputValue(new Date());
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function parseDateTimeInputValue(value: string) {
  const [datePart = '', timePart = ''] = value.trim().split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return new Date();
  }

  return new Date(year, month - 1, day, hour, minute);
}

function formatDateTimeInputDisplay(value: string, locale: string) {
  const date = parseDateTimeInputValue(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return toDisplayDate(date.toISOString(), locale);
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

function toEditState(detail: FoodDetailData): FoodDetailEditState {
  return {
    visible: true,
    title: detail.title,
    quantityLabel: detail.quantityLabel,
    quantityGrams: detail.quantityGrams !== null ? String(detail.quantityGrams) : '',
    consumedAt: formatDateTimeInputValue(detail.consumedAt ?? new Date()),
    calories: String(detail.calories),
    proteinGrams: String(detail.proteinGrams),
    carbsGrams: String(detail.carbsGrams),
    fatGrams: String(detail.fatGrams),
    notes: detail.notes ?? '',
    error: null,
  };
}

export default function FoodDetailScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<FoodDetailData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [servings, setServings] = useState(1);
  const dateTimeFieldRef = useRef<DateTimeFieldHandle>(null);
  const [editDialog, setEditDialog] = useState<FoodDetailEditState>({
    visible: false,
    title: '',
    quantityLabel: '',
    quantityGrams: '',
    consumedAt: '',
    calories: '',
    proteinGrams: '',
    carbsGrams: '',
    fatGrams: '',
    notes: '',
    error: null,
  });

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
              consumedAt: new Date().toISOString(),
            });
            return;
          }
        } else if (mealLocalId && itemLocalId) {
          const mealResult = await getManualMealByItemIds(mealLocalId, itemLocalId);

          if (mealResult && active) {
            const { meal, item } = mealResult;
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
              consumedAt: meal.eatenAt ?? new Date().toISOString(),
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

  const sourceLabel = detail ? getSourceLabel(detail.source, t) : '';
  const canPreviewQuantity = detail
    ? detail.source === 'ai' || detail.source === 'barcode' || detail.source === 'favorite'
    : false;
  const showSaveAction = detail
    ? detail.source === 'ai' || detail.source === 'barcode' || detail.source === 'favorite'
    : false;
  const showEditAction = detail ? detail.source !== 'barcode' : false;
  const quantityMultiplier = canPreviewQuantity ? servings : 1;
  const displayQuantityGrams =
    detail && detail.quantityGrams !== null ? detail.quantityGrams * quantityMultiplier : null;
  const quantityDisplay = detail
    ? getQuantityDisplay(
        {
          ...detail,
          quantityGrams: displayQuantityGrams,
        },
        t('common.units.gram')
      )
    : '';
  const displayCalories = detail ? Math.round(detail.calories * quantityMultiplier) : 0;
  const displayProteinGrams = detail ? Math.round(detail.proteinGrams * quantityMultiplier) : 0;
  const displayCarbsGrams = detail ? Math.round(detail.carbsGrams * quantityMultiplier) : 0;
  const displayFatGrams = detail ? Math.round(detail.fatGrams * quantityMultiplier) : 0;
  const displayConsumedAt = detail?.consumedAt
    ? toDisplayDate(detail.consumedAt, i18n.language)
    : '';

  const macroValues = useMemo(() => {
    if (!detail) {
      return [];
    }

    const proteinGrams = Math.round(detail.proteinGrams * quantityMultiplier);
    const carbsGrams = Math.round(detail.carbsGrams * quantityMultiplier);
    const fatGrams = Math.round(detail.fatGrams * quantityMultiplier);
    const maxValue = Math.max(proteinGrams, carbsGrams, fatGrams, 1);

    return [
      {
        key: 'protein',
        label: t('statsScreen.macros.protein'),
        value: proteinGrams,
        tone: 'success' as const,
        fill: Math.max(18, Math.round((proteinGrams / maxValue) * 100)),
      },
      {
        key: 'carbs',
        label: t('statsScreen.macros.carbs'),
        value: carbsGrams,
        tone: 'warning' as const,
        fill: Math.max(18, Math.round((carbsGrams / maxValue) * 100)),
      },
      {
        key: 'fat',
        label: t('statsScreen.macros.fat'),
        value: fatGrams,
        tone: 'error' as const,
        fill: Math.max(18, Math.round((fatGrams / maxValue) * 100)),
      },
    ];
  }, [detail, quantityMultiplier, t]);

  useEffect(() => {
    if (canPreviewQuantity) {
      setServings(1);
    }
  }, [canPreviewQuantity]);

  const openEditDialog = useCallback(() => {
    if (!detail) {
      return;
    }

    setEditDialog(toEditState(detail));
  }, [detail]);

  const closeEditDialog = useCallback(() => {
    setEditDialog((previous) => ({ ...previous, visible: false, error: null }));
  }, []);

  const saveEditDialog = useCallback(async () => {
    if (!detail) {
      return;
    }

    const title = editDialog.title.trim();
    const quantityLabel = editDialog.quantityLabel.trim();
    const consumedAt = parseDateTimeInputValue(editDialog.consumedAt);
    const calories = parseRequiredNumericInput(editDialog.calories);
    const proteinGrams = parseRequiredNumericInput(editDialog.proteinGrams);
    const carbsGrams = parseRequiredNumericInput(editDialog.carbsGrams);
    const fatGrams = parseRequiredNumericInput(editDialog.fatGrams);

    if (
      !title ||
      !quantityLabel ||
      calories === null ||
      proteinGrams === null ||
      carbsGrams === null ||
      fatGrams === null
    ) {
      setEditDialog((previous) => ({
        ...previous,
        error: t('validation.required'),
      }));
      return;
    }

    const quantityGrams = parseOptionalNumericInput(editDialog.quantityGrams);

    if (editDialog.quantityGrams.trim().length > 0 && quantityGrams === null) {
      setEditDialog((previous) => ({
        ...previous,
        error: t('validation.numberInvalid'),
      }));
      return;
    }

    const nextNotes = editDialog.notes.trim().length > 0 ? editDialog.notes.trim() : null;

    if (detail.source === 'entry' && typeof params.entryId === 'string') {
      const updatedEntry = await updateFoodEntry(params.entryId, {
        mealName: title,
        quantityLabel,
        quantityGrams,
        totalCalories: Math.round(calories),
        proteinGrams: Math.round(proteinGrams),
        carbsGrams: Math.round(carbsGrams),
        fatGrams: Math.round(fatGrams),
        notes: nextNotes,
        imageUri: detail.imageUri,
        thumbnailUri: detail.thumbnailUri,
        consumedAt: consumedAt.toISOString(),
        entryDate: consumedAt.toISOString(),
      });

      if (updatedEntry) {
        setDetail({
          source: 'entry',
          title: updatedEntry.mealName,
          quantityLabel: updatedEntry.quantityLabel,
          quantityGrams: updatedEntry.quantityGrams ?? null,
          calories: Math.round(updatedEntry.totalCalories),
          proteinGrams: Math.round(updatedEntry.proteinGrams),
          carbsGrams: Math.round(updatedEntry.carbsGrams),
          fatGrams: Math.round(updatedEntry.fatGrams),
          notes: updatedEntry.notes,
          imageUri: updatedEntry.imageUri ?? null,
          thumbnailUri: updatedEntry.thumbnailUri ?? null,
          consumedAt: updatedEntry.consumedAt,
        });
      }
      closeEditDialog();
      return;
    }

    if (detail.source === 'favorite' && typeof params.favoriteId === 'string') {
      const updatedFavorite = await updateFavoriteFood(params.favoriteId, {
        name: title,
        quantityLabel,
        quantityGrams,
        totalCalories: Math.round(calories),
        proteinGrams: Math.round(proteinGrams),
        carbsGrams: Math.round(carbsGrams),
        fatGrams: Math.round(fatGrams),
        notes: nextNotes,
        imageUri: detail.imageUri,
        thumbnailUri: detail.thumbnailUri,
      });

      if (updatedFavorite) {
        setDetail({
          source: 'favorite',
          title: updatedFavorite.name,
          quantityLabel: updatedFavorite.quantityLabel,
          quantityGrams: updatedFavorite.quantityGrams,
          calories: Math.round(updatedFavorite.totalCalories),
          proteinGrams: Math.round(updatedFavorite.proteinGrams),
          carbsGrams: Math.round(updatedFavorite.carbsGrams),
          fatGrams: Math.round(updatedFavorite.fatGrams),
          notes: updatedFavorite.notes,
          imageUri: updatedFavorite.imageUri ?? null,
          thumbnailUri: updatedFavorite.thumbnailUri ?? null,
          consumedAt: consumedAt.toISOString(),
        });
      }
      closeEditDialog();
      return;
    }

    setDetail((previous) =>
      previous
        ? {
            ...previous,
            title,
            quantityLabel,
            quantityGrams,
            consumedAt: consumedAt.toISOString(),
            calories: Math.round(calories),
            proteinGrams: Math.round(proteinGrams),
            carbsGrams: Math.round(carbsGrams),
            fatGrams: Math.round(fatGrams),
            notes: nextNotes,
          }
        : previous
    );
    closeEditDialog();
  }, [closeEditDialog, detail, editDialog, params.entryId, params.favoriteId, t]);

  const handleSavePress = useCallback(async () => {
    if (!detail || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const savedFood = {
        mealName: detail.title,
        quantityLabel:
          displayQuantityGrams !== null
            ? formatMealWeight(displayQuantityGrams, detail.quantityLabel, t('common.units.gram'))
            : detail.quantityLabel,
        quantityGrams: displayQuantityGrams,
        totalCalories: displayCalories,
        proteinGrams: displayProteinGrams,
        carbsGrams: displayCarbsGrams,
        fatGrams: displayFatGrams,
        notes: detail.notes,
        imageUri: detail.imageUri,
        thumbnailUri: detail.thumbnailUri,
        consumedAt: detail.consumedAt ?? new Date().toISOString(),
      };

      const syncedFavorite = await upsertFavoriteFoodFromInput({
        name: savedFood.mealName,
        quantityLabel: savedFood.quantityLabel,
        quantityGrams: savedFood.quantityGrams,
        totalCalories: savedFood.totalCalories,
        proteinGrams: savedFood.proteinGrams,
        carbsGrams: savedFood.carbsGrams,
        fatGrams: savedFood.fatGrams,
        notes: savedFood.notes,
        imageUri: savedFood.imageUri,
        thumbnailUri: savedFood.thumbnailUri,
      });

      if (mealLocalId && !itemLocalId) {
        await createManualMealItem(mealLocalId, {
          sourceKey: syncedFavorite ? `favorite:${syncedFavorite.id}` : null,
          title: savedFood.mealName,
          quantityLabel: savedFood.quantityLabel,
          quantityGrams: savedFood.quantityGrams,
          totalCalories: savedFood.totalCalories,
          proteinGrams: savedFood.proteinGrams,
          carbsGrams: savedFood.carbsGrams,
          fatGrams: savedFood.fatGrams,
          notes: savedFood.notes,
          imageUri: savedFood.imageUri,
          thumbnailUri: savedFood.thumbnailUri,
          servings: 1,
        });

        toast.success(t('foodDetail.saveSuccess'));
        router.replace('/menu');
        return;
      }

      const entry = await createFoodEntry(savedFood);

      if (entry.imageUri?.startsWith('file://')) {
        await enqueueFoodEntryImageSync(entry.id);
        void processPendingFoodEntryImageSyncQueue();
      }

      toast.success(t('foodDetail.saveSuccess'));
      router.replace('/');
    } finally {
      setIsSaving(false);
    }
  }, [
    detail,
    displayCarbsGrams,
    displayCalories,
    displayFatGrams,
    displayProteinGrams,
    displayQuantityGrams,
    isSaving,
    itemLocalId,
    mealLocalId,
    t,
  ]);

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
    <ScreenContainer padded={false} edges={[]}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + theme.metrics.spacingV.p24 },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                <Icon name="image-outline" size={42} variant="secondary" />
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
                {displayConsumedAt}
              </Text>
            ) : null}

            {showEditAction ? (
              <Button
                title={t('foodDetail.editAction')}
                variant="outline"
                size="sm"
                onPress={openEditDialog}
                style={styles.editButton}
              />
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
                {displayCalories}
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

          <SupportPromptCard
            message={t('foodDetail.supportMessage')}
            actionLabel={t('foodDetail.supportAction')}
            onActionPress={handleSupportPress}
          />
        </ScrollView>

        {showSaveAction ? (
          <View style={styles.saveFooter}>
            <View style={styles.servingsBlock}>
              <Text variant="bodySmall" weight="semibold">
                {t('manualFoodEntry.portionCountLabel')}
              </Text>
              <QuantityStepper
                value={servings}
                minValue={1}
                decreaseLabel={t('addScreen.decreasePortion')}
                increaseLabel={t('addScreen.increasePortion')}
                onDecrease={() => {
                  setServings((currentValue) => Math.max(1, currentValue - 1));
                }}
                onIncrease={() => {
                  setServings((currentValue) => currentValue + 1);
                }}
              />
            </View>
            <Button
              title={t('foodDetail.saveAction')}
              onPress={() => {
                void handleSavePress();
              }}
              loading={isSaving}
              fullWidth
              style={styles.saveButton}
            />
          </View>
        ) : null}
      </View>

      <Dialog
        visible={editDialog.visible}
        onDismiss={closeEditDialog}
        title={t('foodDetail.editTitle')}
        size="lg"
        keyboardAware
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: closeEditDialog,
          },
          {
            label: t('common.save'),
            variant: 'primary',
            onPress: saveEditDialog,
          },
        ]}
      >
        <View style={styles.editDialogContent}>
          <Input
            label={t('foodDetail.editFields.title')}
            value={editDialog.title}
            onChangeText={(value) => {
              setEditDialog((previous) => ({ ...previous, title: value, error: null }));
            }}
          />
          <Input
            label={t('foodDetail.editFields.quantityGrams')}
            value={editDialog.quantityGrams}
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setEditDialog((previous) => ({ ...previous, quantityGrams: value, error: null }));
            }}
          />
          <View style={styles.timeFieldBlock}>
            <Text variant="label" style={styles.timeFieldLabel}>
              {t('foodDetail.editFields.consumedAt')}
            </Text>
            <Button
              title={
                formatDateTimeInputDisplay(editDialog.consumedAt, i18n.language) ||
                t('foodDetail.editFields.consumedAt')
              }
              variant="outline"
              size="sm"
              onPress={() => {
                dateTimeFieldRef.current?.present();
              }}
              style={styles.timeFieldButton}
            />
          </View>
          <Input
            label={t('foodDetail.editFields.calories')}
            value={editDialog.calories}
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setEditDialog((previous) => ({ ...previous, calories: value, error: null }));
            }}
          />
          <View style={styles.editMacroRow}>
            <View style={styles.editMacroItem}>
              <Input
                label={t('statsScreen.macros.protein')}
                value={editDialog.proteinGrams}
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setEditDialog((previous) => ({
                    ...previous,
                    proteinGrams: value,
                    error: null,
                  }));
                }}
              />
            </View>
            <View style={styles.editMacroItem}>
              <Input
                label={t('statsScreen.macros.carbs')}
                value={editDialog.carbsGrams}
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setEditDialog((previous) => ({
                    ...previous,
                    carbsGrams: value,
                    error: null,
                  }));
                }}
              />
            </View>
            <View style={styles.editMacroItem}>
              <Input
                label={t('statsScreen.macros.fat')}
                value={editDialog.fatGrams}
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setEditDialog((previous) => ({
                    ...previous,
                    fatGrams: value,
                    error: null,
                  }));
                }}
              />
            </View>
          </View>
          <Input
            label={t('foodDetail.notesLabel')}
            value={editDialog.notes}
            onChangeText={(value) => {
              setEditDialog((previous) => ({ ...previous, notes: value, error: null }));
            }}
          />
          {editDialog.error ? (
            <Text variant="caption" style={styles.editErrorText}>
              {editDialog.error}
            </Text>
          ) : null}
        </View>
      </Dialog>

      <View style={styles.hiddenDateTimeField}>
        <DateTimeField
          ref={dateTimeFieldRef}
          title={t('foodDetail.editFields.consumedAt')}
          mode="datetime"
          value={editDialog.consumedAt}
          onChange={(value) => {
            setEditDialog((previous) => ({ ...previous, consumedAt: value, error: null }));
          }}
          hideTrigger
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: 0,
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
  editButton: {
    alignSelf: 'flex-start',
    marginTop: theme.metrics.spacingV.p4,
  },
  timeFieldBlock: {
    gap: theme.metrics.spacingV.p4,
  },
  timeFieldLabel: {
    marginLeft: theme.metrics.spacing.p4,
  },
  timeFieldButton: {
    alignSelf: 'flex-start',
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
  saveFooter: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p16,
    backgroundColor: theme.colors.background.app,
  },
  servingsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    marginBottom: theme.metrics.spacingV.p12,
  },
  saveButton: {
    backgroundColor: theme.colors.brand.tertiary,
  },
  editDialogContent: {
    gap: theme.metrics.spacingV.p8,
  },
  editMacroRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  editMacroItem: {
    flex: 1,
  },
  editErrorText: {
    color: theme.colors.state.error,
  },
  hiddenDateTimeField: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
}));
