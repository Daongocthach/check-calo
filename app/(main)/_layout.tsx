import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddMealSourceBottomSheet } from '@/features/nutrition/components/AddMealSourceBottomSheet';
import { lookupFoodByBarcode } from '@/features/nutrition/services/barcodeFoodLookup';
import { analyzeFoodPhotoWithGemini } from '@/features/nutrition/services/geminiFoodAnalyzer';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import { useOpenCamera, useOpenQrScanner } from '@/providers/camera';
import { toast } from '@/utils/toast';

export default function MainLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openCamera = useOpenCamera();
  const openQrScanner = useOpenQrScanner();
  const addMealSheetRef = useRef<BottomSheetModal>(null);
  const openRequestId = useAddMealSourceSheetStore((state) => state.openRequestId);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  useEffect(() => {
    if (openRequestId > 0) {
      addMealSheetRef.current?.present();
    }
  }, [openRequestId]);

  const openFoodFormFromPhoto = useCallback(
    (imageUri: string, params?: Record<string, string>) => {
      router.push({
        pathname: '/food-form',
        params: {
          imageUri,
          context: 'addMeal',
          submitMode: 'instant',
          ...params,
        },
      });
    },
    [router]
  );

  const handleManualEntry = useCallback(() => {
    router.push({
      pathname: '/food-form',
      params: {
        context: 'addMeal',
        submitMode: 'instant',
      },
    });
  }, [router]);

  const handleCaptureFood = useCallback(async () => {
    if (isAnalyzingPhoto) {
      return;
    }

    const photo = await openCamera();

    if (!photo) {
      return;
    }

    setIsAnalyzingPhoto(true);

    try {
      const result = await analyzeFoodPhotoWithGemini(photo.uri);

      if (result.status === 'ready') {
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
            imageUri: photo.uri,
          },
        });
        return;
      }

      toast.error(result.assistantMessage ?? t('addScreen.aiAnalysisFallback'));
      openFoodFormFromPhoto(photo.uri);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('addScreen.aiAnalysisError');
      toast.error(message);
      openFoodFormFromPhoto(photo.uri);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }, [isAnalyzingPhoto, openCamera, openFoodFormFromPhoto, router, t]);

  const handleBarcodeScan = useCallback(async () => {
    const barcodeValue = await openQrScanner();

    if (!barcodeValue) {
      return;
    }

    try {
      const lookupResult = await lookupFoodByBarcode(barcodeValue);

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
  }, [openQrScanner, router, t]);

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
        <Stack.Screen name="notification-settings" />
      </Stack>
      <AddMealSourceBottomSheet
        bottomSheetRef={addMealSheetRef}
        topInset={insets.top}
        onManualPress={handleManualEntry}
        onPhotoPress={() => {
          void handleCaptureFood();
        }}
        onBarcodePress={() => {
          void handleBarcodeScan();
        }}
      />
    </>
  );
}
