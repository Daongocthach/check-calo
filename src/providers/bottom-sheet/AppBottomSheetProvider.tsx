import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { IconButton } from '@/common/components';

export interface OpenSheetOptions {
  snapPoints?: Array<string | number>;
  isScroll?: boolean;
  enablePanDownToClose?: boolean;
  showCloseButton?: boolean;
  containerVariant?: 'view' | 'scroll' | 'none';
  onDismiss?: () => void;
}

interface BottomSheetContextType {
  openSheet: (content: ReactNode, options?: OpenSheetOptions) => void;
  closeSheet: () => void;
}

interface AppBottomSheetProviderProps {
  children: ReactNode;
}

interface FixedBackdropProps extends Pick<BottomSheetBackdropProps, 'animatedIndex' | 'style'> {
  onPress: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

function FixedBackdrop({ animatedIndex, style, onPress }: FixedBackdropProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], 'clamp'),
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[style, styles.backdropContainer, animatedStyle]}
    >
      <Pressable style={styles.backdrop} onPress={onPress} />
    </Animated.View>
  );
}

export function AppBottomSheetProvider({ children }: AppBottomSheetProviderProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const pendingOpenRef = useRef(false);
  const isPresentedRef = useRef(false);
  const dismissHandlerRef = useRef<(() => void) | undefined>(undefined);
  const [content, setContent] = useState<ReactNode>(null);
  const [snapPoints, setSnapPoints] = useState<Array<string | number>>(['1%']);
  const [enablePanDownToClose, setEnablePanDownToClose] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [containerVariant, setContainerVariant] = useState<'view' | 'scroll' | 'none'>('view');

  useEffect(() => {
    if (!pendingOpenRef.current) {
      return;
    }

    pendingOpenRef.current = false;
    requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });
  }, [content, snapPoints]);

  const openSheet = useCallback<BottomSheetContextType['openSheet']>((nextContent, options) => {
    const {
      snapPoints: nextSnapPoints = ['70%'],
      isScroll: nextIsScroll = false,
      enablePanDownToClose: nextEnablePanDownToClose = true,
      showCloseButton: nextShowCloseButton,
      containerVariant: nextContainerVariant = nextIsScroll ? 'scroll' : 'view',
      onDismiss,
    } = options ?? {};

    pendingOpenRef.current = !isPresentedRef.current;
    dismissHandlerRef.current = onDismiss;
    setSnapPoints(nextSnapPoints);
    setContent(nextContent);
    setEnablePanDownToClose(nextEnablePanDownToClose);
    setShowCloseButton(nextShowCloseButton ?? !nextEnablePanDownToClose);
    setContainerVariant(nextContainerVariant);
  }, []);

  const closeSheet = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }, []);

  const contextValue = useMemo(
    () => ({
      openSheet,
      closeSheet,
    }),
    [closeSheet, openSheet]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <FixedBackdrop animatedIndex={props.animatedIndex} style={props.style} onPress={closeSheet} />
    ),
    [closeSheet]
  );

  const contentBottomPadding = theme.metrics.spacingV.p40 + insets.bottom;

  const closeButton = showCloseButton ? (
    <View style={styles.closeButtonContainer}>
      <IconButton
        icon="close"
        size="md"
        variant="ghost"
        onPress={closeSheet}
        accessibilityLabel={String(t('common.close' as never))}
      />
    </View>
  ) : null;

  let renderedContent = content;

  if (containerVariant === 'scroll') {
    renderedContent = (
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.scrollContentContainer,
          { paddingBottom: contentBottomPadding },
        ]}
        keyboardShouldPersistTaps="always"
      >
        {closeButton}
        {content}
      </BottomSheetScrollView>
    );
  }

  if (containerVariant === 'view') {
    renderedContent = (
      <BottomSheetView style={[styles.contentContainer, { paddingBottom: contentBottomPadding }]}>
        {closeButton}
        {content}
      </BottomSheetView>
    );
  }

  return (
    <BottomSheetModalProvider>
      <BottomSheetContext.Provider value={contextValue}>
        {children}

        <BottomSheetModal
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          topInset={insets.top}
          enableDynamicSizing={false}
          enablePanDownToClose={enablePanDownToClose}
          enableHandlePanningGesture={enablePanDownToClose}
          enableContentPanningGesture={enablePanDownToClose}
          enableOverDrag={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={[
            styles.sheetBackground,
            { backgroundColor: theme.colors.background.surface },
          ]}
          handleIndicatorStyle={[
            styles.sheetHandle,
            { backgroundColor: theme.colors.border.default },
          ]}
          onDismiss={() => {
            isPresentedRef.current = false;
            setContent(null);
            dismissHandlerRef.current?.();
            dismissHandlerRef.current = undefined;
          }}
          onChange={(index) => {
            isPresentedRef.current = index >= 0;
          }}
        >
          {renderedContent}
        </BottomSheetModal>
      </BottomSheetContext.Provider>
    </BottomSheetModalProvider>
  );
}

export function useAppBottomSheet() {
  const context = useContext(BottomSheetContext);

  if (!context) {
    throw new Error('useAppBottomSheet must be used within an AppBottomSheetProvider');
  }

  return context;
}

const styles = StyleSheet.create((theme) => ({
  contentContainer: {
    paddingHorizontal: theme.metrics.spacing.p20,
    paddingTop: theme.metrics.spacingV.p20,
  },
  scrollContentContainer: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p16,
  },
  closeButtonContainer: {
    alignItems: 'flex-end' as const,
    marginTop: -theme.metrics.spacingV.p8,
    marginBottom: theme.metrics.spacingV.p4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay.modal,
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetBackground: {
    borderTopLeftRadius: theme.metrics.borderRadius.xl,
    borderTopRightRadius: theme.metrics.borderRadius.xl,
  },
  sheetHandle: {
    width: theme.metrics.spacing.p40,
  },
}));
