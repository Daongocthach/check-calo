import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Dialog, Icon, Input, Loading, ProgressBar, ScreenHeader, Text } from '@/common/components';
import { AchievementGrid, getAchievementProgress, StreakCalendar } from '@/features/achievements';
import { DrawerMenuButton } from '@/features/navigation';
import { useBottomPadding } from '@/hooks';
import { hs } from '@/theme/metrics';
import { BUDDY_POINTS } from '../constants/levels';
import { BUDDY_NAME_MAX_LENGTH, useBuddyName } from '../hooks/useBuddyName';
import { useBuddyProgress } from '../hooks/useBuddyProgress';
import { BuddyJourney } from './BuddyJourney';
import { BuddyMascot } from './BuddyMascot';

export function BuddyScreen() {
  const { t } = useTranslation();
  const bottomPadding = useBottomPadding();
  const { stats, progress } = useBuddyProgress();
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

  const saveName = () => {
    setName(draftName);
    setIsRenaming(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('buddy.title')}
        subtitle={t('buddy.subtitle', { name })}
        showBack={false}
        right={<DrawerMenuButton />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <BuddyMascot level={progress.current.level} size={hs(170)} animated />
          <Pressable
            onPress={startRename}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.renameLabel', { name })}
            hitSlop={8}
            style={styles.nameRow}
          >
            <Text variant="h2" weight="bold" numberOfLines={1}>
              {name}
            </Text>
            <Icon name="pencil" variant="brand" size={18} />
          </Pressable>
          <Text variant="body" weight="semibold" color="secondary" align="center">
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
        </View>

        <StreakCalendar stats={stats} />
        <AchievementGrid items={getAchievementProgress(stats)} />

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

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p16,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  hero: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    maxWidth: '100%',
  },
  progressWrap: {
    alignSelf: 'stretch',
    gap: theme.metrics.spacingV.p8,
  },
  flex: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  ruleIcon: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  pointsPill: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.focus,
    backgroundColor: theme.colors.background.surface,
  },
}));
