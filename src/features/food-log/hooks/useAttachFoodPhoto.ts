import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/providers/app-alert';
import { useOpenCamera, useOpenImageLibrary } from '@/providers/camera';

/** Asks camera vs. library, then resolves with the picked photo URI (or null if cancelled). */
export function useAttachFoodPhoto() {
  const { t } = useTranslation();
  const openCamera = useOpenCamera();
  const openImageLibrary = useOpenImageLibrary();

  return useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        appAlert.alert(t('chat.attachTitle'), undefined, [
          {
            text: t('chat.takePhoto'),
            onPress: () => {
              void openCamera().then((photo) => resolve(photo?.uri ?? null));
            },
          },
          {
            text: t('chat.pickFromLibrary'),
            onPress: () => {
              void openImageLibrary().then((photo) => resolve(photo?.uri ?? null));
            },
          },
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
        ]);
      }),
    [openCamera, openImageLibrary, t]
  );
}
