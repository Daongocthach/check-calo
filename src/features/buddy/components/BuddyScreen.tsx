import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Dialog, Icon, Input, Loading, ProgressBar, ScreenHeader, Text } from '@/common/components';
import { StreakCalendar } from '@/features/achievements';
import { DrawerMenuButton } from '@/features/navigation';
import { useBottomPadding } from '@/hooks';
import { hs } from '@/theme/metrics';
import { BUDDY_POINTS } from '../constants/levels';
import { EMPTY_AXIS_SCORES } from '../constants/stats';
import { BUDDY_NAME_MAX_LENGTH, useBuddyName } from '../hooks/useBuddyName';
import { useBuddyProgress } from '../hooks/useBuddyProgress';
import { useBuddyStats } from '../hooks/useBuddyStats';
import type { BuddyAxis } from '../types';
import { BuddyJourney } from './BuddyJourney';
import { BuddyMascot } from './BuddyMascot';
import { styles } from './BuddyScreen.styles';
import { BuddyStatsHexagon, getHexagonCenterSize } from './BuddyStatsHexagon';
import { BuddyStatsInsight } from './BuddyStatsInsight';

const MAX_CHART_SIZE = hs(560);

export function BuddyScreen() {
  const { t } = useTranslation();
  const bottomPadding = useBottomPadding();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { stats, progress } = useBuddyProgress();
  const { data: buddyStats } = useBuddyStats();
  const { name, setName } = useBuddyName();
  // Kept apart from the draft: an IME can send a late onChangeText after Save, which must not
  // reopen the dialog.
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  if (!stats || !progress) {
    return <Loading />;
  }

  const rules = [
    {
      key: 'streak' as const,
      icon: 'flame' as const,
      points: BUDDY_POINTS.streakWeek,
      earned: progress.breakdown.streakBonus,
    },
    {
      key: 'onTarget' as const,
      icon: 'locate' as const,
      points: BUDDY_POINTS.onTargetDay,
      earned: progress.breakdown.onTargetDays,
    },
    {
      key: 'balanced' as const,
      icon: 'nutrition' as const,
      points: BUDDY_POINTS.balancedDay,
      earned: progress.breakdown.balancedDays,
    },
    {
      key: 'logged' as const,
      icon: 'create' as const,
      points: BUDDY_POINTS.loggedDay,
      earned: progress.breakdown.loggedDays,
    },
  ];

  const startRename = () => {
    setDraftName(name);
    setIsRenaming(true);
  };

  // Let the chart span the mobile viewport while keeping labels clear of its edges.
  const chartSize = Math.min(MAX_CHART_SIZE, width - hs(16));

  const openAxis = (axis: BuddyAxis) =>
    router.push({ pathname: '/buddy-stat/[axis]', params: { axis } });

  const saveName = () => {
    setName(draftName);
    setIsRenaming(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('buddy.title')}
        subtitle={t('buddy.subtitle', { name })}
        right={<DrawerMenuButton />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <BuddyStatsHexagon
            size={chartSize}
            overall={buddyStats?.overall ?? EMPTY_AXIS_SCORES}
            recent={buddyStats?.recent ?? EMPTY_AXIS_SCORES}
            onSelectAxis={openAxis}
          >
            <BuddyMascot
              level={progress.current.level}
              size={getHexagonCenterSize(chartSize)}
              animated
            />
          </BuddyStatsHexagon>
          <Pressable
            onPress={startRename}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.renameLabel', { name })}
            hitSlop={8}
            style={styles.nameRow}
          >
            <Text variant="h1" weight="bold" numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.editBadge}>
              <Icon name="create-outline" variant="brand" size={16} />
            </View>
          </Pressable>
          <Text variant="h3" weight="semibold" color="secondary" align="center">
            {t('buddy.levelTitle', {
              level: progress.current.level,
              stage: t(`buddy.stages.${progress.current.stage}`),
            })}
          </Text>
          <View style={styles.progressWrap}>
            <ProgressBar value={progress.progressPercent} size="lg" />
            <Text variant="bodySmall" color="link" weight="semibold" align="center">
              {progress.next
                ? t('buddy.progressToNext', {
                    percent: progress.progressPercent,
                    points: progress.next.minPoints - progress.points,
                  })
                : t('buddy.maxLevel')}
            </Text>
          </View>
          {buddyStats ? (
            <BuddyStatsInsight
              stats={buddyStats}
              name={name}
              goalMode={buddyStats.days.at(-1)?.summary.goalMode ?? 'maintain'}
            />
          ) : null}
        </View>

        <StreakCalendar stats={stats} />

        <View style={styles.card}>
          <Text variant="body" weight="bold">
            {t('buddy.journey', { name })}
          </Text>
          <BuddyJourney currentLevel={progress.current.level} />
        </View>

        <View style={styles.card}>
          <Text variant="body" weight="bold">
            {t('buddy.howToEarn')}
          </Text>
          {rules.map((rule) => (
            <View key={rule.key} style={styles.rule}>
              <View style={styles.ruleIcon}>
                <Icon name={rule.icon} variant="brand" size={18} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodySmall" weight="semibold">
                  {t(`buddy.rules.${rule.key}.title`)}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('buddy.earnedSoFar', { points: rule.earned })}
                </Text>
              </View>
              <View style={styles.pointsPill}>
                <Text variant="caption" weight="bold" color="link">
                  {`+${rule.points}`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {progress.next ? (
          <View style={styles.reward}>
            <Icon name="gift-outline" variant="brand" size={22} />
            <View style={styles.flex}>
              <Text variant="bodySmall" weight="bold" color="link">
                {t('buddy.nextReward')}
              </Text>
              <Text variant="caption" color="secondary">
                {t('buddy.nextRewardHint', {
                  stage: t(`buddy.stages.${progress.next.stage}`),
                  points: progress.next.minPoints,
                  name,
                })}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Dialog
        visible={isRenaming}
        onDismiss={() => setIsRenaming(false)}
        title={t('buddy.rename')}
        size="sm"
        keyboardAware
        actions={[
          { label: t('common.cancel'), onPress: () => setIsRenaming(false), variant: 'ghost' },
          {
            label: t('common.save'),
            onPress: saveName,
            variant: 'primary',
          },
        ]}
      >
        <Input
          value={draftName}
          onChangeText={setDraftName}
          placeholder={t('buddy.namePlaceholder')}
          maxLength={BUDDY_NAME_MAX_LENGTH}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={saveName}
        />
      </Dialog>
    </View>
  );
}
