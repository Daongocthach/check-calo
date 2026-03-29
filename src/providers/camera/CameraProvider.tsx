import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { useScreenDimensions } from '@/hooks/useScreenDimensions';
import { toast } from '@/utils/toast';

export interface CameraCaptureFile {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  mimeType: 'image/jpeg';
}

type OpenCamera = () => Promise<CameraCaptureFile | null>;
type OpenBarcodeScanner = () => Promise<string | null>;

type CameraMode = 'capture' | 'scan';

interface CameraContextValue {
  openCamera: OpenCamera;
  openBarcodeScanner: OpenBarcodeScanner;
}

const CameraContext = createContext<CameraContextValue | null>(null);

interface CameraProviderProps {
  children: ReactNode;
}

const SCAN_ZOOM = 0.25;
const MIN_ZOOM = 0;
const MAX_ZOOM = 1;

function clampZoom(value: number) {
  return Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
}

function buildFileName(uri: string) {
  const uriName = uri.split('/').pop();

  if (uriName) {
    return uriName;
  }

  return `capture-${Date.now()}.jpg`;
}

export function CameraProvider({ children }: CameraProviderProps) {
  const { t } = useTranslation();
  const { isTablet } = useScreenDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [visible, setVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [mode, setMode] = useState<CameraMode>('capture');
  const [zoom, setZoom] = useState(0);
  const hasScannedRef = useRef(false);
  const pinchZoomStartRef = useRef(0);
  const zoomRef = useRef(0);
  const cameraRef = useRef<CameraView | null>(null);
  const resolverRef = useRef<((value: CameraCaptureFile | string | null) => void) | null>(null);

  const setZoomValue = useCallback((value: number) => {
    const nextZoom = clampZoom(value);
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
  }, []);

  const closeWithResult = useCallback(
    (result: CameraCaptureFile | string | null) => {
      resolverRef.current?.(result);
      resolverRef.current = null;
      setVisible(false);
      setIsCapturing(false);
      setFacing('back');
      setIsTorchEnabled(false);
      setMode('capture');
      setZoomValue(0);
      hasScannedRef.current = false;
    },
    [setZoomValue]
  );

  const requestCameraAccess = useCallback(async () => {
    const hasPermission = permission?.granted ?? false;
    let isGranted = hasPermission;

    if (!hasPermission) {
      const nextPermission = await requestPermission();
      isGranted = nextPermission.granted;
    }

    if (!isGranted) {
      toast.error(t('camera.permissionDenied'));
      return false;
    }

    return true;
  }, [permission?.granted, requestPermission, t]);

  const openCamera = useCallback(async () => {
    if (resolverRef.current) {
      return null;
    }

    const isGranted = await requestCameraAccess();

    if (!isGranted) {
      return null;
    }

    setMode('capture');
    setZoomValue(0);
    setVisible(true);

    return new Promise<CameraCaptureFile | null>((resolve) => {
      resolverRef.current = (result) => {
        resolve(typeof result === 'string' ? null : result);
      };
    });
  }, [requestCameraAccess, setZoomValue]);

  const openBarcodeScanner = useCallback(async () => {
    if (resolverRef.current) {
      return null;
    }

    const isGranted = await requestCameraAccess();

    if (!isGranted) {
      return null;
    }

    setFacing('back');
    setMode('scan');
    setZoomValue(SCAN_ZOOM);
    setVisible(true);

    return new Promise<string | null>((resolve) => {
      resolverRef.current = (result) => {
        resolve(typeof result === 'string' ? result : null);
      };
    });
  }, [requestCameraAccess, setZoomValue]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.15,
        shutterSound: false,
      });

      closeWithResult({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        fileName: buildFileName(photo.uri),
        mimeType: 'image/jpeg',
      });
    } catch {
      toast.error(t('camera.captureFailed'));
      setIsCapturing(false);
    }
  }, [closeWithResult, isCapturing, t]);

  const handleDismiss = useCallback(() => {
    closeWithResult(null);
  }, [closeWithResult]);

  const handleBarcodeScanned = useCallback(
    (event: BarcodeScanningResult) => {
      if (hasScannedRef.current || mode !== 'scan') {
        return;
      }

      hasScannedRef.current = true;

      const rawValue = event.data.trim();
      if (!rawValue) {
        toast.error(t('camera.scanFailed'));
        hasScannedRef.current = false;
        return;
      }

      closeWithResult(rawValue);
    },
    [closeWithResult, mode, t]
  );

  const contextValue = useMemo(
    () => ({
      openCamera,
      openBarcodeScanner,
    }),
    [openBarcodeScanner, openCamera]
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onBegin(() => {
          pinchZoomStartRef.current = zoomRef.current;
        })
        .onUpdate((event) => {
          setZoomValue(pinchZoomStartRef.current + (event.scale - 1) * 0.35);
        }),
    [setZoomValue]
  );

  return (
    <CameraContext.Provider value={contextValue}>
      {children}
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
                onBarcodeScanned={mode === 'scan' ? handleBarcodeScanned : undefined}
                barcodeScannerSettings={
                  mode === 'scan'
                    ? {
                        barcodeTypes: [
                          'ean13',
                          'ean8',
                          'upc_a',
                          'upc_e',
                          'code128',
                          'code39',
                          'itf14',
                          'pdf417',
                        ],
                      }
                    : undefined
                }
              />
            </View>
          </GestureDetector>

          {mode === 'scan' ? (
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
                {mode === 'scan' ? t('camera.barcodeTitle') : t('camera.title')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('camera.actions.close')}
                onPress={handleDismiss}
                style={styles.headerAction}
              >
                <Icon name="close" variant="onBrand" size={18} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.footerSafeArea, isTablet && styles.footerSafeAreaTablet]}>
            <View style={[styles.footer, isTablet && styles.footerTablet]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('camera.actions.flip')}
                disabled={mode === 'scan'}
                onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                style={[
                  styles.secondaryAction,
                  isTablet && styles.secondaryActionTablet,
                  mode === 'scan' && styles.secondaryActionDisabled,
                ]}
              >
                <Icon name="camera-reverse-outline" variant="onBrand" size={22} />
              </Pressable>

              {mode === 'capture' ? (
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
              ) : (
                <View style={[styles.scanModeSpacer, isTablet && styles.scanModeSpacerTablet]} />
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
                  size={22}
                />
              </Pressable>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </CameraContext.Provider>
  );
}

export function useOpenCamera() {
  const context = useContext(CameraContext);

  if (!context) {
    throw new Error('useOpenCamera must be used within CameraProvider');
  }

  return context.openCamera;
}

export function useOpenQrScanner() {
  const context = useContext(CameraContext);

  if (!context) {
    throw new Error('useOpenQrScanner must be used within CameraProvider');
  }

  return context.openBarcodeScanner;
}

const styles = StyleSheet.create((theme, rt) => ({
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTablet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 960,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    zIndex: 2,
  },
  headerText: {
    color: theme.colors.text.inverse,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  footerTablet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
  },
  footerSafeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    zIndex: 2,
  },
  footerSafeAreaTablet: {
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p24,
  },
  secondaryAction: {
    width: 46,
    height: 46,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
  secondaryActionTablet: {
    width: 58,
    height: 58,
  },
  secondaryActionDisabled: {
    opacity: 0.45,
  },
  captureOuter: {
    width: 82,
    height: 82,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 4,
    borderColor: theme.colors.text.onBrand,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.focus,
  },
  captureOuterTablet: {
    width: 96,
    height: 96,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.text.onBrand,
  },
  captureInnerTablet: {
    width: 70,
    height: 70,
  },
  captureDisabled: {
    opacity: 0.6,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p16,
  },
  scanFrame: {
    width: 300,
    height: 300,
    borderWidth: 3,
    borderRadius: theme.metrics.borderRadius.md,
    borderColor: theme.colors.text.onBrand,
  },
  scanFocusDot: {
    width: 12,
    height: 12,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.text.onBrand,
  },
  scanHint: {
    color: theme.colors.text.onBrand,
    textAlign: 'center',
  },
  scanModeSpacer: {
    width: 82,
    height: 82,
  },
  scanModeSpacerTablet: {
    width: 96,
    height: 96,
  },
}));
