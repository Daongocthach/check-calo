import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Input,
  QuantityStepper,
  ScreenContainer,
  SupportPromptCard,
  Text,
} from '@/common/components';
import { upsertFoodProductCatalog } from '@/features/nutrition/services/barcodeFoodLookup';
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
  getRecentFoodById,
  getFoodEntryById,
  upsertRecentFoodFromInput,
} from '@/features/nutrition/services/nutritionDatabase';
import { useFoodEntryRefreshStore } from '@/features/nutrition/stores/useFoodEntryRefreshStore';
import { formatMealWeight } from '@/features/nutrition/utils/quantity';
import { useSupportPromptVisibility } from '@/features/support/hooks/useSupportPromptVisibility';
import { toast } from '@/utils/toast';

type FoodDetailSource = 'ai' | 'barcode' | 'entry' | 'recent' | 'manual';

interface FoodDetailSearchParams {
  source?: FoodDetailSource;
  entryId?: string;
  recentId?: string;
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
  barcode?: string;
}

interface FoodDetailData {
  source: FoodDetailSource;
  barcode: string | null;
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

interface FoodDetailPeopleCountState {
  visible: boolean;
  value: string;
  error: string | null;
}

const NOTE_CHAR_LIMIT = 200;
const FOOD_IMAGE_DOWNLOAD_DIRECTORY = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}food-image-downloads/`;

interface SavedFoodImage {
  uri: string;
  isTemporary: boolean;
}

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

function parsePeopleCountInput(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsedValue = Number(trimmed);
  if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
    return null;
  }

  return parsedValue >= 1 && parsedValue <= 100 ? parsedValue : null;
}

function getFoodImageFileName(sourceUri: string) {
  const cleanedUri = sourceUri.split('?')[0];
  const fileName = cleanedUri.split('/').pop();

  if (!fileName) {
    return `food-image-${Date.now()}.jpg`;
  }

  if (fileName.includes('.')) {
    return fileName;
  }

  return `${fileName}.jpg`;
}

async function saveFoodImageToTemporaryFile(sourceUri: string): Promise<SavedFoodImage> {
  if (sourceUri.startsWith('file://')) {
    return { uri: sourceUri, isTemporary: false };
  }

  if (!FOOD_IMAGE_DOWNLOAD_DIRECTORY) {
    throw new Error('File system directory unavailable');
  }

  const fileName = getFoodImageFileName(sourceUri);
  const targetUri = `${FOOD_IMAGE_DOWNLOAD_DIRECTORY}${fileName}`;

  await FileSystem.makeDirectoryAsync(FOOD_IMAGE_DOWNLOAD_DIRECTORY, {
    intermediates: true,
  });

  const result = await FileSystem.downloadAsync(sourceUri, targetUri);

  return {
    uri: result.uri,
    isTemporary: true,
  };
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

  if (typeof params.recentId === 'string' && params.recentId.length > 0) {
    return 'recent';
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
    barcode: params.barcode?.trim() || null,
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
    case 'recent':
      return t('foodDetail.sourceLabels.recent');
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
  const { isHidden: isSupportPromptHidden } = useSupportPromptVisibility();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<FoodDetailData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [servings, setServings] = useState(1);
  const [peopleCount, setPeopleCount] = useState(1);
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const [peopleCountDialog, setPeopleCountDialog] = useState<FoodDetailPeopleCountState>({
    visible: false,
    value: '',
    error: null,
  });

  const typedParams = params as Record<string, string | undefined>;
  const source = resolveSource({
    source:
      typedParams.source === 'ai' ||
      typedParams.source === 'barcode' ||
      typedParams.source === 'entry' ||
      typedParams.source === 'recent' ||
      typedParams.source === 'manual'
        ? typedParams.source
        : undefined,
    entryId: typedParams.entryId,
    recentId: typedParams.recentId,
    mealLocalId: typedParams.mealLocalId,
    itemLocalId: typedParams.itemLocalId,
  });
  const entryId = typedParams.entryId ?? '';
  const recentId = typedParams.recentId ?? '';
  const mealLocalId = typedParams.mealLocalId ?? '';
  const itemLocalId = typedParams.itemLocalId ?? '';
  const isRecentFoodFlow = typedParams.context === 'recentFood';
  const shouldReuseRecent = isRecentFoodFlow && recentId.length > 0;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setIsLoading(true);

        try {
          if (entryId) {
            const entry = await getFoodEntryById(entryId);

            if (entry && active) {
              setDetail({
                source: 'entry',
                barcode: entry.barcode ?? null,
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
          } else if (recentId) {
            const recent = await getRecentFoodById(recentId);

            if (recent && active) {
              setDetail({
                source: 'recent',
                barcode: recent.barcode ?? null,
                title: recent.name,
                quantityLabel: formatMealWeight(
                  recent.quantityGrams,
                  recent.quantityLabel,
                  t('common.units.gram')
                ),
                quantityGrams: recent.quantityGrams ?? null,
                calories: Math.round(recent.totalCalories),
                proteinGrams: Math.round(recent.proteinGrams),
                carbsGrams: Math.round(recent.carbsGrams),
                fatGrams: Math.round(recent.fatGrams),
                notes: recent.notes,
                imageUri: recent.imageUri ?? null,
                thumbnailUri: recent.thumbnailUri ?? null,
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
                barcode: item.sourceKey?.startsWith('barcode:')
                  ? item.sourceKey.replace('barcode:', '')
                  : null,
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
                  barcode: typedParams.barcode,
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
      recentId,
      itemLocalId,
      mealLocalId,
      typedParams.calories,
      typedParams.barcode,
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
    ])
  );

  const sourceLabel = detail ? getSourceLabel(detail.source, t) : '';
  const canPreviewQuantity = detail
    ? !isRecentFoodFlow &&
      (detail.source === 'ai' || detail.source === 'barcode' || detail.source === 'recent')
    : false;
  const showSaveAction = detail
    ? detail.source === 'ai' || detail.source === 'barcode' || detail.source === 'recent'
    : false;
  const showEditAction = Boolean(detail);
  const quantityMultiplier = canPreviewQuantity ? servings : 1;
  const previewShareDivider = canPreviewQuantity ? peopleCount : 1;
  const displayMultiplier = canPreviewQuantity ? quantityMultiplier / previewShareDivider : 1;
  const imageSourceUri = detail?.imageUri ?? detail?.thumbnailUri ?? null;
  const displayQuantityGrams =
    detail && detail.quantityGrams !== null ? detail.quantityGrams * displayMultiplier : null;
  const quantityDisplay = detail
    ? getQuantityDisplay(
        {
          ...detail,
          quantityGrams: displayQuantityGrams,
        },
        t('common.units.gram')
      )
    : '';
  const displayCalories = detail ? Math.round(detail.calories * displayMultiplier) : 0;
  const displayProteinGrams = detail ? Math.round(detail.proteinGrams * displayMultiplier) : 0;
  const displayCarbsGrams = detail ? Math.round(detail.carbsGrams * displayMultiplier) : 0;
  const displayFatGrams = detail ? Math.round(detail.fatGrams * displayMultiplier) : 0;
  const displayConsumedAt = detail?.consumedAt
    ? toDisplayDate(detail.consumedAt, i18n.language)
    : '';

  const macroValues = useMemo(() => {
    if (!detail) {
      return [];
    }

    const proteinGrams = Math.round(detail.proteinGrams * displayMultiplier);
    const carbsGrams = Math.round(detail.carbsGrams * displayMultiplier);
    const fatGrams = Math.round(detail.fatGrams * displayMultiplier);
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
  }, [detail, displayMultiplier, t]);

  useEffect(() => {
    if (canPreviewQuantity) {
      setServings(1);
      setPeopleCount(1);
    }
  }, [canPreviewQuantity]);

  const handleEditPress = useCallback(() => {
    if (!detail) {
      return;
    }

    if (entryId) {
      router.push({
        pathname: '/food-form',
        params: {
          entryId,
        },
      });
      return;
    }

    if (recentId) {
      router.push({
        pathname: '/food-form',
        params: {
          recentId,
        },
      });
      return;
    }

    if (mealLocalId && itemLocalId) {
      router.push({
        pathname: '/food-form',
        params: {
          context: 'menuMeal',
          mealLocalId,
          itemLocalId,
        },
      });
      return;
    }

    router.push({
      pathname: '/food-form',
      params: {
        ...(typedParams.context ? { context: typedParams.context } : { context: 'addMeal' }),
        ...(typedParams.submitMode ? { submitMode: typedParams.submitMode } : {}),
        ...(mealLocalId ? { mealLocalId } : {}),
        ...(detail.barcode ? { barcode: detail.barcode } : {}),
        foodName: detail.title,
        quantityLabel:
          detail.quantityGrams !== null ? String(detail.quantityGrams) : detail.quantityLabel,
        calories: String(detail.calories),
        protein: String(detail.proteinGrams),
        carbs: String(detail.carbsGrams),
        fat: String(detail.fatGrams),
        notes: detail.notes ?? '',
        imageUri: detail.imageUri ?? '',
        consumedAt: detail.consumedAt ?? new Date().toISOString(),
      },
    });
  }, [
    detail,
    entryId,
    itemLocalId,
    mealLocalId,
    recentId,
    typedParams.context,
    typedParams.submitMode,
  ]);

  const openPeopleCountDialog = useCallback(() => {
    setPeopleCountDialog({
      visible: true,
      value: String(peopleCount),
      error: null,
    });
  }, [peopleCount]);

  const closePeopleCountDialog = useCallback(() => {
    setPeopleCountDialog((previous) => ({ ...previous, visible: false, error: null }));
  }, []);

  const savePeopleCountDialog = useCallback(() => {
    const nextPeopleCount = parsePeopleCountInput(peopleCountDialog.value);

    if (nextPeopleCount === null) {
      setPeopleCountDialog((previous) => ({
        ...previous,
        error: t('foodDetail.peopleCountError'),
      }));
      return;
    }

    setPeopleCount(nextPeopleCount);
    closePeopleCountDialog();
  }, [closePeopleCountDialog, peopleCountDialog.value, t]);

  const handleSavePress = useCallback(async () => {
    if (!detail || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const savedFood = {
        barcode: detail.barcode,
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

      const syncedRecent = shouldReuseRecent
        ? await getRecentFoodById(recentId)
        : await upsertRecentFoodFromInput({
            name: savedFood.mealName,
            barcode: savedFood.barcode,
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

      if (!shouldReuseRecent && savedFood.barcode && syncedRecent) {
        await upsertFoodProductCatalog({
          barcode: savedFood.barcode,
          name: syncedRecent.name,
          quantityLabel: syncedRecent.quantityLabel,
          quantityGrams: syncedRecent.quantityGrams,
          totalCalories: syncedRecent.totalCalories,
          proteinGrams: syncedRecent.proteinGrams,
          carbsGrams: syncedRecent.carbsGrams,
          fatGrams: syncedRecent.fatGrams,
          notes: syncedRecent.notes,
          imageUri: syncedRecent.imageUri,
          source: 'user',
        });
      }

      if (isRecentFoodFlow) {
        toast.success(t('foodDetail.saveSuccess'));
        router.replace('/recently-food');
        return;
      }

      if (mealLocalId && !itemLocalId) {
        let sourceKey: string | null = shouldReuseRecent ? `recent:${recentId}` : null;

        if (!sourceKey && savedFood.barcode) {
          sourceKey = `barcode:${savedFood.barcode}`;
        } else if (!sourceKey && syncedRecent) {
          sourceKey = `recent:${syncedRecent.id}`;
        }

        await createManualMealItem(mealLocalId, {
          sourceKey,
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

      markFoodEntriesChanged();
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
    recentId,
    isSaving,
    isRecentFoodFlow,
    itemLocalId,
    mealLocalId,
    shouldReuseRecent,
    markFoodEntriesChanged,
    t,
  ]);

  const handleSupportPress = useCallback(() => {
    router.push('/support');
  }, []);

  const handleDownloadImagePress = useCallback(async () => {
    if (!imageSourceUri || isSavingImage) {
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
        toast.error(t('foodDetail.downloadImagePermissionDenied'));
        return;
      }

      const savedImage = await saveFoodImageToTemporaryFile(imageSourceUri);

      await MediaLibrary.saveToLibraryAsync(savedImage.uri);

      if (savedImage.isTemporary) {
        await FileSystem.deleteAsync(savedImage.uri, { idempotent: true });
      }

      toast.success(t('foodDetail.downloadImageSuccess'));
    } catch {
      toast.error(t('foodDetail.downloadImageFailed'));
    } finally {
      setIsSavingImage(false);
    }
  }, [imageSourceUri, isSavingImage, t]);

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
            {imageSourceUri ? (
              <View style={styles.imageFrame}>
                <Image
                  source={{ uri: detail.thumbnailUri ?? detail.imageUri ?? imageSourceUri }}
                  style={styles.image}
                  contentFit="cover"
                  accessibilityLabel={t('foodDetail.foodImageAlt')}
                />
                <View style={styles.imageActionWrap}>
                  <IconButton
                    icon="download-outline"
                    variant="secondary"
                    size="md"
                    color={theme.colors.brand.primary}
                    loading={isSavingImage}
                    accessibilityLabel={t('foodDetail.downloadImageAction')}
                    onPress={() => {
                      void handleDownloadImagePress();
                    }}
                  />
                </View>
              </View>
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
              <View style={styles.titleActionsRow}>
                <Button
                  title={t('foodDetail.editAction')}
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="create-outline" size={16} variant="primary" />}
                  onPress={handleEditPress}
                  style={styles.editButton}
                />
                {canPreviewQuantity ? (
                  <Button
                    title={t('foodDetail.peopleCountAction', { count: peopleCount })}
                    variant="outline"
                    size="sm"
                    leftIcon={<Icon name="people-outline" size={16} variant="primary" />}
                    onPress={openPeopleCountDialog}
                    style={styles.editButton}
                  />
                ) : null}
              </View>
            ) : null}
            {!showEditAction && canPreviewQuantity ? (
              <Button
                title={t('foodDetail.peopleCountAction', { count: peopleCount })}
                variant="outline"
                size="sm"
                leftIcon={<Icon name="people-outline" size={16} variant="primary" />}
                onPress={openPeopleCountDialog}
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
            isHidden={isSupportPromptHidden}
          />
        </ScrollView>

        {showSaveAction ? (
          <View style={styles.saveFooter}>
            {canPreviewQuantity ? (
              <View style={styles.quantityFooter}>
                <Text variant="label">{t('foodDetail.quantityCountLabel')}</Text>
                <View style={styles.quantityStepperWrap}>
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
                    style={styles.quantityStepper}
                  />
                </View>
              </View>
            ) : null}
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
        visible={peopleCountDialog.visible}
        onDismiss={closePeopleCountDialog}
        title={t('foodDetail.peopleCountDialogTitle')}
        size="md"
        keyboardAware
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: closePeopleCountDialog,
          },
          {
            label: t('common.save'),
            variant: 'primary',
            onPress: savePeopleCountDialog,
          },
        ]}
      >
        <View style={styles.editDialogContent}>
          <Input
            label={t('foodDetail.peopleCountInputLabel')}
            value={peopleCountDialog.value}
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={(value) => {
              setPeopleCountDialog((previous) => ({ ...previous, value, error: null }));
            }}
            helperText={t('foodDetail.peopleCountHelper')}
            error={peopleCountDialog.error ?? undefined}
          />
        </View>
      </Dialog>
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
  imageFrame: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 220,
  },
  imageActionWrap: {
    position: 'absolute',
    top: theme.metrics.spacing.p12,
    right: theme.metrics.spacing.p12,
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
  titleActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: theme.metrics.spacingV.p4,
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
    gap: theme.metrics.spacingV.p12,
  },
  quantityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacingV.p8,
  },
  quantityStepperWrap: {
    flexShrink: 0,
  },
  quantityStepper: {
    alignSelf: 'flex-start',
  },
  saveButton: {
    backgroundColor: theme.colors.brand.tertiary,
  },
  editDialogContent: {
    gap: theme.metrics.spacingV.p8,
  },
}));
