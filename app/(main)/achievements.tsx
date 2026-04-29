import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Icon, ProgressBar, ScreenContainer, Text } from '@/common/components';
import type { IconProps } from '@/common/components/Icon';
import { syncGoalTracking } from '@/features/nutrition/services/goalTrackingService';
import type { AchievementKey, GoalTrackingSnapshot } from '@/features/nutrition/types';
import { formatWeightGoalTitle } from '@/features/nutrition/utils/goalTracking';

interface AchievementDefinition {
  key: AchievementKey;
  icon: IconProps['name'];
  titleKey: string;
  bodyKey: string;
  requirementKey: string;
  tone: 'gold' | 'green' | 'blue' | 'neutral';
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: 'fire_keeper_7',
    icon: 'flame-outline',
    titleKey: 'achievementsScreen.items.fireKeeper7.title',
    bodyKey: 'achievementsScreen.items.fireKeeper7.body',
    requirementKey: 'achievementsScreen.items.fireKeeper7.requirement',
    tone: 'gold',
  },
  {
    key: 'fire_keeper_14',
    icon: 'flame',
    titleKey: 'achievementsScreen.items.fireKeeper14.title',
    bodyKey: 'achievementsScreen.items.fireKeeper14.body',
    requirementKey: 'achievementsScreen.items.fireKeeper14.requirement',
    tone: 'blue',
  },
  {
    key: 'goal_crusher',
    icon: 'trophy-outline',
    titleKey: 'achievementsScreen.items.goalCrusher.title',
    bodyKey: 'achievementsScreen.items.goalCrusher.body',
    requirementKey: 'achievementsScreen.items.goalCrusher.requirement',
    tone: 'green',
  },
  {
    key: 'first_maintain_goal',
    icon: 'leaf-outline',
    titleKey: 'achievementsScreen.items.firstMaintainGoal.title',
    bodyKey: 'achievementsScreen.items.firstMaintainGoal.body',
    requirementKey: 'achievementsScreen.items.firstMaintainGoal.requirement',
    tone: 'neutral',
  },
];

function formatCount(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function AchievementStatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card variant="filled" style={styles.statCard}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="body" weight="bold" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="caption" color="secondary">
        {subtitle}
      </Text>
    </Card>
  );
}

function AchievementCard({
  definition,
  unlocked,
}: {
  definition: AchievementDefinition;
  unlocked: boolean;
}) {
  const { t } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();
  let toneStyles:
    | {
        backgroundColor: string;
        borderColor: string;
        iconColor: string;
        accentColor: string;
      }
    | undefined;

  switch (definition.tone) {
    case 'gold':
      toneStyles = {
        backgroundColor: theme.colors.state.warningBg,
        borderColor: theme.colors.state.warning,
        iconColor: theme.colors.state.warning,
        accentColor: theme.colors.state.warning,
      };
      break;
    case 'green':
      toneStyles = {
        backgroundColor: theme.colors.state.successBg,
        borderColor: theme.colors.state.success,
        iconColor: theme.colors.state.success,
        accentColor: theme.colors.state.success,
      };
      break;
    case 'blue':
      toneStyles = {
        backgroundColor: theme.colors.state.infoBg,
        borderColor: theme.colors.state.info,
        iconColor: theme.colors.state.info,
        accentColor: theme.colors.state.info,
      };
      break;
    case 'neutral':
      toneStyles = {
        backgroundColor: theme.colors.background.section,
        borderColor: theme.colors.border.default,
        iconColor: theme.colors.text.secondary,
        accentColor: theme.colors.brand.primary,
      };
      break;
  }

  return (
    <Card
      variant="filled"
      style={[
        styles.achievementCard,
        unlocked ? styles.achievementCardUnlocked : styles.achievementCardLocked,
      ]}
    >
      <View
        style={[
          styles.achievementIconWrap,
          {
            backgroundColor: toneStyles.backgroundColor,
            borderColor: toneStyles.borderColor,
          },
        ]}
      >
        <Icon name={definition.icon} size={24} color={toneStyles.iconColor} />
      </View>
      <View style={styles.achievementCopy}>
        <Text variant="bodySmall" weight="bold" numberOfLines={2}>
          {translate(definition.titleKey)}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={3}>
          {translate(definition.bodyKey)}
        </Text>
      </View>
      <View style={styles.achievementFooter}>
        <Text variant="caption" weight="semibold" style={{ color: toneStyles.accentColor }}>
          {unlocked
            ? translate('achievementsScreen.unlocked')
            : translate(definition.requirementKey)}
        </Text>
      </View>
    </Card>
  );
}

export default function AchievementsScreen() {
  const { t, i18n } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();
  const router = useRouter();
  const [goalTracking, setGoalTracking] = useState<GoalTrackingSnapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void syncGoalTracking().then((snapshot) => {
        if (!active) {
          return;
        }

        setGoalTracking(snapshot);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const unlockedAchievements = useMemo(
    () => goalTracking?.unlockedAchievements ?? [],
    [goalTracking?.unlockedAchievements]
  );
  const unlockedAchievementKeys = useMemo(
    () => new Set(unlockedAchievements.map((item) => item.achievementKey)),
    [unlockedAchievements]
  );
  const completedGoals = goalTracking?.goalHistory.filter((goal) => goal.completed).length ?? 0;
  const totalGoals = goalTracking?.goalHistory.length ?? 0;
  const currentStreak = goalTracking?.currentStreak ?? 0;
  const currentYear = new Date().getFullYear();
  let nextTarget = 30;
  let nextLabelKey: 'fireKeeper7' | 'fireKeeper14' | null = null;

  if (currentStreak < 7) {
    nextTarget = 7;
    nextLabelKey = 'fireKeeper7';
  } else if (currentStreak < 14) {
    nextTarget = 14;
    nextLabelKey = 'fireKeeper14';
  }

  const nextLabel = nextLabelKey
    ? translate(`achievementsScreen.items.${nextLabelKey}.title`)
    : translate('achievementsScreen.nextMilestoneFallback');
  const streakProgress = Math.min(100, Math.round((currentStreak / nextTarget) * 100));
  const activeGoalTitle = goalTracking?.activeGoal
    ? formatWeightGoalTitle(t, goalTracking.activeGoal.goal)
    : t('achievementsScreen.heroFallbackTitle');
  const achievementCount = unlockedAchievements.length;

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <View style={styles.content}>
          <Card variant="elevated" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Icon name="trophy-outline" size={36} color={theme.colors.brand.primary} />
              </View>
              <View style={styles.heroCopy}>
                <Text variant="body" weight="bold" numberOfLines={1}>
                  {translate('achievementsScreen.heroTitle')}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {translate('achievementsScreen.heroBody')}
                </Text>
                <View style={styles.heroPill}>
                  <Text variant="caption" weight="semibold" color="primary" numberOfLines={1}>
                    {activeGoalTitle}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroSummary}>
              <View style={styles.heroStreakBlock}>
                <Text variant="bodySmall" color="secondary">
                  {translate('achievementsScreen.currentStreakLabel')}
                </Text>
                <View style={styles.heroStreakRow}>
                  <Text variant="h2" weight="bold" style={styles.heroStreakValue}>
                    {formatCount(currentStreak, i18n.language)}
                  </Text>
                  <Text variant="bodySmall" weight="semibold" color="secondary">
                    {translate('achievementsScreen.currentStreakUnit')}
                  </Text>
                </View>
              </View>
              <Button
                title={translate('achievementsScreen.viewGoalsAction')}
                variant="outline"
                size="sm"
                onPress={() => {
                  router.push('/goal-history');
                }}
              />
            </View>

            <View style={styles.heroProgress}>
              <View style={styles.heroProgressHeader}>
                <Text variant="caption" color="secondary">
                  {translate('achievementsScreen.progressLabel')}
                </Text>
                <Text variant="caption" weight="semibold" color="secondary">
                  {currentStreak >= 14
                    ? translate('achievementsScreen.progressComplete')
                    : translate('achievementsScreen.progressBody', {
                        remaining: Math.max(0, nextTarget - currentStreak),
                        label: nextLabel,
                      })}
                </Text>
              </View>
              <ProgressBar
                value={streakProgress}
                size="md"
                colorScheme="success"
                accessibilityLabel={t('achievementsScreen.progressLabel')}
              />
            </View>
          </Card>

          <Card variant="filled" style={styles.summaryCard}>
            <View style={styles.sectionHeader}>
              <Text variant="body" weight="bold">
                {translate('achievementsScreen.summaryTitle', { year: currentYear })}
              </Text>
              <Text variant="caption" color="secondary">
                {translate('achievementsScreen.summaryBody')}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <AchievementStatCard
                label={translate('achievementsScreen.stats.totalGoals')}
                value={formatCount(totalGoals, i18n.language)}
                subtitle={translate('achievementsScreen.stats.totalGoalsSubtitle')}
              />
              <AchievementStatCard
                label={translate('achievementsScreen.stats.completedGoals')}
                value={formatCount(completedGoals, i18n.language)}
                subtitle={translate('achievementsScreen.stats.completedGoalsSubtitle')}
              />
              <AchievementStatCard
                label={translate('achievementsScreen.stats.unlocked')}
                value={formatCount(achievementCount, i18n.language)}
                subtitle={translate('achievementsScreen.stats.unlockedSubtitle')}
              />
            </View>
          </Card>

          <Card variant="elevated" style={styles.collectionCard}>
            <View style={styles.sectionHeader}>
              <Text variant="body" weight="bold">
                {translate('achievementsScreen.collectionTitle')}
              </Text>
              <Text variant="caption" color="secondary">
                {translate('achievementsScreen.collectionSubtitle')}
              </Text>
            </View>

            {achievementCount === 0 ? (
              <View style={styles.emptyState}>
                <Text variant="bodySmall" weight="semibold" align="center">
                  {translate('achievementsScreen.emptyTitle')}
                </Text>
                <Text variant="caption" color="secondary" align="center" style={styles.emptyBody}>
                  {translate('achievementsScreen.emptyBody')}
                </Text>
                <Button
                  title={translate('achievementsScreen.emptyAction')}
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    router.push('/goal-history');
                  }}
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.achievementList}
              >
                {ACHIEVEMENTS.map((definition) => (
                  <AchievementCard
                    key={definition.key}
                    definition={definition}
                    unlocked={unlockedAchievementKeys.has(definition.key)}
                  />
                ))}
              </ScrollView>
            )}
          </Card>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  content: {
    gap: theme.metrics.spacingV.p16,
  },
  heroCard: {
    gap: theme.metrics.spacingV.p16,
    padding: theme.metrics.spacing.p16,
    backgroundColor: theme.colors.background.surface,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  heroBadge: {
    width: theme.metrics.spacing.p72,
    height: theme.metrics.spacing.p72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.state.warningBg,
    borderWidth: 1,
    borderColor: theme.colors.state.warning,
  },
  heroCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  heroPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  heroSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  heroStreakBlock: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  heroStreakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p8,
  },
  heroStreakValue: {
    color: theme.colors.brand.primary,
  },
  heroProgress: {
    gap: theme.metrics.spacingV.p8,
  },
  heroProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  summaryCard: {
    gap: theme.metrics.spacingV.p12,
  },
  sectionHeader: {
    gap: theme.metrics.spacingV.p4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  statCard: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p12,
  },
  statValue: {
    color: theme.colors.brand.primary,
  },
  collectionCard: {
    gap: theme.metrics.spacingV.p12,
  },
  achievementList: {
    gap: theme.metrics.spacing.p12,
    paddingRight: theme.metrics.spacing.p16,
  },
  achievementCard: {
    width: 184,
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
  },
  achievementCardUnlocked: {
    borderColor: theme.colors.state.success,
  },
  achievementCardLocked: {
    opacity: 0.78,
  },
  achievementIconWrap: {
    width: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1,
  },
  achievementCopy: {
    gap: theme.metrics.spacingV.p4,
    flexGrow: 1,
  },
  achievementFooter: {
    paddingTop: theme.metrics.spacingV.p4,
  },
  emptyState: {
    gap: theme.metrics.spacingV.p12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.metrics.spacingV.p20,
    paddingHorizontal: theme.metrics.spacing.p12,
  },
  emptyBody: {
    lineHeight: theme.fonts.size.lg,
  },
}));
