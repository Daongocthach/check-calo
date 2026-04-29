import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const openCamera = useOpenCamera();
  const openImageLibrary = useOpenImageLibrary();
  const openQrScanner = useOpenQrScanner();
  const addMealSheetRef = useRef<BottomSheetModal>(null);
  const mealPlanSuggestionSheetRef = useRef<BottomSheetModal>(null);
  const openRequestId = useAddMealSourceSheetStore((state) => state.openRequestId);
  const sheetState = useAddMealSourceSheetStore((state) => state.sheetState);
  const addMealSheetPayload = useAddMealSourceSheetStore((state) => state.payload);
  const setAddSheetState = useAddMealSourceSheetStore((state) => state.setSheetState);
  const mealPlanOpenRequestId = useMealPlanSuggestionSheetStore((state) => state.openRequestId);
  const mealPlanSheetState = useMealPlanSuggestionSheetStore((state) => state.sheetState);
  const setMealPlanSheetState = useMealPlanSuggestionSheetStore((state) => state.setSheetState);
  const lastPresentedRequestIdRef = useRef(0);
  const lastMealPlanPresentedRequestIdRef = useRef(0);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  useEffect(() => {
    if (sheetState === 'opening' && openRequestId > lastPresentedRequestIdRef.current) {
      lastPresentedRequestIdRef.current = openRequestId;
      addMealSheetRef.current?.present();
    }
  }, [openRequestId, sheetState]);

  useEffect(() => {
    if (
      mealPlanSheetState === 'opening' &&
      mealPlanOpenRequestId > lastMealPlanPresentedRequestIdRef.current
    ) {
      lastMealPlanPresentedRequestIdRef.current = mealPlanOpenRequestId;
      mealPlanSuggestionSheetRef.current?.present();
    }
  }, [mealPlanOpenRequestId, mealPlanSheetState]);

  const closeAddMealSheet = useCallback(() => {
    addMealSheetRef.current?.dismiss();
  }, []);

  const getFoodFormParams = useCallback(
    (params?: Record<string, string>) => ({
      context: addMealSheetPayload?.context ?? 'addMeal',
      submitMode: 'instant',
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

  const analyzeFoodImage = useCallback(
    async (imageUri: string) => {
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
    [closeAddMealSheet, openFoodFormFromPhoto, router, t]
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

      closeAddMealSheet();
      router.push({
        pathname: '/food-detail',
        params: {
          source: 'barcode',
          notes: lookupResult?.notes || barcodeValue,
          foodName: lookupResult?.foodName || t('foodDetail.unknownFoodName'),
          quantityLabel: lookupResult?.quantityLabel || t('foodDetail.defaultQuantity'),
          quantityGrams: '',
          calories: lookupResult?.calories || '',
          carbs: lookupResult?.carbs || '',
          protein: lookupResult?.protein || '',
          fat: lookupResult?.fat || '',
          imageUri: lookupResult?.imageUri,
        },
      });

      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('addScreen.aiAnalysisError');
      toast.error(message);
    }

    router.push({
      pathname: '/food-detail',
      params: {
        source: 'barcode',
        notes: barcodeValue,
        foodName: t('foodDetail.unknownFoodName'),
        quantityLabel: t('foodDetail.defaultQuantity'),
        quantityGrams: '',
        calories: '',
        carbs: '',
        protein: '',
        fat: '',
      },
    });
  }, [closeAddMealSheet, openQrScanner, router, t]);

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
        bottomSheetRef={addMealSheetRef}
        topInset={insets.top}
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
        onViewAllRecentPress={handleViewAllRecentFoods}
        onSheetChange={(index) => {
          setAddSheetState(index >= 0 ? 'open' : 'closed');
        }}
      />
      <MealPlanSuggestionSheet
        bottomSheetRef={mealPlanSuggestionSheetRef}
        topInset={insets.top}
        onSheetChange={(index) => {
          setMealPlanSheetState(index >= 0 ? 'open' : 'closed');
        }}
      />
      {isAnalyzingPhoto ? (
        <View style={styles.analysisOverlay} pointerEvents="auto">
          <Loading message={t('addScreen.captureModes.scanFoodAnalyzingWithAi')} />
        </View>
      ) : null}
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
