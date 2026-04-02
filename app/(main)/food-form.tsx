import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native-unistyles';
import {
  Button,
  DateTimeField,
  Icon,
  Input,
  ScreenContainer,
  Text,
  TextArea,
} from '@/common/components';
import {
  deleteOrphanedFoodEntryAssets,
  persistFoodEntryAssetsLocally,
} from '@/features/nutrition/services/foodEntryImageSync';
import {
  enqueueFoodEntryImageSync,
  processPendingFoodEntryImageSyncQueue,
} from '@/features/nutrition/services/foodEntrySyncQueue';
import {
  createFoodEntry,
  getFavoriteFoodById,
  getFoodEntryById,
  upsertFavoriteFoodFromInput,
  updateFavoriteFood,
  updateFoodEntry,
} from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealStore } from '@/features/nutrition/stores/useAddMealStore';
import { formatMealWeight, parseMealWeightInput } from '@/features/nutrition/utils/quantity';
import { useOpenCamera } from '@/providers/camera';
import { toast } from '@/utils/toast';

interface FoodFormState {
  foodName: string;
  quantityLabel: string;
  consumedAt: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
}

const DEFAULT_FORM: FoodFormState = {
  foodName: '',
  quantityLabel: '',
  consumedAt: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  notes: '',
};

function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function formatDateTimeInputValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDateTimeInputValue(new Date());
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function toRoundedString(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function parseNumber(value: string) {
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export default function FoodFormScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    entryId?: string;
    favoriteId?: string;
    draftItemId?: string;
    context?: string;
    submitMode?: string;
    consumedAt?: string;
    foodName?: string;
    quantityLabel?: string;
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    notes?: string;
    imageUri?: string;
  }>();
  const openCamera = useOpenCamera();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const addMealItem = useAddMealStore((state) => state.addItem);
  const updateMealItem = useAddMealStore((state) => state.updateItem);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FoodFormState>({
    defaultValues: DEFAULT_FORM,
  });

  const isEditingEntry = useMemo(
    () => typeof params.entryId === 'string' && params.entryId.length > 0,
    [params.entryId]
  );
  const isEditingFavorite = useMemo(
    () => typeof params.favoriteId === 'string' && params.favoriteId.length > 0,
    [params.favoriteId]
  );
  const isEditing = isEditingEntry || isEditingFavorite;
  const isAddMealFlow = params.context === 'addMeal' && !isEditing;
  const isInstantAddMealFlow = isAddMealFlow && params.submitMode === 'instant';

  const loadScreenData = useCallback(async () => {
    setIsLoading(true);

    if (isEditingEntry && typeof params.entryId === 'string') {
      const entry = await getFoodEntryById(params.entryId);

      if (entry) {
        reset({
          foodName: entry.mealName,
          quantityLabel:
            entry.quantityGrams !== null && entry.quantityGrams !== undefined
              ? toRoundedString(entry.quantityGrams)
              : entry.quantityLabel,
          consumedAt: formatDateTimeInputValue(entry.consumedAt),
          calories: toRoundedString(entry.totalCalories),
          protein: toRoundedString(entry.proteinGrams),
          carbs: toRoundedString(entry.carbsGrams),
          fat: toRoundedString(entry.fatGrams),
          notes: entry.notes ?? '',
        });
        setImageUri(entry.imageUri ?? null);
      }
    } else if (isEditingFavorite && typeof params.favoriteId === 'string') {
      const favorite = await getFavoriteFoodById(params.favoriteId);

      if (favorite) {
        reset({
          foodName: favorite.name,
          quantityLabel:
            favorite.quantityGrams !== null && favorite.quantityGrams !== undefined
              ? toRoundedString(favorite.quantityGrams)
              : favorite.quantityLabel,
          consumedAt: formatDateTimeInputValue(new Date()),
          calories: toRoundedString(favorite.totalCalories),
          protein: toRoundedString(favorite.proteinGrams),
          carbs: toRoundedString(favorite.carbsGrams),
          fat: toRoundedString(favorite.fatGrams),
          notes: favorite.notes ?? '',
        });
        setImageUri(favorite.imageUri ?? null);
      }
    } else {
      reset({
        foodName: typeof params.foodName === 'string' ? params.foodName : '',
        quantityLabel: typeof params.quantityLabel === 'string' ? params.quantityLabel : '',
        consumedAt:
          typeof params.consumedAt === 'string' && params.consumedAt.length > 0
            ? formatDateTimeInputValue(params.consumedAt)
            : formatDateTimeInputValue(new Date()),
        calories: typeof params.calories === 'string' ? params.calories : '',
        protein: typeof params.protein === 'string' ? params.protein : '',
        carbs: typeof params.carbs === 'string' ? params.carbs : '',
        fat: typeof params.fat === 'string' ? params.fat : '',
        notes: typeof params.notes === 'string' ? params.notes : '',
      });
      setImageUri(typeof params.imageUri === 'string' ? params.imageUri : null);
    }

    setIsLoading(false);
  }, [
    isEditingEntry,
    isEditingFavorite,
    params.calories,
    params.carbs,
    params.consumedAt,
    params.entryId,
    params.fat,
    params.favoriteId,
    params.foodName,
    params.imageUri,
    params.notes,
    params.protein,
    params.quantityLabel,
    reset,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadScreenData();
    }, [loadScreenData])
  );

  const handleCapturePhoto = useCallback(async () => {
    const photo = await openCamera();

    if (!photo) {
      return;
    }

    setImageUri(photo.uri);
  }, [openCamera]);

  const onSubmit = async (form: FoodFormState) => {
    const quantityGrams = parseMealWeightInput(form.quantityLabel);

    if (quantityGrams === null) {
      return;
    }

    setIsSaving(true);

    try {
      const persistedAssets = imageUri ? await persistFoodEntryAssetsLocally(imageUri) : null;
      const previousEntry =
        isEditingEntry && typeof params.entryId === 'string'
          ? await getFoodEntryById(params.entryId)
          : null;
      const previousFavorite =
        isEditingFavorite && typeof params.favoriteId === 'string'
          ? await getFavoriteFoodById(params.favoriteId)
          : null;

      const payload = {
        mealName: form.foodName.trim(),
        quantityLabel: formatMealWeight(quantityGrams, null, t('common.units.gram')),
        quantityGrams,
        consumedAt: parseDateTimeInputValue(form.consumedAt).toISOString(),
        totalCalories: parseNumber(form.calories),
        proteinGrams: parseNumber(form.protein),
        carbsGrams: parseNumber(form.carbs),
        fatGrams: parseNumber(form.fat),
        notes: form.notes.trim() ? form.notes.trim() : null,
        imageUri: persistedAssets?.imageUri ?? null,
        thumbnailUri: persistedAssets?.thumbnailUri ?? null,
      };

      const syncedFavorite = !isEditingFavorite
        ? await upsertFavoriteFoodFromInput({
            name: payload.mealName,
            quantityLabel: payload.quantityLabel,
            quantityGrams: payload.quantityGrams ?? null,
            totalCalories: payload.totalCalories,
            proteinGrams: payload.proteinGrams,
            carbsGrams: payload.carbsGrams,
            fatGrams: payload.fatGrams,
            notes: payload.notes,
            imageUri: payload.imageUri,
            thumbnailUri: payload.thumbnailUri,
          })
        : null;

      if (isAddMealFlow) {
        if (isInstantAddMealFlow) {
          const entry = await createFoodEntry(payload);

          if (!entry) {
            return;
          }

          if (entry.imageUri?.startsWith('file://')) {
            await enqueueFoodEntryImageSync(entry.id);
            void processPendingFoodEntryImageSyncQueue();
          }

          toast.success(t('addScreen.saveSuccess'));
          router.replace('/');
          return;
        }

        const nextDraftItem = {
          sourceKey: syncedFavorite ? `favorite:${syncedFavorite.id}` : null,
          title: payload.mealName,
          quantityLabel: payload.quantityLabel,
          quantityGrams: payload.quantityGrams,
          totalCalories: payload.totalCalories,
          proteinGrams: payload.proteinGrams,
          carbsGrams: payload.carbsGrams,
          fatGrams: payload.fatGrams,
          notes: payload.notes,
          imageUri: payload.imageUri,
          thumbnailUri: payload.thumbnailUri,
          consumedAt: payload.consumedAt,
        };

        if (typeof params.draftItemId === 'string' && params.draftItemId.length > 0) {
          updateMealItem(params.draftItemId, nextDraftItem);
        } else {
          addMealItem(nextDraftItem);
        }
        router.replace('/add');
        return;
      }

      if (isEditingFavorite && typeof params.favoriteId === 'string') {
        await updateFavoriteFood(params.favoriteId, {
          name: payload.mealName,
          quantityLabel: payload.quantityLabel,
          quantityGrams: payload.quantityGrams ?? null,
          totalCalories: payload.totalCalories,
          proteinGrams: payload.proteinGrams,
          carbsGrams: payload.carbsGrams,
          fatGrams: payload.fatGrams,
          notes: payload.notes,
          imageUri: payload.imageUri,
          thumbnailUri: payload.thumbnailUri,
        });
        await deleteOrphanedFoodEntryAssets(
          previousFavorite?.imageUri,
          previousFavorite?.thumbnailUri
        );
        router.replace('/favorites');
        return;
      }

      const entry =
        isEditingEntry && typeof params.entryId === 'string'
          ? await updateFoodEntry(params.entryId, payload)
          : await createFoodEntry(payload);

      if (!entry) {
        return;
      }

      await deleteOrphanedFoodEntryAssets(previousEntry?.imageUri, previousEntry?.thumbnailUri);

      if (entry.imageUri?.startsWith('file://')) {
        await enqueueFoodEntryImageSync(entry.id);
        void processPendingFoodEntryImageSyncQueue();
      }

      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer padded={false} edges={['bottom']}>
        <Text>{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View style={styles.layout}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.screen}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('manualFoodEntry.photoAction')}
              onPress={() => {
                void handleCapturePhoto();
              }}
              style={[styles.photoCard, !imageUri && styles.photoCardEmpty]}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoImage} contentFit="cover" />
              ) : null}
              {imageUri ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('manualFoodEntry.openImageViewer')}
                  onPress={(event) => {
                    event.stopPropagation();
                    setIsPreviewVisible(true);
                  }}
                  style={styles.previewButton}
                >
                  <Icon name="expand-outline" variant="inverse" size={18} />
                </Pressable>
              ) : null}
              <View
                style={[
                  styles.photoOverlay,
                  imageUri ? styles.photoOverlayFilled : styles.photoOverlayEmpty,
                ]}
              >
                <View style={styles.cameraBadge}>
                  <Icon name="camera-outline" variant="inverse" size={22} />
                </View>
              </View>
            </Pressable>

            <View style={styles.formBlock}>
              <Controller
                control={control}
                name="foodName"
                rules={{ required: t('validation.required') }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('manualFoodEntry.fields.foodName')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.foodName?.message}
                    accessibilityLabel={t('manualFoodEntry.fields.foodName')}
                    placeholder={t('manualFoodEntry.placeholders.foodName')}
                  />
                )}
              />

              <View style={styles.row}>
                <View style={styles.rowField}>
                  <Controller
                    control={control}
                    name="quantityLabel"
                    rules={{ required: t('validation.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('manualFoodEntry.fields.quantity')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.quantityLabel?.message}
                        accessibilityLabel={t('manualFoodEntry.fields.quantity')}
                        placeholder={t('manualFoodEntry.placeholders.quantity')}
                        keyboardType="decimal-pad"
                      />
                    )}
                  />
                </View>
                <View style={styles.rowField}>
                  <Controller
                    control={control}
                    name="calories"
                    rules={{ required: t('validation.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('manualFoodEntry.fields.calories')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.calories?.message}
                        keyboardType="decimal-pad"
                        accessibilityLabel={t('manualFoodEntry.fields.calories')}
                        placeholder={t('manualFoodEntry.placeholders.calories')}
                      />
                    )}
                  />
                </View>
              </View>

              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Controller
                    control={control}
                    name="protein"
                    rules={{ required: t('validation.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('manualFoodEntry.fields.protein')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.protein?.message}
                        keyboardType="decimal-pad"
                        placeholder={t('manualFoodEntry.placeholders.macro')}
                      />
                    )}
                  />
                </View>
                <View style={styles.macroField}>
                  <Controller
                    control={control}
                    name="carbs"
                    rules={{ required: t('validation.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('manualFoodEntry.fields.carbs')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.carbs?.message}
                        keyboardType="decimal-pad"
                        placeholder={t('manualFoodEntry.placeholders.macro')}
                      />
                    )}
                  />
                </View>
                <View style={styles.macroField}>
                  <Controller
                    control={control}
                    name="fat"
                    rules={{ required: t('validation.required') }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('manualFoodEntry.fields.fat')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.fat?.message}
                        keyboardType="decimal-pad"
                        placeholder={t('manualFoodEntry.placeholders.macro')}
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextArea
                    label={t('manualFoodEntry.fields.notes')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t('manualFoodEntry.placeholders.notes')}
                    numberOfLines={4}
                  />
                )}
              />

              {!isEditingFavorite ? (
                <Controller
                  control={control}
                  name="consumedAt"
                  render={({ field: { onChange, value } }) => (
                    <DateTimeField
                      label={t('manualFoodEntry.fields.consumedAt')}
                      title={t('manualFoodEntry.fields.consumedAt')}
                      mode="datetime"
                      value={value}
                      onChange={onChange}
                      placeholder={t('manualFoodEntry.placeholders.consumedAt')}
                    />
                  )}
                />
              ) : null}
            </View>
          </View>
        </KeyboardAwareScrollView>

        <KeyboardStickyView
          enabled
          offset={{
            closed: 0,
            opened: 0,
          }}
          style={styles.footerSticky}
        >
          <View style={styles.footer}>
            <View style={styles.actions}>
              <Button
                title={
                  isEditing ? t('manualFoodEntry.updateAction') : t('manualFoodEntry.saveAction')
                }
                fullWidth
                loading={isSaving}
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
              />
            </View>
          </View>
        </KeyboardStickyView>
      </View>

      {imageUri ? (
        <Modal
          animationType="fade"
          visible={isPreviewVisible}
          onRequestClose={() => {
            setIsPreviewVisible(false);
          }}
        >
          <View style={styles.viewerContainer}>
            <ImageViewer
              imageUrls={[{ url: imageUri }]}
              backgroundColor="black"
              enableSwipeDown
              onCancel={() => {
                setIsPreviewVisible(false);
              }}
              onClick={() => {
                setIsPreviewVisible(false);
              }}
              saveToLocalByLongPress={false}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('manualFoodEntry.closeImageViewer')}
              onPress={() => {
                setIsPreviewVisible(false);
              }}
              style={styles.closePreviewButton}
            >
              <Icon name="close-outline" variant="inverse" size={22} />
            </Pressable>
          </View>
        </Modal>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  layout: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p120,
  },
  screen: {
    gap: theme.metrics.spacingV.p16,
  },
  photoCard: {
    minHeight: theme.metrics.spacing.p120,
    borderRadius: theme.metrics.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.section,
  },
  photoCardEmpty: {
    borderStyle: 'dashed',
    backgroundColor: theme.colors.background.app,
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  previewButton: {
    position: 'absolute',
    right: theme.metrics.spacing.p12,
    bottom: theme.metrics.spacingV.p12,
    zIndex: 2,
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
  photoOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
  },
  photoOverlayFilled: {
    backgroundColor: theme.colors.overlay.focus,
  },
  photoOverlayEmpty: {
    backgroundColor: theme.colors.background.app,
  },
  cameraBadge: {
    width: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p48,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: theme.colors.overlay.modal,
  },
  closePreviewButton: {
    position: 'absolute',
    top: theme.metrics.spacingV.p48,
    right: theme.metrics.spacing.p16,
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
  formBlock: {
    gap: theme.metrics.spacingV.p12,
  },
  row: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  rowField: {
    flex: 1,
  },
  macroRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  macroField: {
    flex: 1,
    minWidth: 0,
  },
  footerSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: theme.colors.background.app,
  },
  footer: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.app,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  actions: {
    gap: theme.metrics.spacingV.p12,
  },
}));
