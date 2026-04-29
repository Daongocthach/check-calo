import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, Chip, Icon, ProgressBar, ScreenContainer, Text } from '@/common/components';
import type { IconProps } from '@/common/components/Icon';

type RankTone = 'gold' | 'silver' | 'bronze' | 'teal' | 'mint' | 'violet' | 'neutral';
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

interface LeaderboardEntry {
  rank: number;
  name: string;
  maskedName: string;
  score: number;
  subtitleKey: string;
  icon: IconProps['name'];
  tone: RankTone;
}

const TOP_THREE: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Vuong',
    maskedName: 'VU*****G',
    score: 6507,
    subtitleKey: 'leaderboardScreen.ranking.top1',
    icon: 'medal-outline',
    tone: 'gold',
  },
  {
    rank: 2,
    name: 'Tuan',
    maskedName: 'TU*****N',
    score: 4708,
    subtitleKey: 'leaderboardScreen.ranking.top2',
    icon: 'medal-outline',
    tone: 'silver',
  },
  {
    rank: 3,
    name: 'Khanh',
    maskedName: 'KH*****M',
    score: 4232,
    subtitleKey: 'leaderboardScreen.ranking.top3',
    icon: 'medal-outline',
    tone: 'bronze',
  },
];

const TOP_FOUR_TO_TEN: LeaderboardEntry[] = [
  {
    rank: 4,
    name: 'Khanh E',
    maskedName: 'KH*****E',
    score: 3875,
    subtitleKey: 'leaderboardScreen.ranking.rank',
    icon: 'leaf-outline',
    tone: 'teal',
  },
  {
    rank: 5,
    name: 'Phuong P',
    maskedName: 'PH*****P',
    score: 3806,
    subtitleKey: 'leaderboardScreen.ranking.rank',
    icon: 'fitness-outline',
    tone: 'mint',
  },
  {
    rank: 6,
    name: 'P*****L',
    maskedName: 'P*****L',
    score: 3621,
    subtitleKey: 'leaderboardScreen.ranking.rank',
    icon: 'restaurant-outline',
    tone: 'violet',
  },
  {
    rank: 7,
    name: 'Le*****P',
    maskedName: 'LÊ*****P',
    score: 3092,
    subtitleKey: 'leaderboardScreen.ranking.rank',
    icon: 'flame-outline',
    tone: 'teal',
  },
  {
    rank: 8,
    name: 'Ti*****8',
    maskedName: 'TI*****8',
    score: 3022,
    subtitleKey: 'leaderboardScreen.ranking.rank',
    icon: 'barbell-outline',
    tone: 'mint',
  },
  {
    rank: 9,
    name: 'Hu*****G',
    maskedName: 'HU*****G',
    score: 2940,
    subtitleKey: 'leaderboardScreen.ranking.rank',
    icon: 'nutrition-outline',
    tone: 'neutral',
  },
  {
    rank: 10,
    name: '*****Y',
    maskedName: '*****Y',
    score: 2919,
    subtitleKey: 'leaderboardScreen.ranking.rank',
    icon: 'walk-outline',
    tone: 'violet',
  },
];

function formatScore(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function getToneStyle(theme: ReturnType<typeof useUnistyles>['theme'], tone: RankTone) {
  switch (tone) {
    case 'gold':
      return {
        backgroundColor: theme.colors.state.warningBg,
        borderColor: theme.colors.state.warning,
        color: theme.colors.state.warning,
      };
    case 'silver':
      return {
        backgroundColor: theme.colors.background.section,
        borderColor: theme.colors.border.default,
        color: theme.colors.text.secondary,
      };
    case 'bronze':
      return {
        backgroundColor: theme.colors.state.warningBg,
        borderColor: theme.colors.brand.tertiary,
        color: theme.colors.brand.tertiary,
      };
    case 'teal':
      return {
        backgroundColor: theme.colors.state.infoBg,
        borderColor: theme.colors.state.info,
        color: theme.colors.state.info,
      };
    case 'mint':
      return {
        backgroundColor: theme.colors.state.successBg,
        borderColor: theme.colors.state.success,
        color: theme.colors.state.success,
      };
    case 'violet':
      return {
        backgroundColor: theme.colors.background.section,
        borderColor: theme.colors.brand.primaryVariant,
        color: theme.colors.brand.primaryVariant,
      };
    case 'neutral':
      return {
        backgroundColor: theme.colors.background.section,
        borderColor: theme.colors.border.default,
        color: theme.colors.text.primary,
      };
  }
}

function LeaderboardBadge({
  rank,
  title,
  score,
  subtitle,
  icon,
  tone,
}: {
  rank: number;
  title: string;
  score: string;
  subtitle: string;
  icon: IconProps['name'];
  tone: RankTone;
}) {
  const { t } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();
  const toneStyle = getToneStyle(theme, tone);
  let rankLabel = 'TOP 3';

  if (rank === 1) {
    rankLabel = 'TOP 1';
  } else if (rank === 2) {
    rankLabel = 'TOP 2';
  }

  return (
    <Card variant="elevated" style={[styles.podiumCard, { borderColor: toneStyle.borderColor }]}>
      <View style={[styles.podiumRankPill, { borderColor: toneStyle.borderColor }]}>
        <Text variant="caption" weight="bold" style={{ color: toneStyle.color }}>
          {rankLabel}
        </Text>
      </View>
      <View style={[styles.podiumAvatar, { backgroundColor: toneStyle.backgroundColor }]}>
        <Icon name={icon} size={28} color={toneStyle.color} />
      </View>
      <Text variant="bodySmall" weight="bold" align="center" numberOfLines={1}>
        {title}
      </Text>
      <Text variant="bodySmall" color="secondary" align="center" numberOfLines={1}>
        {score}
      </Text>
      <Text variant="caption" color="secondary" align="center" numberOfLines={2}>
        {translate(subtitle)}
      </Text>
    </Card>
  );
}

function LeaderboardRow({ entry, locale }: { entry: LeaderboardEntry; locale: string }) {
  const { theme } = useUnistyles();
  const toneStyle = getToneStyle(theme, entry.tone);
  const { t } = useTranslation();
  const translate = t as unknown as TranslateFn;

  return (
    <View style={styles.listRow}>
      <View style={styles.listRankWrap}>
        <Text variant="body" weight="bold" style={{ color: toneStyle.color }}>
          {formatScore(entry.rank, locale)}
        </Text>
      </View>
      <View style={[styles.listIconWrap, { backgroundColor: toneStyle.backgroundColor }]}>
        <Icon name={entry.icon} size={20} color={toneStyle.color} />
      </View>
      <View style={styles.listCopy}>
        <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
          {entry.maskedName}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {translate('leaderboardScreen.scoreSuffix', {
            value: formatScore(entry.score, locale),
          })}
        </Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { t, i18n } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();
  const locale = i18n.language;
  const currentMonth = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date());
  const monthTitle = translate('leaderboardScreen.monthTitle', { month: currentMonth });
  const myRank = 7;
  const myScore = 3092;
  const myCategory = translate('leaderboardScreen.myCategory');
  const monthProgress = 74;
  const podiumOrder = [TOP_THREE[1], TOP_THREE[0], TOP_THREE[2]];
  const scoreSuffix = (value: number) =>
    translate('leaderboardScreen.scoreSuffix', {
      value: formatScore(value, locale),
    });

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <Text variant="body" weight="bold" align="center" style={styles.title}>
            {translate('leaderboardScreen.title')}
          </Text>
          <Text variant="body" weight="bold" align="center" style={styles.subtitle}>
            {translate('leaderboardScreen.subtitle')}
          </Text>
          <Chip label={monthTitle} variant="solid" color={theme.colors.state.warning} />
        </View>

        <Card variant="elevated" style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <Text variant="bodySmall" weight="bold">
              {translate('leaderboardScreen.featureTitle')}
            </Text>
            <Text variant="caption" color="secondary">
              {translate('leaderboardScreen.featureSubtitle')}
            </Text>
          </View>
          <View style={styles.podiumRow}>
            {podiumOrder.map((entry) => (
              <LeaderboardBadge
                key={entry.rank}
                rank={entry.rank}
                title={entry.maskedName}
                score={scoreSuffix(entry.score)}
                subtitle={entry.subtitleKey}
                icon={entry.icon}
                tone={entry.tone}
              />
            ))}
          </View>
        </Card>

        <Card variant="filled" style={styles.rankingCard}>
          <View style={styles.sectionHeader}>
            <Text variant="body" weight="bold">
              {translate('leaderboardScreen.rankingTitle')}
            </Text>
            <Text variant="caption" color="secondary">
              {translate('leaderboardScreen.rankingSubtitle')}
            </Text>
          </View>

          <View style={styles.rankGrid}>
            <View style={styles.rankGridCol}>
              {TOP_FOUR_TO_TEN.slice(0, 3).map((entry) => (
                <LeaderboardRow key={entry.rank} entry={entry} locale={locale} />
              ))}
            </View>
            <View style={styles.rankGridCol}>
              {TOP_FOUR_TO_TEN.slice(3).map((entry) => (
                <LeaderboardRow key={entry.rank} entry={entry} locale={locale} />
              ))}
            </View>
          </View>
        </Card>

        <View style={styles.categoryList}>
          <Card variant="elevated" style={[styles.categoryCard, styles.categoryBlue]}>
            <View style={styles.categoryTopRow}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.colors.state.infoBg }]}>
                <Icon name="car-outline" size={22} color={theme.colors.state.info} />
              </View>
              <Text variant="body" weight="bold" color="primary">
                {translate('leaderboardScreen.categories.car')}
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary">
              {translate('leaderboardScreen.categories.carSubtitle')}
            </Text>
          </Card>

          <Card variant="elevated" style={[styles.categoryCard, styles.categoryGreen]}>
            <View style={styles.categoryTopRow}>
              <View
                style={[styles.categoryIcon, { backgroundColor: theme.colors.state.successBg }]}
              >
                <Icon name="bicycle-outline" size={22} color={theme.colors.state.success} />
              </View>
              <Text variant="body" weight="bold" color="primary">
                {translate('leaderboardScreen.categories.bike')}
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary">
              {translate('leaderboardScreen.categories.bikeSubtitle')}
            </Text>
          </Card>
        </View>

        <Card variant="elevated" style={styles.myCard}>
          <View style={styles.sectionHeader}>
            <Text variant="body" weight="bold">
              {translate('leaderboardScreen.myTitle')}
            </Text>
            <Text variant="caption" color="secondary">
              {translate('leaderboardScreen.mySubtitle')}
            </Text>
          </View>

          <View style={styles.myStatsGrid}>
            <Card variant="filled" style={styles.myStat}>
              <Text variant="caption" color="secondary">
                {myCategory}
              </Text>
              <Text variant="body" weight="bold" style={styles.myStatValue}>
                {formatScore(myScore, locale)}
              </Text>
              <Text variant="caption" color="secondary">
                {translate('leaderboardScreen.myRankLabel', { rank: myRank })}
              </Text>
            </Card>
            <Card variant="filled" style={styles.myStat}>
              <Text variant="caption" color="secondary">
                {translate('leaderboardScreen.myProgressLabel')}
              </Text>
              <Text variant="body" weight="bold" style={styles.myStatValue}>
                {formatScore(monthProgress, locale)}%
              </Text>
              <ProgressBar value={monthProgress} size="sm" colorScheme="success" />
            </Card>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  header: {
    gap: theme.metrics.spacingV.p8,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.brand.primaryVariant,
  },
  subtitle: {
    color: theme.colors.brand.primary,
  },
  featureCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
  },
  featureHeader: {
    gap: theme.metrics.spacingV.p4,
    alignItems: 'center',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
    paddingVertical: theme.metrics.spacingV.p12,
    borderWidth: 1,
    borderRadius: theme.metrics.borderRadius.xl,
  },
  podiumRankPill: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1,
    backgroundColor: theme.colors.background.surface,
  },
  podiumAvatar: {
    width: theme.metrics.spacing.p68,
    height: theme.metrics.spacing.p68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1,
  },
  rankingCard: {
    gap: theme.metrics.spacingV.p12,
  },
  sectionHeader: {
    gap: theme.metrics.spacingV.p4,
  },
  rankGrid: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  rankGridCol: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
  },
  listRankWrap: {
    width: theme.metrics.spacing.p28,
    alignItems: 'center',
  },
  listIconWrap: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
  },
  listCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  categoryList: {
    gap: theme.metrics.spacingV.p12,
  },
  categoryCard: {
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p16,
  },
  categoryBlue: {
    backgroundColor: theme.colors.state.infoBg,
  },
  categoryGreen: {
    backgroundColor: theme.colors.state.successBg,
  },
  categoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  categoryIcon: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
  },
  myCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
  },
  myStatsGrid: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  myStat: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p12,
  },
  myStatValue: {
    color: theme.colors.brand.primary,
  },
}));
