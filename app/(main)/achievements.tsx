import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon, ScreenContainer, Text } from '@/common/components';
import { syncGoalTracking } from '@/features/nutrition/services/goalTrackingService';
import type { GoalTrackingSnapshot } from '@/features/nutrition/types';
import AmbassadorRankImage from '../../assets/ambassador.png';
import BeginnerRankImage from '../../assets/beginner.png';
import EliteRankImage from '../../assets/elite.png';
import LearnerRankImage from '../../assets/learner.png';
import LegendRankImage from '../../assets/legend.png';
import MasterRankImage from '../../assets/master.png';
import ProRankImage from '../../assets/pro.png';
import RookieRankImage from '../../assets/rookie.png';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type RankRequirement = {
  kind: 'streak' | 'goals';
  value: number;
};

interface RankDefinition {
  key: string;
  titleKey: string;
  image: number;
  tone: RankTone;
  requirements: RankRequirement[];
}

type RankTone = 'green' | 'blue' | 'lime' | 'gold' | 'slate' | 'indigo' | 'red' | 'amber';

const RANKS: RankDefinition[] = [
  {
    key: 'beginner',
    titleKey: 'achievementsScreen.ranks.beginner',
    image: BeginnerRankImage,
    tone: 'green',
    requirements: [{ kind: 'streak', value: 1 }],
  },
  {
    key: 'rookie',
    titleKey: 'achievementsScreen.ranks.rookie',
    image: RookieRankImage,
    tone: 'blue',
    requirements: [{ kind: 'streak', value: 2 }],
  },
  {
    key: 'learner',
    titleKey: 'achievementsScreen.ranks.learner',
    image: LearnerRankImage,
    tone: 'lime',
    requirements: [{ kind: 'streak', value: 3 }],
  },
  {
    key: 'pro',
    titleKey: 'achievementsScreen.ranks.pro',
    image: ProRankImage,
    tone: 'gold',
    requirements: [{ kind: 'streak', value: 7 }],
  },
  {
    key: 'elite',
    titleKey: 'achievementsScreen.ranks.elite',
    image: EliteRankImage,
    tone: 'slate',
    requirements: [
      { kind: 'streak', value: 14 },
      { kind: 'goals', value: 2 },
    ],
  },
  {
    key: 'master',
    titleKey: 'achievementsScreen.ranks.master',
    image: MasterRankImage,
    tone: 'indigo',
    requirements: [{ kind: 'goals', value: 3 }],
  },
  {
    key: 'ambassador',
    titleKey: 'achievementsScreen.ranks.ambassador',
    image: AmbassadorRankImage,
    tone: 'red',
    requirements: [
      { kind: 'goals', value: 4 },
      { kind: 'streak', value: 21 },
    ],
  },
  {
    key: 'legend',
    titleKey: 'achievementsScreen.ranks.legend',
    image: LegendRankImage,
    tone: 'amber',
    requirements: [{ kind: 'goals', value: 5 }],
  },
];

function formatCount(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function getDayUnit(t: TranslateFn, value: number) {
  return value === 1 ? t('achievementsScreen.units.day') : t('achievementsScreen.units.days');
}

function getGoalUnit(t: TranslateFn, value: number) {
  return value === 1 ? t('achievementsScreen.units.goal') : t('achievementsScreen.units.goals');
}

function getToneColors(
  theme: {
    colors: {
      brand: {
        primary: string;
        primaryVariant: string;
        tertiary: string;
        secondaryVariant: string;
      };
      background: {
        surface: string;
        surfaceAlt: string;
        section: string;
      };
      border: {
        default: string;
        strong: string;
      };
      state: {
        success: string;
        successBg: string;
        warning: string;
        warningBg: string;
        info: string;
        infoBg: string;
        error: string;
        errorBg: string;
      };
      text: {
        primary: string;
        secondary: string;
        tertiary: string;
      };
    };
  },
  tone: RankTone,
  unlocked: boolean
) {
  switch (tone) {
    case 'green':
      return {
        accent: theme.colors.state.success,
        background: unlocked ? theme.colors.state.successBg : theme.colors.background.surface,
        border: unlocked ? theme.colors.state.success : theme.colors.border.default,
        title: theme.colors.state.success,
      };
    case 'blue':
      return {
        accent: theme.colors.state.info,
        background: unlocked ? theme.colors.state.infoBg : theme.colors.background.surface,
        border: unlocked ? theme.colors.state.info : theme.colors.border.default,
        title: theme.colors.state.info,
      };
    case 'lime':
      return {
        accent: theme.colors.brand.primaryVariant,
        background: unlocked ? theme.colors.background.section : theme.colors.background.surface,
        border: unlocked ? theme.colors.brand.primaryVariant : theme.colors.border.default,
        title: theme.colors.brand.primaryVariant,
      };
    case 'gold':
      return {
        accent: theme.colors.state.warning,
        background: unlocked ? theme.colors.state.warningBg : theme.colors.background.surface,
        border: unlocked ? theme.colors.state.warning : theme.colors.border.default,
        title: theme.colors.state.warning,
      };
    case 'slate':
      return {
        accent: theme.colors.text.secondary,
        background: unlocked ? theme.colors.background.surfaceAlt : theme.colors.background.surface,
        border: unlocked ? theme.colors.border.strong : theme.colors.border.default,
        title: theme.colors.text.primary,
      };
    case 'indigo':
      return {
        accent: theme.colors.brand.primary,
        background: unlocked ? theme.colors.background.section : theme.colors.background.surface,
        border: unlocked ? theme.colors.brand.primary : theme.colors.border.default,
        title: theme.colors.brand.primary,
      };
    case 'red':
      return {
        accent: theme.colors.state.error,
        background: unlocked ? theme.colors.state.errorBg : theme.colors.background.surface,
        border: unlocked ? theme.colors.state.error : theme.colors.border.default,
        title: theme.colors.state.error,
      };
    case 'amber':
      return {
        accent: theme.colors.brand.tertiary,
        background: unlocked ? theme.colors.state.warningBg : theme.colors.background.surface,
        border: unlocked ? theme.colors.brand.tertiary : theme.colors.border.default,
        title: theme.colors.brand.tertiary,
      };
  }
}

function shouldUnlockRank(rank: RankDefinition, currentStreak: number, completedGoals: number) {
  return rank.requirements.every((requirement) => {
    if (requirement.kind === 'streak') {
      return currentStreak >= requirement.value;
    }

    return completedGoals >= requirement.value;
  });
}

function RankRail({ index, toneColor }: { index: number; toneColor: string }) {
  const indexCircleStyle = { backgroundColor: toneColor };
  const railLineStyle = { backgroundColor: toneColor };

  return (
    <View style={styles.rail}>
      <View style={[styles.rankIndexCircle, indexCircleStyle]}>
        <Text variant="caption" weight="bold" color="inverse">
          {index}
        </Text>
      </View>
      <View style={[styles.railLine, railLineStyle]} />
    </View>
  );
}

function RankStatus({ unlocked, label }: { unlocked: boolean; label: string }) {
  const { theme } = useUnistyles();

  if (unlocked) {
    return (
      <View
        style={[styles.statusBadge, styles.statusBadgeUnlocked]}
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        <Icon name="checkmark-circle" size={24} color={theme.colors.icon.inverse} />
      </View>
    );
  }

  return (
    <View
      style={[styles.statusBadge, styles.statusBadgeLocked]}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Icon name="lock-closed-outline" size={22} color={theme.colors.text.tertiary} />
    </View>
  );
}

function RankCard({
  rank,
  unlocked,
  rankNumber,
}: {
  rank: RankDefinition;
  unlocked: boolean;
  rankNumber: number;
}) {
  const { t } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();
  const toneColors = getToneColors(theme, rank.tone, unlocked);
  const rankCardStyle = [
    styles.rankCard,
    { backgroundColor: toneColors.background, borderColor: toneColors.border },
  ];
  const rankTitleStyle = { color: toneColors.title };
  const requirementToneStyle = { color: toneColors.accent };

  return (
    <View style={unlocked ? styles.rankRowUnlocked : styles.rankRowLocked}>
      <RankRail index={rankNumber} toneColor={toneColors.accent} />
      <View style={rankCardStyle}>
        <View style={styles.rankImageWrap}>
          <Image
            source={rank.image}
            style={styles.rankImage}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel={translate(rank.titleKey)}
          />
        </View>

        <View style={styles.rankCopy}>
          <View style={styles.rankTitleRow}>
            <Text variant="bodySmall" weight="bold" style={rankTitleStyle}>
              {`${rankNumber}. ${translate(rank.titleKey)}`}
            </Text>
          </View>

          <View style={styles.requirements}>
            {rank.requirements.map((requirement) => {
              const requirementLabel =
                requirement.kind === 'streak'
                  ? translate('achievementsScreen.requirements.streak', {
                      count: requirement.value,
                      unit: getDayUnit(translate, requirement.value),
                    })
                  : translate('achievementsScreen.requirements.goals', {
                      count: requirement.value,
                      unit: getGoalUnit(translate, requirement.value),
                    });

              return (
                <View
                  key={`${rank.key}-${requirement.kind}-${requirement.value}`}
                  style={styles.requirementRow}
                >
                  <Text variant="caption" weight="semibold" style={requirementToneStyle}>
                    {requirement.kind === 'streak' ? '🔥' : '🎯'}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {requirementLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <RankStatus
          unlocked={unlocked}
          label={
            unlocked
              ? translate('achievementsScreen.status.unlocked')
              : translate('achievementsScreen.status.locked')
          }
        />
      </View>
    </View>
  );
}

function SummaryMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  const valueStyle = { color: accent };

  return (
    <View style={styles.summaryMetric}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="body" weight="bold" style={valueStyle}>
        {value}
      </Text>
    </View>
  );
}

export default function AchievementsScreen() {
  const { t, i18n } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();
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

  const currentStreak = goalTracking?.currentStreak ?? 0;
  const completedGoals = goalTracking?.goalHistory.filter((goal) => goal.completed).length ?? 0;
  const visibleGoalCount = Math.min(completedGoals, 5);
  const footerCardStyle = { backgroundColor: theme.colors.background.surface };
  const footerDividerStyle = { backgroundColor: theme.colors.border.subtle };
  const currentStreakValueStyle = { color: theme.colors.brand.tertiary };
  const completedGoalsValueStyle = { color: theme.colors.brand.primary };
  const unlockedMap = useMemo(() => {
    const map = new Map<string, boolean>();

    for (const rank of RANKS) {
      map.set(rank.key, shouldUnlockRank(rank, currentStreak, completedGoals));
    }

    return map;
  }, [completedGoals, currentStreak]);

  return (
    <ScreenContainer
      scrollable
      padded={false}
      edges={['top', 'bottom']}
      tabBarAware
      style={styles.screen}
    >
      <View style={[styles.footerCard, footerCardStyle]}>
        <SummaryMetric
          label={translate('achievementsScreen.summary.currentStreak')}
          value={`${formatCount(currentStreak, i18n.language)} ${getDayUnit(translate, currentStreak)}`}
          accent={currentStreakValueStyle.color}
        />

        <View style={[styles.footerDivider, footerDividerStyle]} />

        <SummaryMetric
          label={translate('achievementsScreen.summary.completedGoals')}
          value={`${formatCount(visibleGoalCount, i18n.language)} / 5`}
          accent={completedGoalsValueStyle.color}
        />
      </View>

      <View style={styles.list}>
        {RANKS.map((rank, index) => {
          const unlocked = unlockedMap.get(rank.key) ?? false;

          return <RankCard key={rank.key} rank={rank} unlocked={unlocked} rankNumber={index + 1} />;
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flexGrow: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacing.p8,
    paddingBottom: theme.metrics.spacing.p24,
    gap: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.app,
  },
  list: {
    gap: theme.metrics.spacingV.p12,
  },
  rankRowUnlocked: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p12,
  },
  rankRowLocked: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p12,
    opacity: 0.78,
  },
  rail: {
    width: theme.metrics.spacing.p32,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: theme.metrics.spacingV.p4,
  },
  rankIndexCircle: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
  },
  railLine: {
    width: 2,
    flexGrow: 1,
    marginTop: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    opacity: 0.9,
  },
  rankCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
  },
  rankImageWrap: {
    width: theme.metrics.spacing.p72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankImage: {
    width: theme.metrics.spacing.p72,
    height: theme.metrics.spacing.p80,
  },
  rankCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  rankTitleRow: {
    gap: theme.metrics.spacingV.p4,
  },
  requirements: {
    gap: theme.metrics.spacingV.p4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  statusBadge: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
  },
  statusBadgeUnlocked: {
    backgroundColor: theme.colors.state.success,
  },
  statusBadgeLocked: {
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.strong,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  footerDivider: {
    width: 1,
    height: theme.metrics.spacing.p36,
    marginHorizontal: theme.metrics.spacing.p12,
  },
  summaryMetric: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
}));
