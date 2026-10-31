import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUnistyles } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { useScreenDimensions } from '@/hooks/useScreenDimensions';
import { toast } from '@/utils/toast';
import { toCaptureFile, type CameraCaptureFile } from './cameraFiles';
import { styles } from './CameraModal.styles';

export type CameraMode = 'capture' | 'scan';

const SCAN_ZOOM = 0.25;
const PINCH_ZOOM_SPEED = 0.35;
const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'qr',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'itf14',
  'pdf417',
] as const;

function clampZoom(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

interface CameraModalProps {
  visible: boolean;
  mode: CameraMode;
  /** A photo in capture mode, the scanned code in scan mode, or null when dismissed. */
  onResult: (result: CameraCaptureFile | string | null) => void;
}

/**
 * Full-screen camera for taking a photo or scanning a barcode. Remount it (via `key`) for each
 * session so zoom, torch and facing start fresh.
 */
export function CameraModal({ visible, mode, onResult }: CameraModalProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const { isTablet } = useScreenDimensions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(mode === 'scan' ? SCAN_ZOOM : 0);
  const hasScannedRef = useRef(false);
  const pinchZoomStartRef = useRef(0);
  const zoomRef = useRef(zoom);
  const cameraRef = useRef<CameraView | null>(null);
  const isScan = mode === 'scan';

  const setZoomValue = useCallback((value: number) => {
    const nextZoom = clampZoom(value);
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
  }, []);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onBegin(() => {
          pinchZoomStartRef.current = zoomRef.current;
        })
        .onUpdate((event) => {
          setZoomValue(pinchZoomStartRef.current + (event.scale - 1) * PINCH_ZOOM_SPEED);
        }),
    [setZoomValue]
  );

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1,
        shutterSound: false,
      });
      onResult(await toCaptureFile(photo));
    } catch {
      toast.error(t('camera.captureFailed'));
      setIsCapturing(false);
    }
  };

  const handleBarcodeScanned = (event: BarcodeScanningResult) => {
    if (hasScannedRef.current) {
      return;
    }

    const rawValue = event.data.trim();
    if (!rawValue) {
      toast.error(t('camera.scanFailed'));
      return;
    }

    hasScannedRef.current = true;
    onResult(rawValue);
  };

  const handleDismiss = () => onResult(null);
  const iconColor = theme.colors.shadow.onShadow;

  return (
    <Modal
      animationType="fade"
      statusBarTranslucent
      visible={visible}
      onRequestClose={handleDismiss}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <GestureDetector gesture={pinchGesture}>
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              zoom={zoom}
              enableTorch={isTorchEnabled}
              onBarcodeScanned={isScan ? handleBarcodeScanned : undefined}
              barcodeScannerSettings={isScan ? { barcodeTypes: [...BARCODE_TYPES] } : undefined}
            />
          </View>
        </GestureDetector>

        {isScan ? (
          <View pointerEvents="none" style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <View style={styles.scanFocusDot} />
            <Text variant="bodySmall" style={styles.scanHint}>
              {t('camera.barcodeHint')}
            </Text>
          </View>
        ) : null}

        <View style={styles.headerSafeArea}>
          <View style={[styles.header, isTablet && styles.headerTablet]}>
            <Text variant="label" style={styles.headerText}>
              {isScan ? t('camera.barcodeTitle') : t('camera.title')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('camera.actions.close')}
              onPress={handleDismiss}
              style={styles.headerAction}
            >
              <Icon name="close" variant="onBrand" color={iconColor} size={18} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.footerSafeArea, isTablet && styles.footerSafeAreaTablet]}>
          <View style={[styles.footer, isTablet && styles.footerTablet]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('camera.actions.flip')}
              disabled={isScan}
              onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
              style={[
                styles.secondaryAction,
                isTablet && styles.secondaryActionTablet,
                isScan && styles.secondaryActionDisabled,
              ]}
            >
              <Icon name="camera-reverse-outline" variant="onBrand" color={iconColor} size={22} />
            </Pressable>

            {isScan ? (
              <View style={[styles.scanModeSpacer, isTablet && styles.scanModeSpacerTablet]} />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('camera.actions.capture')}
                disabled={isCapturing}
                onPress={handleCapture}
                style={[
                  styles.captureOuter,
                  isTablet && styles.captureOuterTablet,
                  isCapturing && styles.captureDisabled,
                ]}
              >
                <View style={[styles.captureInner, isTablet && styles.captureInnerTablet]} />
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('camera.actions.toggleFlash')}
              onPress={() => setIsTorchEnabled((prev) => !prev)}
              style={[styles.secondaryAction, isTablet && styles.secondaryActionTablet]}
            >
              <Icon
                name={isTorchEnabled ? 'flash' : 'flash-outline'}
                variant="onBrand"
                color={iconColor}
                size={22}
              />
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
