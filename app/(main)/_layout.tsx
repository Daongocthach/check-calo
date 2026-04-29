import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Loading } from '@/common/components';
import { AddMealSourceBottomSheet } from '@/features/nutrition/components/AddMealSourceBottomSheet';
import { MealPlanSuggestionSheet } from '@/features/nutrition/components/MealPlanSuggestionSheet';
import { lookupFoodByBarcode } from '@/features/nutrition/services/barcodeFoodLookup';
import { analyzeFoodPhotoWithGemini } from '@/features/nutrition/services/geminiFoodAnalyzer';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import { useMealPlanSuggestionSheetStore } from '@/features/nutrition/stores/useMealPlanSuggestionSheetStore';
import { useOpenCamera, useOpenImageLibrary, useOpenQrScanner } from '@/providers/camera';
import { toast } from '@/utils/toast';

export default function MainLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const openCamera = useOpenCamera();
  const openImageLibrary = useOpenImageLibrary();
  const openQrScanner = useOpenQrScanner();
  const addMealSheetPayload = useAddMealSourceSheetStore((state) => state.payload);
  const setAddSheetState = useAddMealSourceSheetStore((state) => state.setSheetState);
  const setMealPlanSheetState = useMealPlanSuggestionSheetStore((state) => state.setSheetState);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  const closeAddMealSheet = useCallback(() => {
    setAddSheetState('closed');
  }, [setAddSheetState]);

  const getFoodFormParams = useCallback(
    (params?: Record<string, string>) => ({
      context: addMealSheetPayload?.context ?? 'addMeal',
      ...(addMealSheetPayload?.context === 'recentFood' ? {} : { submitMode: 'instant' }),
      ...(addMealSheetPayload?.mealLocalId ? { mealLocalId: addMealSheetPayload.mealLocalId } : {}),
      ...params,
    }),
    [addMealSheetPayload]
  );

  const openFoodFormFromPhoto = useCallback(
    (imageUri: string, params?: Record<string, string>) => {
      closeAddMealSheet();
      router.push({
        pathname: '/food-form',
        params: {
          imageUri,
          ...getFoodFormParams(params),
        },
      });
    },
    [closeAddMealSheet, getFoodFormParams, router]
  );

  const handleManualEntry = useCallback(() => {
    closeAddMealSheet();
    router.push({
      pathname: '/food-form',
      params: getFoodFormParams(),
    });
  }, [closeAddMealSheet, getFoodFormParams, router]);

  const handleViewAllRecentFoods = useCallback(() => {
    closeAddMealSheet();
    router.push('/recently-food');
  }, [closeAddMealSheet, router]);

  const handleRecentFoodPress = useCallback(
    (favoriteId: string) => {
      closeAddMealSheet();
      router.push({
        pathname: '/food-detail',
        params: {
          favoriteId,
          ...getFoodFormParams(),
        },
      });
    },
    [closeAddMealSheet, getFoodFormParams, router]
  );

  const analyzeFoodImage = useCallback(
    async (imageUri: string) => {
      closeAddMealSheet();

      try {
        const result = await analyzeFoodPhotoWithGemini(imageUri);

        if (result.status === 'ready') {
          closeAddMealSheet();
          router.push({
            pathname: '/food-detail',
            params: {
              source: 'ai',
              foodName: result.draft.mealName,
              quantityLabel: result.draft.quantityGrams ? String(result.draft.quantityGrams) : '',
              quantityGrams: result.draft.quantityGrams ? String(result.draft.quantityGrams) : '',
              calories: String(result.draft.calories),
              carbs: String(result.draft.carbsGrams),
              protein: String(result.draft.proteinGrams),
              fat: String(result.draft.fatGrams),
              notes: result.draft.notes ?? '',
              imageUri,
              ...getFoodFormParams(),
            },
          });
          return;
        }

        toast.error(result.assistantMessage ?? t('addScreen.aiAnalysisFallback'));
        openFoodFormFromPhoto(imageUri);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('addScreen.aiAnalysisError');
        toast.error(message);
        openFoodFormFromPhoto(imageUri);
      } finally {
        setIsAnalyzingPhoto(false);
      }
    },
    [closeAddMealSheet, getFoodFormParams, openFoodFormFromPhoto, router, t]
  );

  const handleCaptureFood = useCallback(async () => {
    if (isAnalyzingPhoto) {
      return;
    }

    const photo = await openCamera();

    if (!photo) {
      return;
    }

    closeAddMealSheet();
    setIsAnalyzingPhoto(true);
    await analyzeFoodImage(photo.uri);
  }, [analyzeFoodImage, closeAddMealSheet, isAnalyzingPhoto, openCamera]);

  const handlePickFoodPhoto = useCallback(async () => {
    if (isAnalyzingPhoto) {
      return;
    }

    const photo = await openImageLibrary();

    if (!photo) {
      return;
    }

    closeAddMealSheet();
    setIsAnalyzingPhoto(true);
    await analyzeFoodImage(photo.uri);
  }, [analyzeFoodImage, closeAddMealSheet, isAnalyzingPhoto, openImageLibrary]);

  const handleBarcodeScan = useCallback(async () => {
    const barcodeValue = await openQrScanner();

    if (!barcodeValue) {
      return;
    }

    try {
      const lookupResult = await lookupFoodByBarcode(barcodeValue);

      if (!lookupResult) {
        toast.info(t('addScreen.barcodeNotFound'));
        closeAddMealSheet();
        router.push({
          pathname: '/food-form',
          params: {
            barcode: barcodeValue,
            quantityLabel: t('foodDetail.defaultQuantity'),
            notes: barcodeValue,
            ...getFoodFormParams(),
          },
        });
        return;
      }

      closeAddMealSheet();
      router.push({
        pathname: '/food-detail',
        params: {
          source: 'barcode',
          barcode: barcodeValue,
          notes: lookupResult.notes || barcodeValue,
          foodName: lookupResult.foodName || t('foodDetail.unknownFoodName'),
          quantityLabel: lookupResult.quantityLabel || t('foodDetail.defaultQuantity'),
          quantityGrams: lookupResult.quantityGrams,
          calories: lookupResult.calories,
          carbs: lookupResult.carbs,
          protein: lookupResult.protein,
          fat: lookupResult.fat,
          imageUri: lookupResult.imageUri,
          ...getFoodFormParams(),
        },
      });

      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('addScreen.aiAnalysisError');
      toast.error(message);
    }

    closeAddMealSheet();
    router.push({
      pathname: '/food-form',
      params: {
        barcode: barcodeValue,
        notes: barcodeValue,
        quantityLabel: t('foodDetail.defaultQuantity'),
        ...getFoodFormParams(),
      },
    });
  }, [closeAddMealSheet, getFoodFormParams, openQrScanner, router, t]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="food-detail" />
        <Stack.Screen name="food-form" />
        <Stack.Screen name="goal-history" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="about" />
        <Stack.Screen name="contact" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
      <AddMealSourceBottomSheet
        onManualPress={handleManualEntry}
        onPhotoPress={() => {
          void handleCaptureFood();
        }}
        onLibraryPress={() => {
          void handlePickFoodPhoto();
        }}
        onBarcodePress={() => {
          void handleBarcodeScan();
        }}
        onRecentFoodPress={handleRecentFoodPress}
        onViewAllRecentPress={handleViewAllRecentFoods}
      />
      <MealPlanSuggestionSheet
        onClose={() => {
          setMealPlanSheetState('closed');
        }}
      />
      <Modal
        animationType="fade"
        hardwareAccelerated
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isAnalyzingPhoto}
      >
        <View style={styles.analysisOverlay} pointerEvents="auto">
          <Loading
            message={t('addScreen.captureModes.scanFoodAnalyzingWithAi')}
            messageColor="onShadow"
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
}));
