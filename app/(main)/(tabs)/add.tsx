import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon, ScreenContainer, Text } from '@/common/components';
import { hs, vs } from '@/theme/metrics';

const PREVIEW_IMAGE_URI =
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80';

export default function AddCaloriesTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <ScreenContainer edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Image source={{ uri: PREVIEW_IMAGE_URI }} style={styles.previewImage} contentFit="cover" />
        <LinearGradient
          colors={[theme.colors.overlay.focus, theme.colors.overlay.modal]}
          style={styles.backdrop}
        >
          <View style={styles.focusWrap}>
            <View style={styles.focusFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
          </View>

          <Animated.View
            entering={SlideInDown.springify().damping(18).stiffness(180)}
            style={styles.modalCard}
          >
            <View style={styles.modalHandle} />
            <Text variant="h3" align="center">
              {t('addScreen.modalTitle')}
            </Text>
            <Text variant="bodySmall" color="secondary" align="center">
              {t('addScreen.modalSubtitle')}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('addScreen.captureModes.manual')}
              style={styles.singleActionButton}
              onPress={() => {
                router.push('/manual-food-entry');
              }}
            >
              <View style={styles.actionIconWrap}>
                <Icon name="create-outline" variant="primary" size={22} />
              </View>
              <View style={styles.singleActionCopy}>
                <Text variant="body" weight="semibold">
                  {t('addScreen.captureModes.manual')}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('addScreen.modeContent.manual.body')}
                </Text>
              </View>
              <Icon name="chevron-forward" variant="muted" size={18} />
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.metrics.borderRadius.xl,
    marginHorizontal: theme.metrics.spacing.p16,
    marginTop: theme.metrics.spacingV.p12,
    marginBottom: theme.metrics.spacingV.p24,
    backgroundColor: theme.colors.background.surface,
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p28,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  focusWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  focusFrame: {
    width: '84%',
    aspectRatio: 0.92,
    borderRadius: theme.metrics.borderRadius.xl,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: hs(44),
    height: vs(44),
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.text.inverse,
    borderTopLeftRadius: theme.metrics.borderRadius.lg,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: hs(44),
    height: vs(44),
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.text.inverse,
    borderTopRightRadius: theme.metrics.borderRadius.lg,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: hs(44),
    height: vs(44),
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: theme.colors.text.inverse,
    borderBottomLeftRadius: theme.metrics.borderRadius.lg,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: hs(44),
    height: vs(44),
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: theme.colors.text.inverse,
    borderBottomRightRadius: theme.metrics.borderRadius.lg,
  },
  modalCard: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p16,
    paddingBottom: theme.metrics.spacingV.p20,
    gap: theme.metrics.spacingV.p12,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  modalHandle: {
    alignSelf: 'center',
    width: hs(42),
    height: vs(5),
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.border.default,
  },
  singleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    minHeight: vs(92),
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  actionIconWrap: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  singleActionCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
}));
