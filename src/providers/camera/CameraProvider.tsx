import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
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
import { toast } from '@/utils/toast';
import { toCaptureFile, type CameraCaptureFile } from './cameraFiles';
import { CameraModal, type CameraMode } from './CameraModal';

export type { CameraCaptureFile } from './cameraFiles';

interface CameraContextValue {
  openCamera: () => Promise<CameraCaptureFile | null>;
  openImageLibrary: () => Promise<CameraCaptureFile | null>;
  openBarcodeScanner: () => Promise<string | null>;
}

const CameraContext = createContext<CameraContextValue | null>(null);

interface CameraProviderProps {
  children: ReactNode;
}

type CameraResult = CameraCaptureFile | string | null;

interface CameraSession {
  id: number;
  mode: CameraMode;
  visible: boolean;
}

/** Asks for a permission when it is not granted yet; toasts `deniedMessage` when refused. */
async function ensurePermission(
  permission: { granted: boolean } | null,
  request: () => Promise<{ granted: boolean }>,
  deniedMessage: string
) {
  if (permission?.granted || (await request()).granted) {
    return true;
  }

  toast.error(deniedMessage);
  return false;
}

export function CameraProvider({ children }: CameraProviderProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    ImagePicker.useMediaLibraryPermissions();
  // A new id per opening remounts the modal, so each session starts from a fresh camera state.
  const [session, setSession] = useState<CameraSession>({ id: 0, mode: 'capture', visible: false });
  const resolverRef = useRef<((value: CameraResult) => void) | null>(null);

  const closeWithResult = useCallback((result: CameraResult) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setSession((current) => ({ ...current, visible: false }));
  }, []);

  /** Shows the camera in `mode` and waits for the photo, the scanned code, or a dismiss. */
  const openSession = useCallback(
    async (mode: CameraMode): Promise<CameraResult> => {
      if (resolverRef.current) {
        return null;
      }

      const isGranted = await ensurePermission(
        permission,
        requestPermission,
        t('camera.permissionDenied')
      );

      if (!isGranted) {
        return null;
      }

      setSession((current) => ({ id: current.id + 1, mode, visible: true }));

      return new Promise<CameraResult>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [permission, requestPermission, t]
  );

  const openCamera = useCallback(async () => {
    const result = await openSession('capture');
    return typeof result === 'string' ? null : result;
  }, [openSession]);

  const openBarcodeScanner = useCallback(async () => {
    const result = await openSession('scan');
    return typeof result === 'string' ? result : null;
  }, [openSession]);

  const openImageLibrary = useCallback(async () => {
    const isGranted = await ensurePermission(
      mediaLibraryPermission,
      requestMediaLibraryPermission,
      t('camera.libraryPermissionDenied')
    );

    if (!isGranted) {
      return null;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (result.canceled || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return await toCaptureFile(asset, asset.fileName);
    } catch {
      toast.error(t('camera.libraryPickFailed'));
      return null;
    }
  }, [mediaLibraryPermission, requestMediaLibraryPermission, t]);

  const contextValue = useMemo(
    () => ({ openCamera, openImageLibrary, openBarcodeScanner }),
    [openBarcodeScanner, openCamera, openImageLibrary]
  );

  return (
    <CameraContext.Provider value={contextValue}>
      {children}
      <CameraModal
        key={session.id}
        visible={session.visible}
        mode={session.mode}
        onResult={closeWithResult}
      />
    </CameraContext.Provider>
  );
}

function useCameraContext(hookName: string) {
  const context = useContext(CameraContext);

  if (!context) {
    throw new Error(`${hookName} must be used within CameraProvider`);
  }

  return context;
}

export function useOpenCamera() {
  return useCameraContext('useOpenCamera').openCamera;
}

export function useOpenQrScanner() {
  return useCameraContext('useOpenQrScanner').openBarcodeScanner;
}

export function useOpenImageLibrary() {
  return useCameraContext('useOpenImageLibrary').openImageLibrary;
}
