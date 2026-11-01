import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { ChatComposer } from '@/features/food-log/components';
import type { FoodEntry } from '@/features/food-log/types';
import { GoalSummaryCard } from '@/features/goals/components';
import { useIsPermanentDrawer, useOpenDrawer } from '@/features/navigation';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { DailyProgressCard } from './DailyProgressCard';
import { HomeHeader } from './HomeHeader';
import { MealsGrid } from './MealsGrid';
import { WeekStrip } from './WeekStrip';

export function HomeScreen() {
  const router = useRouter();
  const home = useHomeScreen();
  const openDrawer = useOpenDrawer();
  const isPermanentDrawer = useIsPermanentDrawer();
  const displayName = home.profile?.displayName.trim() || '';
  const openEntry = useCallback(
    (entry: FoodEntry) => router.push({ pathname: '/meal/[id]', params: { id: entry.id } }),
    [router]
  );

  if (home.isProfileMissing) {
    return <Redirect href="/welcome" />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          displayName={displayName}
          onBuddyPress={() => router.navigate('/buddy')}
          onMenuPress={isPermanentDrawer ? undefined : openDrawer}
        />
        <WeekStrip
          selectedDate={home.selectedDate}
          today={home.today}
          dayStatuses={home.dayStatuses}
          streak={home.streak}
          onSelect={home.setSelectedDate}
        />
        <DailyProgressCard summary={home.summary} profile={home.profile} />
        <GoalSummaryCard />
        <MealsGrid entries={home.entries} onEntryPress={openEntry} />
      </ScrollView>
      <View style={styles.composer}>
        <ChatComposer
          value=""
          onPressField={() => router.push('/chat')}
          onMicPress={() => router.push({ pathname: '/chat', params: { voice: '1' } })}
        />
      </View>
      {/* The header scrolls with the content; keep it from showing through the status bar. */}
      <View style={styles.statusBarCover} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p24,
    gap: theme.metrics.spacingV.p20,
  },
  composer: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: Math.max(rt.insets.bottom, theme.metrics.spacingV.p12),
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rt.insets.top,
    backgroundColor: theme.colors.background.app,
  },
}));
