import { Redirect, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { ChatComposer } from '@/features/food-log/components';
import { useAttachFoodPhoto } from '@/features/food-log/hooks/useAttachFoodPhoto';
import type { MealSlotGroup } from '@/features/food-log/utils/mealSlot';
import { GoalSummaryCard } from '@/features/goals/components/GoalSummaryCard';
import { useOpenDrawer } from '@/features/navigation';
import { formatDateKey } from '@/utils/date';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { DailyProgressCard } from './DailyProgressCard';
import { HomeHeader } from './HomeHeader';
import { MealsGrid } from './MealsGrid';
import { WeekStrip } from './WeekStrip';

export function HomeScreen() {
  const router = useRouter();
  const home = useHomeScreen();
  const attachPhoto = useAttachFoodPhoto();
  const openDrawer = useOpenDrawer();
  const displayName = home.profile?.displayName.trim() || '';

  const openChat = (imageUri?: string) => {
    router.push({ pathname: '/chat', params: imageUri ? { imageUri } : {} });
  };

  const handleAttach = async () => {
    const imageUri = await attachPhoto();
    if (imageUri) {
      openChat(imageUri);
    }
  };

  const handleGroupPress = (group: MealSlotGroup) => {
    if (group.entries.length === 1) {
      router.push({ pathname: '/meal/[id]', params: { id: group.entries[0].id } });
      return;
    }

    router.push({
      pathname: '/meal-slot',
      params: { date: formatDateKey(home.selectedDate), slot: group.slot },
    });
  };

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
          streak={home.streak}
          onStreakPress={() => router.navigate('/buddy')}
          onMenuPress={openDrawer}
        />
        <WeekStrip
          selectedDate={home.selectedDate}
          today={home.today}
          dayStatuses={home.dayStatuses}
          onSelect={home.setSelectedDate}
        />
        <DailyProgressCard summary={home.summary} profile={home.profile} />
        <GoalSummaryCard profile={home.profile} />
        <MealsGrid groups={home.mealGroups} onGroupPress={handleGroupPress} />
      </ScrollView>
      <View style={styles.composer}>
        <ChatComposer
          value=""
          onPressField={() => openChat()}
          onAttachPress={() => {
            void handleAttach();
          }}
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
