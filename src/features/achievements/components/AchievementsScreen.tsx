import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Loading, Text } from '@/common/components';
import { BuddyLevelCard, BuddyMascot, useBuddyProgress } from '@/features/buddy';
import { useBottomPadding } from '@/hooks';
import { hs } from '@/theme/metrics';
import { getAchievementProgress } from '../services/activityStatsService';
import { AchievementGrid } from './AchievementGrid';
import { StreakCalendar } from './StreakCalendar';

export function AchievementsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const { stats, progress } = useBuddyProgress();

  if (!stats || !progress) {
    return <Loading />;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text variant="h1" weight="bold">
          {t('achievements.title')}
        </Text>
        <Text variant="bodySmall" color="secondary">
          {t('achievements.subtitle')}
        </Text>
      </View>
      <BuddyLevelCard
        progress={progress}
        streak={stats.currentStreak}
        onPress={() => router.push('/buddy')}
      />
      <StreakCalendar stats={stats} />
      <AchievementGrid items={getAchievementProgress(stats)} />
      <View style={styles.cta}>
        <BuddyMascot level={progress.current.level} size={hs(56)} />
        <View style={styles.flex}>
          <Text variant="bodySmall" weight="bold">
            {t('achievements.ctaTitle')}
          </Text>
          <Text variant="caption" color="secondary">
            {t('achievements.ctaSubtitle')}
          </Text>
        </View>
        <Button
          title={t('achievements.ctaAction')}
          size="sm"
          onPress={() => router.push('/buddy')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p16,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.section,
  },
  flex: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
}));
