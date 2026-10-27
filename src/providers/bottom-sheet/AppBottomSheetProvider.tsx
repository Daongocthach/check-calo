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
import { BackHandler, Keyboard, Pressable, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { IconButton } from '@/common/components';

export interface OpenSheetOptions {
  /**
   * Fixed snap points. When omitted, `view` and `scroll` sheets size themselves to their content
   * (capped below the top safe area); `none` sheets fall back to 70%.
   */
  snapPoints?: Array<string | number>;
  isScroll?: boolean;
  enablePanDownToClose?: boolean;
  showCloseButton?: boolean;
  /**
   * `view` / `scroll` wrap content with padding; `none` renders content as-is (e.g. a
   * `BottomSheetFlatList`). Every variant reserves the bottom safe area.
   */
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

const DEFAULT_FIXED_SNAP_POINTS = ['70%'];

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

function areSnapPointsEqual(
  left: Array<string | number> | undefined,
  right: Array<string | number> | undefined
) {
  if (!left || !right) {
    return left === right;
  }

  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function AppBottomSheetProvider({ children }: AppBottomSheetProviderProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  const dismissHandlerRef = useRef<(() => void) | undefined>(undefined);
  const [content, setContent] = useState<ReactNode>(null);
  const [snapPoints, setSnapPoints] = useState<Array<string | number> | undefined>(undefined);
  const [enablePanDownToClose, setEnablePanDownToClose] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [containerVariant, setContainerVariant] = useState<'view' | 'scroll' | 'none'>('view');
  const [isPresented, setIsPresented] = useState(false);
  // Bumped for every open request made while the sheet is hidden, so `present()` runs after the
  // new content commits, even when the caller re-opens with the exact same content and options.
  const [presentRequest, setPresentRequest] = useState(0);

  useEffect(() => {
    if (presentRequest === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });

    return () => cancelAnimationFrame(frame);
  }, [presentRequest]);

  const closeSheet = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }, []);

  // Registered only while the sheet is open so it runs before the navigator's back handler.
  useEffect(() => {
    if (!isPresented) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSheet();
      return true;
    });

    return () => subscription.remove();
  }, [closeSheet, isPresented]);

  const openSheet = useCallback<BottomSheetContextType['openSheet']>((nextContent, options) => {
    const {
      snapPoints: requestedSnapPoints,
      isScroll: nextIsScroll = false,
      enablePanDownToClose: nextEnablePanDownToClose = true,
      showCloseButton: nextShowCloseButton,
      containerVariant: nextContainerVariant = nextIsScroll ? 'scroll' : 'view',
      onDismiss,
    } = options ?? {};
    const nextSnapPoints =
      requestedSnapPoints ??
      (nextContainerVariant === 'none' ? DEFAULT_FIXED_SNAP_POINTS : undefined);

    dismissHandlerRef.current = onDismiss;
    // Keep the previous array when values are unchanged so the sheet does not recompute snap points
    // every time callers re-open it with fresh content.
    setSnapPoints((currentSnapPoints) =>
      areSnapPointsEqual(currentSnapPoints, nextSnapPoints) ? currentSnapPoints : nextSnapPoints
    );
    setContent(nextContent);
    setEnablePanDownToClose(nextEnablePanDownToClose);
    setShowCloseButton(nextShowCloseButton ?? !nextEnablePanDownToClose);
    setContainerVariant(nextContainerVariant);

    if (!isPresentedRef.current) {
      isPresentedRef.current = true;
      setPresentRequest((request) => request + 1);
    }
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

  const handleChange = useCallback((index: number) => {
    setIsPresented(index >= 0);
  }, []);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    setIsPresented(false);
    setContent(null);
    const onDismiss = dismissHandlerRef.current;
    dismissHandlerRef.current = undefined;
    onDismiss?.();
  }, []);

  const closeButton = showCloseButton ? (
    <View style={styles.closeButtonContainer}>
      <IconButton
        icon="close"
        size="md"
        variant="ghost"
        onPress={closeSheet}
        accessibilityLabel={t('common.close')}
      />
    </View>
  ) : null;

  let renderedContent: ReactNode;

  if (containerVariant === 'scroll') {
    renderedContent = (
      <BottomSheetScrollView
        contentContainerStyle={[styles.scrollContentContainer, styles.paddedBottom(insets.bottom)]}
        keyboardShouldPersistTaps="handled"
      >
        {closeButton}
        {content}
      </BottomSheetScrollView>
    );
  } else if (containerVariant === 'view') {
    renderedContent = (
      <BottomSheetView style={[styles.contentContainer, styles.paddedBottom(insets.bottom)]}>
        {closeButton}
        {content}
      </BottomSheetView>
    );
  } else {
    renderedContent = <View style={styles.bareContainer(insets.bottom)}>{content}</View>;
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
          enableDynamicSizing={!snapPoints}
          enablePanDownToClose={enablePanDownToClose}
          enableHandlePanningGesture={enablePanDownToClose}
          enableContentPanningGesture={enablePanDownToClose}
          enableOverDrag={false}
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          backdropComponent={renderBackdrop}
          backgroundStyle={[
            styles.sheetBackground,
            { backgroundColor: theme.colors.background.surface },
          ]}
          handleIndicatorStyle={[
            styles.sheetHandle,
            { backgroundColor: theme.colors.border.default },
          ]}
          onDismiss={handleDismiss}
          onChange={handleChange}
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
  paddedBottom: (bottomInset: number) => ({
    paddingBottom: bottomInset + theme.metrics.spacingV.p16,
  }),
  bareContainer: (bottomInset: number) => ({
    flex: 1,
    paddingBottom: bottomInset,
  }),
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
