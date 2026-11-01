import { listHistoricalWeightGoals } from '@/features/goals/services/goalTrackingRepository';
import { getQuestSwitchTime } from './buddyPointsService';
import { listQuestCompletions } from './questCompletionRepository';

/** Saved state the quests are judged against: completions, reached goals, the switch time. */
export async function getQuestState() {
  const [completions, goals, switchedAt] = await Promise.all([
    listQuestCompletions(),
    listHistoricalWeightGoals(),
    getQuestSwitchTime(),
  ]);

  return {
    completions,
    completedGoals: goals.flatMap((goal) =>
      goal.status === 'completed' && goal.completedAt
        ? [{ id: goal.id, completedAt: goal.completedAt }]
        : []
    ),
    switchedAt,
  };
}

export type QuestState = Awaited<ReturnType<typeof getQuestState>>;
