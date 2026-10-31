import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, Keyframe } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components/Text';
import { hs, rf, vs } from '@/theme/metrics';
import {
  appAlert,
  registerAppAlertHandler,
  type AppAlertButton,
  type AppAlertPayload,
} from './appAlert';

interface AppAlertProviderProps {
  children: ReactNode;
}

interface ShownAlert extends AppAlertPayload {
  /** Remounts the card when one alert replaces another, so it animates in again. */
  key: number;
}

const ENTER_DURATION = 220;
const EXIT_DURATION = 150;

const cardEntering = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.15 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(ENTER_DURATION);

/**
 * Orders actions the way `UIAlertController` does: cancel on the left of a side-by-side pair,
 * at the bottom of a stack.
 */
function orderButtons(buttons: AppAlertButton[]) {
  const cancel = buttons.find((button) => button.style === 'cancel');

  if (!cancel || buttons.length < 2) {
    return buttons;
  }

  const rest = buttons.filter((button) => button !== cancel);

  return buttons.length === 2 ? [cancel, ...rest] : [...rest, cancel];
}

export function AppAlertProvider({ children }: AppAlertProviderProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [currentAlert, setCurrentAlert] = useState<ShownAlert | null>(null);
  const alertCount = useRef(0);

  useEffect(
    () =>
      registerAppAlertHandler((payload) => {
        alertCount.current += 1;
        setCurrentAlert({ ...payload, key: alertCount.current });
      }),
    []
  );

  const dismiss = () => setCurrentAlert(null);

  const buttons = useMemo(() => {
    const fallbackButtons: AppAlertButton[] = [{ text: String(t('common.ok' as never)) }];

    return orderButtons(currentAlert?.buttons?.length ? currentAlert.buttons : fallbackButtons);
  }, [currentAlert?.buttons, t]);

  const isStacked = buttons.length > 2;
  const dismissOnBackdropPress = currentAlert?.options?.dismissOnBackdropPress ?? true;

  return (
    <View style={styles.container}>
      {children}

      {currentAlert ? (
        <Animated.View
          style={styles.backdrop}
          entering={FadeIn.duration(ENTER_DURATION)}
          exiting={FadeOut.duration(EXIT_DURATION)}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdropPress ? dismiss : undefined}
            accessible={false}
          />

          <Animated.View
            key={currentAlert.key}
            style={styles.card}
            entering={cardEntering}
            exiting={FadeOut.duration(EXIT_DURATION)}
            accessibilityRole="alert"
          >
            {Platform.OS === 'ios' ? (
              <>
                <BlurView
                  style={StyleSheet.absoluteFill}
                  intensity={100}
                  tint={theme.colors.mode === 'dark' ? 'systemMaterialDark' : 'systemMaterialLight'}
                />
                <View style={styles.tint} />
              </>
            ) : null}

            <View style={styles.content}>
              <Text weight="semibold" align="center" style={styles.title}>
                {currentAlert.title}
              </Text>

              {currentAlert.message ? (
                <Text align="center" style={styles.message}>
                  {currentAlert.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.actions({ isStacked })}>
              {buttons.map((button, index) => (
                <Pressable
                  key={`${index}-${button.text}`}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.action({ isStacked }),
                    index > 0 && (isStacked ? styles.stackedDivider : styles.rowDivider),
                    pressed && styles.actionPressed,
                  ]}
                  onPress={() => {
                    dismiss();
                    button.onPress?.();
                  }}
                >
                  <Text
                    align="center"
                    numberOfLines={1}
                    weight={button.style === 'cancel' ? 'regular' : 'semibold'}
                    style={[
                      styles.actionLabel,
                      button.style === 'destructive' && styles.destructiveLabel,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function useAppAlert() {
  return appAlert;
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.alert.backdrop,
  },
  card: {
    width: hs(270),
    maxWidth: '90%',
    borderRadius: hs(14),
    overflow: 'hidden' as const,
    ...(Platform.OS === 'ios' ? {} : { backgroundColor: theme.colors.alert.surfaceSolid }),
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.alert.surface,
  },
  content: {
    paddingHorizontal: hs(16),
    paddingTop: vs(19),
    paddingBottom: vs(20),
    gap: vs(4),
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: rf(17),
    lineHeight: rf(22),
  },
  message: {
    color: theme.colors.text.primary,
    fontSize: rf(13),
    lineHeight: rf(18),
  },
  actions: ({ isStacked }: { isStacked: boolean }) => ({
    flexDirection: isStacked ? ('column' as const) : ('row' as const),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.alert.separator,
  }),
  action: ({ isStacked }: { isStacked: boolean }) => ({
    flex: isStacked ? undefined : 1,
    minHeight: vs(44),
    justifyContent: 'center' as const,
    paddingHorizontal: hs(8),
  }),
  stackedDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.alert.separator,
  },
  rowDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.alert.separator,
  },
  actionPressed: {
    backgroundColor: theme.colors.alert.pressed,
  },
  actionLabel: {
    color: theme.colors.alert.action,
    fontSize: rf(17),
    lineHeight: rf(22),
  },
  destructiveLabel: {
    color: theme.colors.alert.destructive,
  },
}));
