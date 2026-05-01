import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Avatar,
  Card,
  EmptyState,
  Icon,
  Loading,
  ScreenContainer,
  Text,
} from '@/common/components';
import {
  fetchLeaderboardProfiles,
  type LeaderboardProfile,
} from '@/features/leaderboard/services/leaderboardService';
import { syncGoalTracking } from '@/features/nutrition/services/goalTrackingService';
import CrownImage from '../../assets/crown.png';

type RankTone = 'gold' | 'silver' | 'bronze' | 'blue' | 'green' | 'neutral';
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

interface LeaderboardEntry {
  rank: number;
  displayName?: string;
  streaks: number;
  avatarInitials?: string;
  tone: RankTone;
}

function formatRank(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function getTonePalette(theme: ReturnType<typeof useUnistyles>['theme'], tone: RankTone) {
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
        borderColor: theme.colors.border.strong,
        color: theme.colors.text.secondary,
      };
    case 'bronze':
      return {
        backgroundColor: theme.colors.state.warningBg,
        borderColor: theme.colors.brand.tertiary,
        color: theme.colors.brand.tertiary,
      };
    case 'blue':
      return {
        backgroundColor: theme.colors.state.infoBg,
        borderColor: theme.colors.state.info,
        color: theme.colors.state.info,
      };
    case 'green':
      return {
        backgroundColor: theme.colors.state.successBg,
        borderColor: theme.colors.state.success,
        color: theme.colors.state.success,
      };
    case 'neutral':
    default:
      return {
        backgroundColor: theme.colors.background.section,
        borderColor: theme.colors.border.default,
        color: theme.colors.text.primary,
      };
  }
}

function getInitials(entry: LeaderboardEntry) {
  if (entry.avatarInitials) {
    return entry.avatarInitials;
  }

  if (entry.displayName) {
    return entry.displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  return 'AN';
}

function getInitialsFromName(displayName: string) {
  return displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayName(entry: LeaderboardEntry, t: TranslateFn) {
  return entry.displayName ?? t('leaderboardScreen.anonymousName');
}

function getStreakLabel(entry: LeaderboardEntry, locale: string) {
  return `🔥 ${formatRank(entry.streaks, locale)}`;
}

function getToneForRank(rank: number): RankTone {
  if (rank === 1) {
    return 'gold';
  }

  if (rank === 2) {
    return 'blue';
  }

  if (rank === 3) {
    return 'bronze';
  }

  return 'neutral';
}

function fromRemoteProfile(profile: LeaderboardProfile, rank: number): LeaderboardEntry {
  const displayName = profile.displayName.trim();

  return {
    rank,
    displayName: displayName.length > 0 ? displayName : undefined,
    streaks: profile.currentStreak,
    avatarInitials: displayName.length > 0 ? getInitialsFromName(displayName) : undefined,
    tone: getToneForRank(rank),
  };
}

function TopPodiumCard({
  entry,
  locale,
  isCenter,
  t,
}: {
  entry?: LeaderboardEntry;
  locale: string;
  isCenter?: boolean;
  t: TranslateFn;
}) {
  const { theme } = useUnistyles();
  const palette = entry ? getTonePalette(theme, entry.tone) : null;
  const rankLabel = entry ? `No.${formatRank(entry.rank, locale)}` : 'No.--';
  const streakLabel = entry ? getStreakLabel(entry, locale) : '';
  const isTopOne = entry?.rank === 1;

  return (
    <Card
      variant="filled"
      style={[styles.podiumCard, isCenter ? styles.podiumCardCenter : styles.podiumCardSide]}
    >
      {entry && palette ? (
        <>
          <View
            style={[
              styles.podiumBadge,
              { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
            ]}
          >
            <Text variant="bodySmall" weight="bold" style={{ color: palette.color }}>
              {rankLabel}
            </Text>
          </View>

          <View style={styles.podiumAvatarWrap}>
            {isTopOne ? (
              <Image source={CrownImage} style={styles.podiumCrown} contentFit="contain" />
            ) : null}
            {entry ? (
              <Avatar
                initials={getInitials(entry)}
                size={isCenter ? 'xl' : 'lg'}
                accessibilityLabel={getDisplayName(entry, t)}
              />
            ) : (
              <Avatar
                icon={
                  <Icon name="remove-circle-outline" variant="muted" size={isCenter ? 28 : 24} />
                }
                size={isCenter ? 'xl' : 'lg'}
                accessibilityLabel={t('leaderboardScreen.emptyPodiumTitle')}
              />
            )}
          </View>

          <Text
            variant={isCenter ? 'body' : 'bodySmall'}
            weight="bold"
            align="center"
            numberOfLines={1}
          >
            {getDisplayName(entry, t)}
          </Text>

          <View style={[styles.streakPill, { backgroundColor: palette.backgroundColor }]}>
            <Text variant="bodySmall" weight="bold" style={{ color: palette.color }}>
              {streakLabel}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.podiumBadge}>
            <Text variant="bodySmall" weight="bold" color="secondary">
              {rankLabel}
            </Text>
          </View>

          <View style={styles.podiumAvatarWrap}>
            <Avatar
              icon={<Icon name="remove-circle-outline" variant="muted" size={isCenter ? 28 : 24} />}
              size={isCenter ? 'xl' : 'lg'}
              accessibilityLabel={t('leaderboardScreen.emptyPodiumTitle')}
            />
          </View>

          <Text
            variant={isCenter ? 'body' : 'bodySmall'}
            weight="bold"
            align="center"
            numberOfLines={1}
            color="secondary"
          >
            {t('leaderboardScreen.emptyPodiumTitle')}
          </Text>
        </>
      )}
    </Card>
  );
}

function RankingRow({
  entry,
  locale,
  t,
}: {
  entry: LeaderboardEntry;
  locale: string;
  t: TranslateFn;
}) {
  const { theme } = useUnistyles();
  const streakLabel = getStreakLabel(entry, locale);
  const streakColor = theme.colors.brand.tertiary;
  const streakTextStyle = { color: streakColor };

  return (
    <View style={styles.listRow}>
      <Text variant="body" weight="bold" style={styles.rankNumber}>
        {formatRank(entry.rank, locale)}
      </Text>

      <Avatar
        initials={getInitials(entry)}
        size="sm"
        accessibilityLabel={getDisplayName(entry, t)}
      />

      <View style={styles.rowCopy}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.rowName}>
          {getDisplayName(entry, t)}
        </Text>
      </View>

      <View style={styles.rowScore}>
        <Text variant="bodySmall" weight="bold" style={streakTextStyle}>
          {streakLabel}
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
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadLeaderboard = async () => {
      setIsLoading(true);

      try {
        await syncGoalTracking();
        const remoteProfiles = await fetchLeaderboardProfiles(10);

        if (!active) {
          return;
        }

        const nextEntries = remoteProfiles
          .map((profile, index) => fromRemoteProfile(profile, index + 1))
          .sort((left, right) => {
            if (right.streaks !== left.streaks) {
              return right.streaks - left.streaks;
            }

            return left.rank - right.rank;
          })
          .map((entry, index) => ({
            ...entry,
            rank: index + 1,
            tone: getToneForRank(index + 1),
          }));

        setEntries(nextEntries);
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to load leaderboard profiles', error);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadLeaderboard();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <ScreenContainer scrollable padded={false} edges={[]}>
        <LinearGradient
          colors={[theme.colors.background.app, theme.colors.background.section]}
          style={styles.shell}
        >
          <Loading fullScreen message={translate('common.loading')} />
        </LinearGradient>
      </ScreenContainer>
    );
  }

  if (entries.length === 0) {
    return (
      <ScreenContainer scrollable padded={false} edges={[]}>
        <LinearGradient
          colors={[theme.colors.background.app, theme.colors.background.section]}
          style={styles.shell}
        >
          <View style={styles.decorTopLeft} />
          <View style={styles.decorTopRight} />

          <View style={styles.page}>
            <Card variant="elevated" style={styles.podiumPanel}>
              <EmptyState
                title={translate('leaderboardScreen.emptyStateTitle')}
                message={translate('leaderboardScreen.emptyStateMessage')}
              />
            </Card>
          </View>
        </LinearGradient>
      </ScreenContainer>
    );
  }

  const sortedEntries = [...entries].sort((left, right) => {
    if (right.streaks !== left.streaks) {
      return right.streaks - left.streaks;
    }

    return left.rank - right.rank;
  });
  const podiumEntries = sortedEntries.slice(0, 3);
  const listEntries = sortedEntries.slice(3);

  return (
    <ScreenContainer scrollable padded={false} edges={[]}>
      <LinearGradient
        colors={[theme.colors.background.app, theme.colors.background.section]}
        style={styles.shell}
      >
        <View style={styles.decorTopLeft} />
        <View style={styles.decorTopRight} />

        <View style={styles.page}>
          <Card variant="elevated" style={styles.podiumPanel}>
            <View style={styles.podiumRow}>
              <View style={styles.podiumSideColumn}>
                <TopPodiumCard entry={podiumEntries[1]} locale={locale} t={translate} />
              </View>
              <View style={styles.podiumCenterColumn}>
                <TopPodiumCard entry={podiumEntries[0]} locale={locale} t={translate} isCenter />
              </View>
              <View style={styles.podiumSideColumn}>
                <TopPodiumCard entry={podiumEntries[2]} locale={locale} t={translate} />
              </View>
            </View>
          </Card>

          <Card variant="elevated" style={styles.listPanel}>
            <View style={styles.listHeader}>
              <Text variant="bodySmall" weight="bold" color="secondary">
                {translate('leaderboardScreen.listTitle')}
              </Text>
            </View>

            {listEntries.length > 0 ? (
              <View style={styles.listBody}>
                {listEntries.map((entry, index) => {
                  const isLast = index === listEntries.length - 1;

                  return (
                    <View key={`${entry.rank}-${getDisplayName(entry, translate)}`}>
                      <RankingRow entry={entry} locale={locale} t={translate} />
                      {!isLast ? <View style={styles.rowDivider} /> : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.listEmptyState}>
                <EmptyState
                  title={translate('leaderboardScreen.emptyStateTitle')}
                  message={translate('leaderboardScreen.emptyStateMessage')}
                />
              </View>
            )}
          </Card>
        </View>
      </LinearGradient>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  shell: {
    flexGrow: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacing.p24,
  },
  page: {
    gap: theme.metrics.spacingV.p16,
    paddingTop: theme.metrics.spacingV.p12,
  },
  podiumPanel: {
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    overflow: 'hidden',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p8,
  },
  podiumSideColumn: {
    flex: 1,
  },
  podiumCenterColumn: {
    flex: 1.1,
  },
  podiumCard: {
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 208,
  },
  podiumCardCenter: {
    minHeight: 244,
    paddingTop: theme.metrics.spacing.p16,
    transform: [{ translateY: -10 }],
  },
  podiumCardSide: {
    minHeight: 200,
    paddingTop: theme.metrics.spacing.p12,
  },
  podiumAvatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumCrown: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    marginBottom: -theme.metrics.spacing.p4,
    zIndex: 1,
  },
  podiumBadge: {
    minWidth: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p32,
    paddingHorizontal: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPill: {
    borderRadius: theme.metrics.borderRadius.full,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
  },
  listPanel: {
    paddingVertical: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.xl,
    overflow: 'hidden',
  },
  listHeader: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacing.p8,
    paddingBottom: theme.metrics.spacing.p4,
  },
  listBody: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacing.p8,
  },
  listEmptyState: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacing.p8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacing.p12,
  },
  rankNumber: {
    width: theme.metrics.spacing.p24,
    textAlign: 'center',
    color: theme.colors.text.secondary,
  },
  rowCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  rowName: {
    flex: 1,
    color: theme.colors.text.primary,
  },
  rowScore: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: theme.metrics.spacing.p72,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.border.default,
  },
  decorTopLeft: {
    position: 'absolute',
    top: theme.metrics.spacing.p12,
    left: -theme.metrics.spacing.p16,
    width: theme.metrics.spacing.p72,
    height: theme.metrics.spacing.p72,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.state.infoBg,
    opacity: 0.55,
  },
  decorTopRight: {
    position: 'absolute',
    top: theme.metrics.spacing.p24,
    right: -theme.metrics.spacing.p8,
    width: theme.metrics.spacing.p56,
    height: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.state.warningBg,
    opacity: 0.5,
  },
}));
